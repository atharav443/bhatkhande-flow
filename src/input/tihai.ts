import { Fraction, ONE } from '../core/fraction.js';
import { splitWords } from '../core/text.js';
import { parseDuration, pick } from './looseValues.js';
import { parseEvent } from './parseEvent.js';
import type { Diagnostic, EventModel, MatraModel, SpanModel } from './types.js';

let tihaiSeq = 0;

/** Restarts the generated ids (tihai1.start, ...) so every document gets the same ones. */
export const resetTihaiIds = () => {
  tihaiSeq = 0;
};

/**
 * A tihai is a phrase played three times (usually with a gap between repeats) so that the LAST note lands on sam.
 * Authors write it as one item inside a line's `matras` array:
 *   { "tihai": { "phrase": "सा रे ग" | [events], "unit": "1/2", "repeat": 3, "gap": "1/2", "gapKind": "rest", "landsOn": "sam", "label": "तिहाई" } }
 * which is expanded here into ordinary matras, plus a `tihai` span (bracket) from the first to the last note.
 * Expansion starts on a matra boundary. The sam-landing check happens in lowering, where taal positions are known.
 */
export function expandTihai(
  spec: any,
  diags: Diagnostic[],
  path: string,
): { matras: MatraModel[]; span: SpanModel } | undefined {
  const phraseRaw: any[] = Array.isArray(spec?.phrase)
    ? spec.phrase
    : typeof spec?.phrase === 'string'
      ? splitWords(spec.phrase)
      : [];
  const unit = parseDuration(spec?.unit, diags, path) ?? ONE;
  const phrase: EventModel[] = [];
  phraseRaw.forEach((e, i) => {
    const ev = parseEvent(e, diags, `${path}.phrase[${i}]`);
    if (ev) phrase.push({ ...ev, id: undefined, duration: ev.duration ?? unit });
  });
  if (!phrase.length) {
    diags.push({ level: 'error', code: 'tihai.empty', message: 'tihai has no phrase', path });
    return undefined;
  }
  const repeat = spec?.repeat === undefined ? 3 : Math.floor(Number(spec.repeat));
  if (!Number.isFinite(repeat) || repeat < 1) {
    diags.push({
      level: 'error',
      code: 'tihai.repeat',
      message: `tihai repeat must be >= 1 (got ${spec?.repeat})`,
      path,
    });
    return undefined;
  }
  const gap = parseDuration(spec?.gap, diags, path);
  const gapType = spec?.gapKind === 'extend' ? 'extend' : 'rest';

  const seq: EventModel[] = [];
  for (let r = 0; r < repeat; r++) {
    if (r > 0 && gap) seq.push({ type: gapType, duration: gap } as EventModel);
    for (const ev of phrase) seq.push({ ...ev });
  }
  const id = `tihai${++tihaiSeq}`;
  const first = seq[0],
    last = seq[seq.length - 1];
  first.id = `${id}.start`;
  last.id = `${id}.end`;

  // chunk the continuous stream into matras; an event stays in the matra where it starts, lowering spills the excess forward
  const matras: MatraModel[] = [];
  let cur: EventModel[] = [];
  let acc = Fraction.of(0);
  for (const ev of seq) {
    cur.push(ev);
    acc = acc.add(ev.duration!);
    if (acc.ge(ONE)) {
      matras.push({ events: cur });
      cur = [];
      acc = acc.sub(ONE);
      while (acc.ge(ONE)) {
        matras.push({ events: [] });
        acc = acc.sub(ONE);
      }
    }
  }
  if (cur.length) {
    matras.push({ events: cur });
    diags.push({
      level: 'warn',
      code: 'tihai.unaligned',
      message: 'tihai does not fill whole matras; the last matra is padded',
      path,
    });
  } else if (!acc.isZero()) {
    diags.push({ level: 'warn', code: 'tihai.unaligned', message: 'tihai ends inside a matra', path });
  }

  const span: SpanModel = {
    type: 'tihai',
    from: first.id,
    to: last.id,
    label: spec?.label === undefined ? undefined : String(spec.label),
    landsOn:
      pick(spec ?? {}, 'landsOn', 'lands-on') === undefined
        ? undefined
        : String(pick(spec, 'landsOn', 'lands-on')),
  };
  return { matras, span };
}
