import { Fraction, ONE, ZERO } from '../core/fraction.js';
import { expectedPos, isVibhagStart, resolveTaal, vibhagIndex, type TaalDef } from '../music/taal.js';
import type { BandishModel, Diagnostic, EventModel, MetadataModel, SwarEvent } from './types.js';

/**
 * LOWERING: authored events -> a grid the layout engine can reason about.
 *
 * VexFlow draws a half note as ONE glyph; time passing is implicit in the spacing.
 * Bhatkhande notation must MATERIALISE time: a note held for 3 beats becomes  सा | ऽ | ऽ  - one glyph per matra.
 * So we convert every matra into an ordered list of Slots whose rational durations sum to exactly 1,
 * spilling held notes into following matras ("carry"), and deriving taal positions/markers from the taal definition.
 */
export type SlotKind = 'swar' | 'extend' | 'rest' | 'blank';

export interface Slot {
  id: string;
  kind: SlotKind;
  onset: Fraction;
  dur: Fraction;
  swar?: SwarEvent;
  lyric?: string;
  /** true when this slot is the carried tail of a longer event rather than its attack */
  carried?: boolean;
  parenOpen?: boolean;
  parenClose?: boolean;
}
export interface LMatra {
  id: string;
  pos: number;
  vibhag: number;
  vibhagStart: boolean;
  marker?: string;
  volta?: string;
  repeatBefore?: boolean;
  repeatAfter?: boolean;
  slots: Slot[];
}
export interface LLine {
  number: number;
  matras: LMatra[];
  repeatStart?: boolean;
  repeatEnd?: boolean;
}
export interface LSection {
  name: string;
  lines: LLine[];
}
export interface LoweredSpan {
  type: 'meend';
  from: string;
  to: string;
}
/** A bracket over a run of slots (currently: tihai). */
export interface LoweredBracket {
  kind: 'tihai';
  from: string;
  to: string;
  label?: string;
}
export interface Lowered {
  meta: MetadataModel;
  taal: TaalDef;
  sections: LSection[];
  spans: LoweredSpan[];
  brackets: LoweredBracket[];
  diagnostics: Diagnostic[];
}

export function lowerBandish(model: BandishModel, inherited: Diagnostic[] = []): Lowered {
  const diagnostics: Diagnostic[] = [...inherited];
  const taal = resolveTaal(model.metadata.taal, diagnostics);
  const alias = new Map<string, string>(); // user event id -> slot id
  const spans: LoweredSpan[] = [];
  const slotById = new Map<string, Slot>();
  const slotWhere = new Map<string, { pos: number; onset: Fraction }>();
  const brackets: LoweredBracket[] = [];
  // meend state lives across sections: a meend may start at the end of one section and finish in the next
  const meendStack: string[] = [];

  const sections: LSection[] = model.sections.map((sec, si) => {
    const startMatra = sec.startMatra ?? 1;
    if (startMatra < 1 || startMatra > taal.total)
      diagnostics.push({
        level: 'error',
        code: 'section.start',
        message: `start-matra ${startMatra} outside 1..${taal.total}`,
        path: `sections[${si}]`,
      });
    let k = 0;
    let carry = ZERO;
    // volta: a new ending label rewinds the cycle position to where the first ending began (endings replace one another)
    let prevVolta: string | undefined;
    let voltaFirstK = 0;

    const lines: LLine[] = sec.lines.map((line, li) => {
      const matras: LMatra[] = line.matras.map((mm, mi) => {
        const path = `sections[${si}].lines[${li}].matras[${mi}]`;
        const mid = `s${si}.l${li}.m${mi}`;
        if (mm.volta && prevVolta && mm.volta !== prevVolta) k = voltaFirstK;
        else if (mm.volta && !prevVolta) voltaFirstK = k;
        prevVolta = mm.volta;
        const exp = expectedPos(taal, Math.min(Math.max(startMatra, 1), taal.total), k++);
        let pos = exp;
        if (mm.index !== undefined) {
          if (mm.index < 1 || mm.index > taal.total)
            diagnostics.push({
              level: 'error',
              code: 'matra.index',
              message: `matra index ${mm.index} outside 1..${taal.total}`,
              path,
            });
          else {
            if (mm.index !== exp)
              diagnostics.push({
                level: 'warn',
                code: 'matra.sequence',
                message: `matra index ${mm.index} but position ${exp} expected from the section start`,
                path,
              });
            pos = mm.index;
          }
        }
        const vStart = isVibhagStart(taal, pos);
        const vib = vibhagIndex(taal, pos);
        const derived = vStart ? taal.markers[vib] : undefined;
        if (mm.marker !== undefined && derived !== undefined && mm.marker !== derived)
          diagnostics.push({
            level: 'warn',
            code: 'marker.mismatch',
            message: `marker "${mm.marker}" at matra ${pos}, but ${taal.id} has "${derived}" there`,
            path,
          });
        if (mm.marker !== undefined && derived === undefined)
          diagnostics.push({
            level: 'warn',
            code: 'marker.offbeat',
            message: `marker "${mm.marker}" at matra ${pos}, which does not start a vibhag in ${taal.id}`,
            path,
          });

        const slots: Slot[] = [];
        let sid = 0;
        const push = (s: Omit<Slot, 'id'>): Slot => {
          const slot = { ...s, id: `${mid}.${sid++}` } as Slot;
          slots.push(slot);
          slotById.set(slot.id, slot);
          slotWhere.set(slot.id, { pos, onset: s.onset });
          return slot;
        };

        // 1. part of this matra still occupied by a note carried from before
        const take = carry.gt(ONE) ? ONE : carry;
        carry = carry.sub(take);
        let t = ZERO;
        if (!take.isZero()) {
          push({ kind: 'extend', onset: t, dur: take, carried: true });
          t = take;
        }
        const room = ONE.sub(take);

        const evs = mm.events;
        if (evs.length === 0) {
          if (!room.isZero()) {
            diagnostics.push({
              level: 'warn',
              code: 'matra.empty',
              message: `matra ${pos} has no events`,
              path,
            });
            push({ kind: 'blank', onset: t, dur: room });
          }
        } else if (room.isZero()) {
          diagnostics.push({
            level: 'error',
            code: 'carry.overlap',
            message: `matra ${pos} is fully covered by a held note but also has events; they were dropped`,
            path,
          });
        } else {
          // 2. resolve durations: unspecified events share what is left equally
          const defined = evs.reduce((a, e) => (e.duration ? a.add(e.duration) : a), ZERO);
          const undef = evs.filter((e) => !e.duration).length;
          let each = ZERO;
          if (undef) {
            const left = room.sub(defined);
            each = left.gt(ZERO) ? left.div(Fraction.of(undef)) : room.div(Fraction.of(evs.length));
            if (!left.gt(ZERO))
              diagnostics.push({
                level: 'error',
                code: 'duration.overfull',
                message: `explicit durations already fill matra ${pos}`,
                path,
              });
          }
          for (let ei = 0; ei < evs.length; ei++) {
            const ev = evs[ei];
            const d = ev.duration ?? each;
            if (t.ge(ONE)) {
              diagnostics.push({
                level: 'error',
                code: 'matra.overflow',
                message: `matra ${pos}: event ${ei} starts after the matra is full; dropped`,
                path,
              });
              continue;
            }
            const fits = t.add(d).le(ONE);
            const part = fits ? d : ONE.sub(t);
            const slot = push(makeSlot(ev, t, part));
            registerEvent(ev, slot);
            if (!fits) {
              carry = carry.add(d.sub(part));
            }
            t = t.add(part);
          }
          if (t.lt(ONE)) {
            diagnostics.push({
              level: 'warn',
              code: 'matra.underfull',
              message: `matra ${pos} is underfull (${t.toString()} of 1 beat); padded`,
              path,
            });
            push({ kind: 'blank', onset: t, dur: ONE.sub(t) });
          }
        }

        function makeSlot(ev: EventModel, onset: Fraction, dur: Fraction): Omit<Slot, 'id'> {
          if (ev.type === 'swar')
            return {
              kind: 'swar',
              onset,
              dur,
              swar: ev,
              lyric: ev.lyric,
              parenOpen: ev.khatka,
              parenClose: ev.khatka,
            };
          return { kind: ev.type === 'rest' ? 'rest' : 'extend', onset, dur, lyric: ev.lyric };
        }
        function registerEvent(ev: EventModel, slot: Slot) {
          if (ev.id) alias.set(ev.id, slot.id);
          if (ev.type !== 'swar') return;
          if (ev.meend === 'end' || ev.meend === 'both') {
            const from = meendStack.pop();
            if (from) spans.push({ type: 'meend', from, to: slot.id });
            else
              diagnostics.push({
                level: 'warn',
                code: 'meend.unopened',
                message: 'meend end without a start',
                path,
              });
          }
          if (ev.meend === 'start' || ev.meend === 'both') meendStack.push(slot.id);
        }
        return {
          id: mid,
          pos,
          vibhag: vib,
          vibhagStart: vStart,
          marker: mm.marker ?? derived,
          volta: mm.volta,
          repeatBefore: mm.repeatBefore,
          repeatAfter: mm.repeatAfter,
          slots,
        };
      });
      // repeat signs can only sit on a vibhag bar (or the row edge)
      matras.forEach((m, mi) => {
        if (m.repeatBefore && mi > 0 && !m.vibhagStart)
          diagnostics.push({
            level: 'warn',
            code: 'repeat.offbar',
            message: `repeat sign before matra ${m.pos} is not on a vibhag bar; ignored`,
            path: `sections[${si}].lines[${li}].matras[${mi}]`,
          });
        if (m.repeatAfter && mi < matras.length - 1 && !matras[mi + 1].vibhagStart)
          diagnostics.push({
            level: 'warn',
            code: 'repeat.offbar',
            message: `repeat sign after matra ${m.pos} is not on a vibhag bar; ignored`,
            path: `sections[${si}].lines[${li}].matras[${mi}]`,
          });
      });
      return { number: line.number, matras, repeatStart: line.repeatStart, repeatEnd: line.repeatEnd };
    });
    if (!carry.isZero())
      diagnostics.push({
        level: 'warn',
        code: 'carry.dangling',
        message: `section "${sec.name}" ends while a held note still sounds (${carry.toString()} beat)`,
        path: `sections[${si}]`,
      });
    return { name: sec.name, lines };
  });

  if (meendStack.length)
    diagnostics.push({
      level: 'warn',
      code: 'meend.unclosed',
      message: `${meendStack.length} meend start(s) never closed`,
      path: 'sections',
    });

  // explicit spans (by user id or slot id)
  const resolve = (id: string) => (slotById.has(id) ? id : alias.get(id));
  for (const sp of model.spans) {
    const from = resolve(sp.from),
      to = resolve(sp.to);
    if (!from || !to) {
      diagnostics.push({
        level: 'warn',
        code: 'span.unresolved',
        message: `span ${sp.type} ${sp.from}->${sp.to}: unknown id`,
      });
      continue;
    }
    if (sp.type === 'meend') spans.push({ type: 'meend', from, to });
    else if (sp.type === 'tihai') {
      brackets.push({ kind: 'tihai', from, to, label: sp.label });
      // a tihai is only a tihai if its last note lands where the author says (sam by default)
      const end = slotWhere.get(to)!;
      const lands = sp.landsOn ?? 'sam';
      if (lands !== 'any') {
        const want = lands === 'sam' ? 1 : Number(lands);
        const ok = Number.isFinite(want) && end.pos === want && end.onset.isZero();
        if (!ok)
          diagnostics.push({
            level: 'warn',
            code: 'tihai.sam',
            message: `tihai ends on matra ${end.pos}${end.onset.isZero() ? '' : ` (+${end.onset.toString()})`}, expected ${lands === 'sam' ? 'sam (matra 1)' : `matra ${lands}`}`,
          });
      }
    } else {
      const a = slotById.get(from)!,
        b = slotById.get(to)!;
      a.parenOpen = true;
      b.parenClose = true;
    }
  }
  return { meta: model.metadata, taal, sections, spans, brackets, diagnostics };
}
