import type { LMatra, LowerContext } from './lowerTypes.js';
import type { SpanModel } from './types.js';

/** Repeat signs can only sit on a vibhag bar (or the row edge). */
export function checkRepeatSigns(matras: LMatra[], ctx: LowerContext, linePath: string) {
  matras.forEach((m, mi) => {
    const path = `${linePath}.matras[${mi}]`;
    if (m.repeatBefore && mi > 0 && !m.vibhagStart)
      ctx.diagnostics.push({
        level: 'warn',
        code: 'repeat.offbar',
        message: `repeat sign before matra ${m.pos} is not on a vibhag bar; ignored`,
        path,
      });
    if (m.repeatAfter && mi < matras.length - 1 && !matras[mi + 1].vibhagStart)
      ctx.diagnostics.push({
        level: 'warn',
        code: 'repeat.offbar',
        message: `repeat sign after matra ${m.pos} is not on a vibhag bar; ignored`,
        path,
      });
  });
}

/** A tihai is only a tihai if its last note lands where the author says (sam by default). */
function checkTihaiLanding(sp: SpanModel, to: string, ctx: LowerContext) {
  const end = ctx.slotWhere.get(to)!;
  const lands = sp.landsOn ?? 'sam';
  if (lands === 'any') return;
  const want = lands === 'sam' ? 1 : Number(lands);
  if (Number.isFinite(want) && end.pos === want && end.onset.isZero()) return;
  ctx.diagnostics.push({
    level: 'warn',
    code: 'tihai.sam',
    message: `tihai ends on matra ${end.pos}${end.onset.isZero() ? '' : ` (+${end.onset.toString()})`}, expected ${lands === 'sam' ? 'sam (matra 1)' : `matra ${lands}`}`,
  });
}

/** Turns the authored spans (which refer to user ids or slot ids) into spans, brackets and parentheses on slots. */
export function resolveSpans(spans: SpanModel[], ctx: LowerContext) {
  const resolve = (id: string) => (ctx.slotById.has(id) ? id : ctx.alias.get(id));
  for (const sp of spans) {
    const from = resolve(sp.from);
    const to = resolve(sp.to);
    if (!from || !to) {
      ctx.diagnostics.push({
        level: 'warn',
        code: 'span.unresolved',
        message: `span ${sp.type} ${sp.from}->${sp.to}: unknown id`,
      });
      continue;
    }
    if (sp.type === 'meend') ctx.spans.push({ type: 'meend', from, to });
    else if (sp.type === 'tihai') {
      ctx.brackets.push({ kind: 'tihai', from, to, label: sp.label });
      checkTihaiLanding(sp, to, ctx);
    } else {
      ctx.slotById.get(from)!.parenOpen = true;
      ctx.slotById.get(to)!.parenClose = true;
    }
  }
}
