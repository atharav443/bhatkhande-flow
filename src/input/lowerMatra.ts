import { expectedPos, isVibhagStart, vibhagIndex } from '../music/taal.js';
import { buildSlots } from './lowerSlots.js';
import type { LMatra, LowerContext, SectionState } from './lowerTypes.js';
import type { MatraModel } from './types.js';

/** The cycle position of this matra: counted from the section start, unless the author numbered it. */
function resolvePosition(mm: MatraModel, state: SectionState, ctx: LowerContext, path: string): number {
  const { taal, diagnostics } = ctx;
  if (mm.volta && state.prevVolta && mm.volta !== state.prevVolta) state.k = state.voltaFirstK;
  else if (mm.volta && !state.prevVolta) state.voltaFirstK = state.k;
  state.prevVolta = mm.volta;
  const expected = expectedPos(taal, state.start, state.k++);
  if (mm.index === undefined) return expected;
  if (mm.index < 1 || mm.index > taal.total) {
    diagnostics.push({
      level: 'error',
      code: 'matra.index',
      message: `matra index ${mm.index} outside 1..${taal.total}`,
      path,
    });
    return expected;
  }
  if (mm.index !== expected) {
    diagnostics.push({
      level: 'warn',
      code: 'matra.sequence',
      message:
        `matra index ${mm.index} but position ${expected} expected after the matra before it; ` +
        `one of the two is numbered wrong (counting continues from ${mm.index})`,
      path,
    });
    // continue counting from the authored index, so one slip is reported once, not on every later matra
    state.k = ((((mm.index - state.start) % taal.total) + taal.total) % taal.total) + 1;
  }
  return mm.index;
}

/** Compares an authored marker with the one the taal puts on this matra. */
function checkMarker(
  mm: MatraModel,
  pos: number,
  derived: string | undefined,
  ctx: LowerContext,
  path: string,
) {
  if (mm.marker === undefined) return;
  const { taal, diagnostics } = ctx;
  if (derived === undefined)
    diagnostics.push({
      level: 'warn',
      code: 'marker.offbeat',
      message: `marker "${mm.marker}" at matra ${pos}, which does not start a vibhag in ${taal.id}`,
      path,
    });
  else if (mm.marker !== derived)
    diagnostics.push({
      level: 'warn',
      code: 'marker.mismatch',
      message: `marker "${mm.marker}" at matra ${pos}, but ${taal.id} has "${derived}" there`,
      path,
    });
}

export function lowerMatra(
  mm: MatraModel,
  at: { si: number; li: number; mi: number },
  state: SectionState,
  ctx: LowerContext,
): LMatra {
  const path = `sections[${at.si}].lines[${at.li}].matras[${at.mi}]`;
  const mid = `s${at.si}.l${at.li}.m${at.mi}`;
  const pos = resolvePosition(mm, state, ctx, path);
  const vibhagStart = isVibhagStart(ctx.taal, pos);
  const vibhag = vibhagIndex(ctx.taal, pos);
  const derived = vibhagStart ? ctx.taal.markers[vibhag] : undefined;
  checkMarker(mm, pos, derived, ctx, path);
  return {
    id: mid,
    pos,
    vibhag,
    vibhagStart,
    marker: mm.marker ?? derived,
    volta: mm.volta,
    repeatBefore: mm.repeatBefore,
    repeatAfter: mm.repeatAfter,
    slots: buildSlots(mm, pos, mid, state, ctx, path),
  };
}
