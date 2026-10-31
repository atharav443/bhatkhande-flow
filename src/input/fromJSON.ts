import { Fraction, ONE } from '../core/fraction.js';
import { canBeKomal, canBeTivra, parseOctave, parseSwarText } from '../music/swar.js';
import type {
  BandishModel,
  Diagnostic,
  EventModel,
  KanNote,
  LineModel,
  MatraModel,
  SectionModel,
  SpanModel,
  SwarEvent,
  TaalSpec,
} from './types.js';

/**
 * Normalises LOOSE input (our JSON, swartaal-style JSON, or the object produced by fromXML)
 * into the strict canonical BandishModel. Everything user-facing and forgiving lives here so that
 * the layout engine only ever sees clean data.
 */
const truthy = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1';
const pick = (o: any, ...keys: string[]) => {
  for (const k of keys) if (o && o[k] !== undefined) return o[k];
  return undefined;
};

/** kan-inside-kan is supported one level deep: swar -> kan -> kan. Anything deeper is dropped with a warning. */
export const MAX_KAN_DEPTH = 2;

function parseKan(raw: unknown, diags: Diagnostic[], path: string, depth = 1): KanNote[] {
  if (raw === undefined || raw === null || raw === '') return [];
  if (depth > MAX_KAN_DEPTH) {
    diags.push({
      level: 'warn',
      code: 'kan.depth',
      message: `kan nested deeper than ${MAX_KAN_DEPTH} levels; ignored`,
      path,
    });
    return [];
  }
  const arr = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/[\s,]+/).filter(Boolean)
      : [raw];
  const out: KanNote[] = [];
  for (const k of arr) {
    const o: any = typeof k === 'string' ? { text: k } : k;
    const p = parseSwarText(String(pick(o, 'swar', 'text', 'degree') ?? ''));
    if (!p) {
      diags.push({
        level: 'warn',
        code: 'kan.unknown',
        message: `Unknown kan swar ${JSON.stringify(k)}`,
        path,
      });
      continue;
    }
    const nested =
      typeof o === 'object' && o.kan !== undefined ? parseKan(o.kan, diags, path, depth + 1) : [];
    out.push({
      degree: p.degree,
      octave: parseOctave(o.octave) ?? p.octaveHint ?? 0,
      komal: (truthy(o.komal) || !!p.komal) && canBeKomal(p.degree),
      tivra: (truthy(o.tivra) || !!p.tivra) && canBeTivra(p.degree),
      ...(nested.length ? { kan: nested } : {}),
    });
  }
  return out;
}

function parseDuration(v: unknown, diags: Diagnostic[], path: string): Fraction | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  try {
    const f = Fraction.parse(v as any);
    if (f.le(Fraction.of(0))) throw new RangeError('duration must be > 0');
    return f;
  } catch (e) {
    diags.push({ level: 'error', code: 'duration.invalid', message: String((e as Error).message), path });
    return undefined;
  }
}

function parseEvent(raw: any, diags: Diagnostic[], path: string): EventModel | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === 'string') {
    const s = raw.trim();
    // Bhatkhande: a dash in the swar line means the previous swar is held through this (part of a) matra
    if (s === '-' || s === '–' || s === '—' || s === 'ऽ' || s === '_' || s === '~') return { type: 'extend' };
    if (s === 'rest' || s === '0' || s === ',') return { type: 'rest' };
    raw = { swar: s };
  }
  const type = raw.type ?? (pick(raw, 'swar', 'text', 'degree', 'name') !== undefined ? 'swar' : undefined);
  const duration = parseDuration(raw.duration, diags, path);
  const lyric =
    raw.lyric === undefined || raw.lyric === null
      ? undefined
      : String(typeof raw.lyric === 'object' ? (raw.lyric.text ?? '') : raw.lyric);
  const id = raw.id !== undefined ? String(raw.id) : undefined;
  if (type === 'rest') return { type: 'rest', id, duration, lyric };
  if (type === 'extend') return { type: 'extend', id, duration, lyric };
  if (type !== 'swar') {
    diags.push({ level: 'error', code: 'event.type', message: `Unknown event ${JSON.stringify(raw)}`, path });
    return undefined;
  }

  const text = String(pick(raw, 'swar', 'text', 'degree', 'name') ?? '');
  const p = parseSwarText(text);
  if (!p) {
    diags.push({
      level: 'error',
      code: 'swar.unknown',
      message: `Unrecognised swar "${text}" - rendered as a rest`,
      path,
    });
    return { type: 'rest', id, duration, lyric };
  }
  let komal = truthy(raw.komal) || !!p.komal;
  let tivra = truthy(raw.tivra) || !!p.tivra;
  if (komal && !canBeKomal(p.degree)) {
    diags.push({
      level: 'warn',
      code: 'swar.komal',
      message: `${p.degree} cannot be komal; flag ignored`,
      path,
    });
    komal = false;
  }
  if (tivra && !canBeTivra(p.degree)) {
    diags.push({
      level: 'warn',
      code: 'swar.tivra',
      message: `${p.degree} cannot be tivra; flag ignored`,
      path,
    });
    tivra = false;
  }
  const meend =
    raw.meend === 'start' || raw.meend === 'end' || raw.meend === 'both'
      ? raw.meend
      : raw['meend-start'] && raw['meend-end']
        ? 'both'
        : truthy(raw['meend-start'])
          ? 'start'
          : truthy(raw['meend-end'])
            ? 'end'
            : undefined;
  const ev: SwarEvent = {
    type: 'swar',
    id,
    degree: p.degree,
    octave: parseOctave(raw.octave) ?? p.octaveHint ?? 0,
    komal,
    tivra,
    duration,
    lyric,
    kan: parseKan(raw.kan, diags, path),
    meend,
    khatka: truthy(raw.khatka) || truthy(raw.murki) || undefined,
  };
  return ev;
}

function parseMatra(raw: any, diags: Diagnostic[], path: string): MatraModel {
  let rawEvents: any[] = [];
  if (Array.isArray(raw.events)) rawEvents = raw.events;
  else if (Array.isArray(raw.pairs))
    rawEvents = raw.pairs.map((p: any) => ({
      ...(typeof p.swar === 'object' ? p.swar : { swar: p.swar }),
      lyric: p.lyric,
    }));
  else if (Array.isArray(raw.swars)) rawEvents = raw.swars;
  else if (raw.swar !== undefined) rawEvents = [raw];
  const events: EventModel[] = [];
  rawEvents.forEach((e, i) => {
    const ev = parseEvent(e, diags, `${path}.events[${i}]`);
    if (ev) events.push(ev);
  });
  const idx = pick(raw, 'index', 'number');
  const index = idx === undefined || idx === '' ? undefined : Number(idx);
  const marker = pick(raw, 'marker', 'taalMarker', 'taal-marker', 'tala-marker', 'taalmarker');
  const vraw = pick(raw, 'volta', 'ending', 'alt');
  let volta: string | undefined =
    vraw === undefined || vraw === null || vraw === '' || vraw === false ? undefined : String(vraw).trim();
  if (volta && /^\d+$/.test(volta)) volta += '.';
  return {
    index: index !== undefined && Number.isFinite(index) ? index : undefined,
    marker: marker === undefined ? undefined : String(marker),
    events,
    volta,
    repeatBefore: truthy(pick(raw, 'repeatBefore', 'repeat-before')) || undefined,
    repeatAfter: truthy(pick(raw, 'repeatAfter', 'repeat-after')) || undefined,
  };
}

/* ------------------------------------------------------------------ tihai */
/**
 * A tihai is a phrase played three times (usually with a gap between repeats) so that the LAST note lands on sam.
 * Authors write it as one item inside a line's `matras` array:
 *   { "tihai": { "phrase": "सा रे ग" | [events], "unit": "1/2", "repeat": 3, "gap": "1/2", "gapKind": "rest", "landsOn": "sam", "label": "तिहाई" } }
 * which is expanded here into ordinary matras, plus a `tihai` span (bracket) from the first to the last note.
 * Expansion starts on a matra boundary. The sam-landing check happens in lowering, where taal positions are known.
 */
let tihaiSeq = 0;
export function expandTihai(
  spec: any,
  diags: Diagnostic[],
  path: string,
): { matras: MatraModel[]; span: SpanModel } | undefined {
  const phraseRaw: any[] = Array.isArray(spec?.phrase)
    ? spec.phrase
    : typeof spec?.phrase === 'string'
      ? spec.phrase.split(/\s+/).filter(Boolean)
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

function parseLine(
  raw: any,
  li: number,
  diags: Diagnostic[],
  path: string,
  extraSpans: SpanModel[],
): LineModel {
  let matrasRaw: any[] = [];
  if (Array.isArray(raw.matras)) matrasRaw = raw.matras;
  else if (Array.isArray(raw.khands))
    matrasRaw = raw.khands.flatMap((k: any) => (Array.isArray(k.matras) ? k.matras : []));
  const matras: MatraModel[] = matrasRaw.flatMap((m, mi) => {
    if (m && typeof m === 'object' && m.tihai !== undefined) {
      const t = expandTihai(m.tihai, diags, `${path}.matras[${mi}].tihai`);
      if (!t) return [];
      extraSpans.push(t.span);
      return t.matras;
    }
    return [parseMatra(m, diags, `${path}.matras[${mi}]`)];
  });
  const num = Number(pick(raw, 'number', 'index'));
  return {
    number: Number.isFinite(num) ? num : li + 1,
    matras,
    repeatStart: truthy(pick(raw, 'repeatStart', 'repeat-start')) || undefined,
    repeatEnd: truthy(pick(raw, 'repeatEnd', 'repeat-end')) || undefined,
  };
}

function parseTaal(raw: any): TaalSpec {
  if (typeof raw === 'string') return { name: raw };
  if (!raw) return {};
  const tm = pick(raw, 'totalMatras', 'total-matras', 'matras');
  const kh = pick(raw, 'khands', 'vibhagCount');
  return {
    name: raw.name,
    vibhags: Array.isArray(raw.vibhags) ? raw.vibhags.map(Number) : undefined,
    markers: Array.isArray(raw.markers) ? raw.markers.map(String) : undefined,
    totalMatras: tm === undefined ? undefined : Number(tm),
    khands: kh === undefined ? undefined : Number(kh),
  };
}

export function normalizeBandish(raw: any): { model: BandishModel; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const md = pick(raw, 'metadata', 'meta') ?? {};
  tihaiSeq = 0; // deterministic generated ids (tihai1.start, tihai1.end, ...) per document
  const tihaiSpans: SpanModel[] = [];
  const sections: SectionModel[] = (Array.isArray(raw?.sections) ? raw.sections : []).map(
    (s: any, si: number): SectionModel => {
      const sm = pick(s, 'startMatra', 'start-matra', 'start_matra');
      return {
        name: String(s.name ?? ''),
        startMatra: sm === undefined ? undefined : Number(sm),
        lines: (Array.isArray(s.lines) ? s.lines : []).map((l: any, li: number) =>
          parseLine(l, li, diagnostics, `sections[${si}].lines[${li}]`, tihaiSpans),
        ),
      };
    },
  );
  const spans: SpanModel[] = (Array.isArray(raw?.spans) ? raw.spans : [])
    .filter(
      (s: any) =>
        s &&
        s.from &&
        s.to &&
        (s.type === 'meend' || s.type === 'khatka' || s.type === 'murki' || s.type === 'tihai'),
    )
    .map((s: any): SpanModel => ({
      type: s.type === 'murki' ? 'khatka' : s.type,
      from: String(s.from),
      to: String(s.to),
      ...(s.label !== undefined ? { label: String(s.label) } : {}),
      ...(pick(s, 'landsOn', 'lands-on') !== undefined
        ? { landsOn: String(pick(s, 'landsOn', 'lands-on')) }
        : {}),
    }));
  spans.push(...tihaiSpans);
  if (!sections.length)
    diagnostics.push({ level: 'error', code: 'model.empty', message: 'Bandish has no sections' });
  return {
    model: {
      version: raw?.version,
      sections,
      spans,
      metadata: {
        title: md.title,
        raag: pick(md, 'raag', 'raga'),
        taal: parseTaal(pick(md, 'taal', 'tala')),
        laya: md.laya,
        thaat: md.thaat,
        composer: pick(md, 'composer', 'bandishkar'),
        label: pick(md, 'label', 'geet'),
        text: Array.isArray(md.text)
          ? md.text.map(String)
          : typeof md.text === 'string'
            ? md.text.split(/\n/).filter(Boolean)
            : undefined,
        tempo: md.tempo !== undefined ? Number(md.tempo) : undefined,
      },
    },
    diagnostics,
  };
}
