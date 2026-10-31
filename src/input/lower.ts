import { ZERO } from '../core/fraction.js';
import { resolveTaal } from '../music/taal.js';
import { lowerMatra } from './lowerMatra.js';
import { checkRepeatSigns, resolveSpans } from './lowerSpans.js';
import type { LLine, LowerContext, Lowered, LSection, SectionState } from './lowerTypes.js';
import type { BandishModel, Diagnostic, LineModel, SectionModel } from './types.js';

export type {
  LLine,
  LMatra,
  Lowered,
  LoweredBracket,
  LoweredSpan,
  LSection,
  Slot,
  SlotKind,
} from './lowerTypes.js';

function lowerLine(
  line: LineModel,
  at: { si: number; li: number },
  state: SectionState,
  ctx: LowerContext,
): LLine {
  const matras = line.matras.map((mm, mi) => lowerMatra(mm, { ...at, mi }, state, ctx));
  checkRepeatSigns(matras, ctx, `sections[${at.si}].lines[${at.li}]`);
  return { number: line.number, matras, repeatStart: line.repeatStart, repeatEnd: line.repeatEnd };
}

function lowerSection(sec: SectionModel, si: number, ctx: LowerContext): LSection {
  const { taal, diagnostics } = ctx;
  const startMatra = sec.startMatra ?? 1;
  if (startMatra < 1 || startMatra > taal.total)
    diagnostics.push({
      level: 'error',
      code: 'section.start',
      message: `start-matra ${startMatra} outside 1..${taal.total}`,
      path: `sections[${si}]`,
    });
  const state: SectionState = {
    start: Math.min(Math.max(startMatra, 1), taal.total),
    k: 0,
    carry: ZERO,
    voltaFirstK: 0,
  };
  const lines = sec.lines.map((line, li) => lowerLine(line, { si, li }, state, ctx));
  if (!state.carry.isZero())
    diagnostics.push({
      level: 'warn',
      code: 'carry.dangling',
      message: `section "${sec.name}" ends while a held note still sounds (${state.carry.toString()} beat)`,
      path: `sections[${si}]`,
    });
  return { name: sec.name, lines };
}

export function lowerBandish(model: BandishModel, inherited: Diagnostic[] = []): Lowered {
  const diagnostics: Diagnostic[] = [...inherited];
  const ctx: LowerContext = {
    taal: resolveTaal(model.metadata.taal, diagnostics),
    diagnostics,
    alias: new Map(),
    spans: [],
    brackets: [],
    slotById: new Map(),
    slotWhere: new Map(),
    meendStack: [],
  };
  const sections = model.sections.map((sec, si) => lowerSection(sec, si, ctx));
  if (ctx.meendStack.length)
    diagnostics.push({
      level: 'warn',
      code: 'meend.unclosed',
      message: `${ctx.meendStack.length} meend start(s) never closed`,
      path: 'sections',
    });
  resolveSpans(model.spans, ctx);
  return {
    meta: model.metadata,
    taal: ctx.taal,
    sections,
    spans: ctx.spans,
    brackets: ctx.brackets,
    diagnostics,
  };
}
