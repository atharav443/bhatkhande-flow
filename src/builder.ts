import { Fraction } from './core/fraction';
import { Tables } from './core/tables';
import type { Diagnostic, KanNote as KanModel } from './input/types';
import type { Lowered, LMatra, Slot } from './input/lower';
import { KanGroup } from './modifiers/kangroup';
import { KhatkaBracket } from './modifiers/khatkabracket';
import { KomalMark } from './modifiers/komalmark';
import { ModifierPosition } from './modifiers/modifier';
import { OctaveDot } from './modifiers/octavedot';
import { TivraMark } from './modifiers/tivramark';
import { GhostNote } from './notes/ghostnote';
import { LyricNote, LyricRest } from './notes/lyricnote';
import type { Note } from './notes/note';
import { KanNote, SwarNote, SwarRest } from './notes/swarnote';
import { Voice, VoiceMode } from './notes/voice';
import { GroupingCurve } from './spanners/groupingcurve';
import { Meend } from './spanners/meend';
import { TihaiBracket } from './spanners/tihai';
import { Page, type PageSection } from './stave/page';
import { TaalStave, type StaveMatra } from './stave/taalstave';

export interface BuildOptions {
  /** write ऽ under every swar slot that has no syllable, when the section has lyrics (book convention) */
  autoAvagraha?: boolean;
  /** draw grouping curves under grouped syllables too */
  lyricCurves?: boolean;
}

/**
 * Lowered bandish -> notation elements (the role of VexFlow's EasyScore Builder).
 * Rows are taal cycles: a lowered line is cut wherever it wraps past the end of the page grid.
 */
export function buildPage(low: Lowered, opts: BuildOptions = {}): { page: Page; diagnostics: Diagnostic[] } {
  const autoAva = opts.autoAvagraha ?? true,
    lyricCurves = opts.lyricCurves ?? true;
  const diags = low.diagnostics;
  const taal = low.taal;
  const noteBySlot = new Map<string, Note>();
  const staveOfNote = new Map<Note, TaalStave>();
  const pageStaves: TaalStave[] = [];
  const curves: GroupingCurve[] = [];

  let pageGridStart: number | undefined; // grid of the earlier sections: a later section without a full-length line follows it
  const sections: PageSection[] = low.sections.map((sec) => {
    const allMatras = sec.lines.flatMap((l) => l.matras);
    const hasLyrics = allMatras.some((m) => m.slots.some((s) => s.lyric));
    // grid start: where the section's full-length lines begin (sam for most bandishes, khali for some swarmalikas)
    const full = sec.lines.find((l) => l.matras.length >= taal.total);
    // a section with only short lines (e.g. an antara of one half cycle) keeps the grid of the section before it, so its row sits under its own cycle positions
    const gridStart = full ? full.matras[0].pos : (pageGridStart ?? sec.lines[0]?.matras[0]?.pos ?? 1);
    pageGridStart ??= gridStart;
    const colOf = (pos: number) => (((pos - gridStart) % taal.total) + taal.total) % taal.total;

    // volta + repeat information per matra (VexFlow keeps these on the stave as modifiers)
    const extra = new Map<LMatra, Partial<StaveMatra>>();
    for (const line of sec.lines) {
      const labels = [...new Set(line.matras.map((m) => m.volta).filter(Boolean))] as string[];
      const open = labels.length > 1 ? labels[labels.length - 1] : undefined; // the last of several endings stays open
      line.matras.forEach((m, i) => {
        const p = line.matras[i - 1],
          n = line.matras[i + 1];
        extra.set(m, {
          volta: m.volta,
          voltaStart: !!m.volta && p?.volta !== m.volta,
          voltaEnd: !!m.volta && n?.volta !== m.volta,
          voltaClosed: !!m.volta && m.volta !== open,
          repeatBefore: m.repeatBefore || (i === 0 && line.repeatStart) || undefined,
          repeatAfter: m.repeatAfter || (i === line.matras.length - 1 && line.repeatEnd) || undefined,
        });
      });
    }
    // rows: split every line where the column index stops increasing (crossed the right edge of the grid)
    const rows: LMatra[][] = [];
    for (const line of sec.lines) {
      let row: LMatra[] = [];
      for (const m of line.matras) {
        if (row.length && colOf(m.pos) <= colOf(row[row.length - 1].pos)) {
          rows.push(row);
          row = [];
        }
        row.push(m);
      }
      if (row.length) rows.push(row);
    }

    const staves = rows.map((ms) => {
      const stave = new TaalStave(
        ms.map((m) => ({
          pos: m.pos,
          marker: m.vibhagStart ? m.marker : undefined,
          col: colOf(m.pos),
          id: m.id,
          ...extra.get(m),
        })),
        hasLyrics,
      );
      const total = Fraction.of(ms.length);
      const full = ms.length === taal.total ? VoiceMode.STRICT : VoiceMode.SOFT;
      const swarV = new Voice(total, full),
        lyrV = new Voice(total, full);
      ms.forEach((m) => {
        const swarNotes: Note[] = [],
          lyrNotes: Note[] = [];
        m.slots.forEach((s, k) => {
          const n = makeSwarTickable(s, m, k, diags);
          swarV.addTickable(n);
          noteBySlot.set(s.id, n);
          if (!(n instanceof GhostNote)) swarNotes.push(n);
          if (hasLyrics) {
            const l = makeLyricTickable(s, n, autoAva);
            lyrV.addTickable(l);
            if (!(l instanceof GhostNote)) lyrNotes.push(l);
          }
        });
        if (swarNotes.length >= 2) {
          curves.push(new GroupingCurve(swarNotes, 'swar'));
          stave.hasSwarCurves = true;
        }
        if (lyricCurves && lyrNotes.length >= 2) {
          curves.push(new GroupingCurve(lyrNotes, 'lyric'));
          stave.hasLyricCurves = true;
        }
      });
      stave.addVoice(swarV);
      if (hasLyrics) stave.addVoice(lyrV);
      for (const t of swarV.getTickables()) staveOfNote.set(t as Note, stave);
      pageStaves.push(stave);
      return stave;
    });
    return { heading: sec.name || undefined, gridStart, staves };
  });

  const m = low.meta;
  const page = new Page(
    taal,
    {
      title: m.title ?? (m.raag ? `राग ${m.raag}` : undefined),
      subtitle: `ताल-${taal.displayName}`,
      label: m.label,
      text: m.text,
    },
    sections,
  );
  curves.forEach((c) => page.addSpanner(c));

  const between = (a: TaalStave, b: TaalStave) => {
    const i = pageStaves.indexOf(a),
      j = pageStaves.indexOf(b);
    return pageStaves.slice(Math.min(i, j), Math.max(i, j) + 1);
  };
  for (const sp of low.spans) {
    const a = noteBySlot.get(sp.from),
      b = noteBySlot.get(sp.to);
    if (!a || !b) continue;
    page.addSpanner(new Meend(a, b, between(staveOfNote.get(a)!, staveOfNote.get(b)!)));
  }
  for (const br of low.brackets) {
    const a = noteBySlot.get(br.from),
      b = noteBySlot.get(br.to);
    if (!a || !b) continue;
    page.addSpanner(new TihaiBracket(a, b, between(staveOfNote.get(a)!, staveOfNote.get(b)!), br.label));
  }
  return { page, diagnostics: diags };
}

function makeSwarTickable(s: Slot, m: LMatra, k: number, diags: Diagnostic[]): Note {
  let n: Note;
  if (s.kind === 'swar') {
    const ev = s.swar!;
    const sw = new SwarNote({
      degree: ev.degree,
      octave: ev.octave,
      komal: ev.komal,
      tivra: ev.tivra,
      ticks: s.dur,
    });
    decorate(sw, ev);
    if (s.parenOpen) sw.addModifier(new KhatkaBracket(ModifierPosition.LEFT));
    if (s.parenClose) sw.addModifier(new KhatkaBracket(ModifierPosition.RIGHT));
    if (ev.kan.length)
      sw.addModifier(new KanGroup(ev.kan.map((kn) => makeKan(kn, Tables.style.fontSize.kanScale))));
    n = sw;
  } else if (s.kind === 'extend') {
    n = new SwarRest(s.dur);
  } else {
    if (s.kind === 'rest')
      diags.push({
        level: 'info',
        code: 'rest.blank',
        message: `silence at matra ${m.pos} is printed as an empty slot (Bhatkhande has no rest sign)`,
      });
    n = new GhostNote(s.dur, 'swar');
  }
  n.setData('matra_number', m.pos)
    .setData('matra_fraction', s.dur.toString())
    .setData('sequence_in_matra', k + 1)
    .setData('slot', s.id);
  return n;
}

function decorate(n: SwarNote, ev: { komal: boolean; tivra: boolean; octave: number }): void {
  if (ev.komal) n.addModifier(new KomalMark());
  if (ev.tivra) n.addModifier(new TivraMark());
  for (let i = 0; i < Math.abs(ev.octave); i++)
    n.addModifier(new OctaveDot(ev.octave > 0 ? ModifierPosition.ABOVE : ModifierPosition.BELOW));
}

function makeKan(k: KanModel, scale: number): KanNote {
  const n = new KanNote({ degree: k.degree, octave: k.octave, komal: k.komal, tivra: k.tivra, small: scale });
  decorate(n, k);
  if (k.kan?.length)
    n.addModifier(new KanGroup(k.kan.map((c) => makeKan(c, scale * Tables.style.decor.kanNestScale))));
  return n;
}

function makeLyricTickable(s: Slot, swar: Note, autoAva: boolean): Note {
  const t = s.lyric?.trim();
  let l: Note;
  if (t === 'ऽ' || t === 'S' || t === '-' || t === '–')
    l = new LyricRest(s.dur, t === '-' || t === '–' ? '–' : 'ऽ');
  else if (t) l = new LyricNote(t, s.dur);
  else if (autoAva && !(swar instanceof GhostNote)) l = new LyricRest(s.dur);
  else l = new GhostNote(s.dur, 'lyric');
  l.setData('matra_number', swar.getData().matra_number).setData('applies_to_slot', s.id);
  return l;
}
