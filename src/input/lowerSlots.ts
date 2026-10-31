import { Fraction, ONE, ZERO } from '../core/fraction.js';
import type { LowerContext, SectionState, Slot } from './lowerTypes.js';
import type { EventModel, MatraModel } from './types.js';

type PushSlot = (s: Omit<Slot, 'id'>) => Slot;

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

/** Remembers the event's user id, and pairs up meend start/end marks. */
function registerEvent(ev: EventModel, slot: Slot, ctx: LowerContext, path: string) {
  if (ev.id) ctx.alias.set(ev.id, slot.id);
  if (ev.type !== 'swar') return;
  if (ev.meend === 'end' || ev.meend === 'both') {
    const from = ctx.meendStack.pop();
    if (from) ctx.spans.push({ type: 'meend', from, to: slot.id });
    else
      ctx.diagnostics.push({
        level: 'warn',
        code: 'meend.unopened',
        message: 'meend end without a start',
        path,
      });
  }
  if (ev.meend === 'start' || ev.meend === 'both') ctx.meendStack.push(slot.id);
}

/** Events without a duration share what is left of the matra equally. */
function sharedDuration(
  evs: EventModel[],
  room: Fraction,
  pos: number,
  ctx: LowerContext,
  path: string,
): Fraction {
  const undef = evs.filter((e) => !e.duration).length;
  if (!undef) return ZERO;
  const defined = evs.reduce((a, e) => (e.duration ? a.add(e.duration) : a), ZERO);
  const left = room.sub(defined);
  if (left.gt(ZERO)) return left.div(Fraction.of(undef));
  ctx.diagnostics.push({
    level: 'error',
    code: 'duration.overfull',
    message: `explicit durations already fill matra ${pos}`,
    path,
  });
  return room.div(Fraction.of(evs.length));
}

/** Puts the matra's events into slots; whatever does not fit is carried into the next matra. */
function placeEvents(
  evs: EventModel[],
  room: Fraction,
  start: Fraction,
  pos: number,
  state: SectionState,
  ctx: LowerContext,
  push: PushSlot,
  path: string,
) {
  const each = sharedDuration(evs, room, pos, ctx, path);
  let t = start;
  evs.forEach((ev, ei) => {
    const d = ev.duration ?? each;
    if (t.ge(ONE)) {
      ctx.diagnostics.push({
        level: 'error',
        code: 'matra.overflow',
        message: `matra ${pos}: event ${ei} starts after the matra is full; dropped`,
        path,
      });
      return;
    }
    const fits = t.add(d).le(ONE);
    const part = fits ? d : ONE.sub(t);
    registerEvent(ev, push(makeSlot(ev, t, part)), ctx, path);
    if (!fits) state.carry = state.carry.add(d.sub(part));
    t = t.add(part);
  });
  if (t.lt(ONE)) {
    ctx.diagnostics.push({
      level: 'warn',
      code: 'matra.underfull',
      message: `matra ${pos} is underfull (${t.toString()} of 1 beat); padded`,
      path,
    });
    push({ kind: 'blank', onset: t, dur: ONE.sub(t) });
  }
}

/** Splits one matra into slots whose durations add up to exactly 1. */
export function buildSlots(
  mm: MatraModel,
  pos: number,
  mid: string,
  state: SectionState,
  ctx: LowerContext,
  path: string,
) {
  const slots: Slot[] = [];
  const push: PushSlot = (s) => {
    const slot = { ...s, id: `${mid}.${slots.length}` } as Slot;
    slots.push(slot);
    ctx.slotById.set(slot.id, slot);
    ctx.slotWhere.set(slot.id, { pos, onset: s.onset });
    return slot;
  };

  // 1. part of this matra still occupied by a note carried from before
  const take = state.carry.gt(ONE) ? ONE : state.carry;
  state.carry = state.carry.sub(take);
  if (!take.isZero()) push({ kind: 'extend', onset: ZERO, dur: take, carried: true });
  const room = ONE.sub(take);

  // 2. the matra's own events
  if (mm.events.length === 0) {
    if (!room.isZero()) {
      ctx.diagnostics.push({
        level: 'warn',
        code: 'matra.empty',
        message: `matra ${pos} has no events`,
        path,
      });
      push({ kind: 'blank', onset: take, dur: room });
    }
  } else if (room.isZero()) {
    ctx.diagnostics.push({
      level: 'error',
      code: 'carry.overlap',
      message: `matra ${pos} is fully covered by a held note but also has events; they were dropped`,
      path,
    });
  } else placeEvents(mm.events, room, take, pos, state, ctx, push, path);
  return slots;
}
