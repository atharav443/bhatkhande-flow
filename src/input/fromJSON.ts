/**
 * Normalises LOOSE input (our JSON, swartaal-style JSON, or the object produced by fromXML)
 * into the strict canonical BandishModel. Everything user-facing and forgiving lives here so that
 * the layout engine only ever sees clean data.
 */

import { isWholeNumber, splitLines } from '../core/text.js';
import { pick, truthy } from './looseValues.js';
import { parseEvent } from './parseEvent.js';
import { expandTihai, resetTihaiIds } from './tihai.js';
import type {
  BandishModel,
  Diagnostic,
  EventModel,
  LineModel,
  MatraModel,
  SectionModel,
  SpanModel,
  TaalSpec,
} from './types.js';

export { MAX_KAN_DEPTH } from './parseEvent.js';
export { expandTihai } from './tihai.js';

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
  if (volta && isWholeNumber(volta)) volta += '.';
  return {
    index: index !== undefined && Number.isFinite(index) ? index : undefined,
    marker: marker === undefined ? undefined : String(marker),
    events,
    volta,
    repeatBefore: truthy(pick(raw, 'repeatBefore', 'repeat-before')) || undefined,
    repeatAfter: truthy(pick(raw, 'repeatAfter', 'repeat-after')) || undefined,
  };
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
  resetTihaiIds(); // deterministic generated ids (tihai1.start, tihai1.end, ...) per document
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
            ? splitLines(md.text)
            : undefined,
        tempo: md.tempo !== undefined ? Number(md.tempo) : undefined,
      },
    },
    diagnostics,
  };
}
