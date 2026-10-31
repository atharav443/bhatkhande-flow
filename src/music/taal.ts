import type { Diagnostic, TaalSpec } from '../input/types.js';

/**
 * The taal is the layout model of Bhatkhande notation - what the time signature + barlines are in VexFlow.
 * It decides: where vibhag bars go, which matra carries X/2/0/3, and where long lines may wrap.
 * Markers are DERIVED from here; authored markers are only validated against it.
 */
export interface TaalDef {
  id: string;
  displayName: string;
  vibhags: number[];
  markers: string[];
  total: number;
  /** 1-based cycle positions at which each vibhag starts. */
  starts: number[];
}

interface Row {
  names: string[];
  display: string;
  vibhags: number[];
  markers: string[];
}
const TABLE: Record<string, Row> = {
  teentaal: {
    names: ['teentaal', 'tintal', 'teental', 'tritaal', 'तीनताल', 'तिनताल'],
    display: 'तीनताल',
    vibhags: [4, 4, 4, 4],
    markers: ['X', '2', '0', '3'],
  },
  jhaptaal: {
    names: ['jhaptaal', 'jhaptal', 'jhap', 'झपताल'],
    display: 'झपताल',
    vibhags: [2, 3, 2, 3],
    markers: ['X', '2', '0', '3'],
  },
  ektaal: {
    names: ['ektaal', 'ektal', 'एकताल'],
    display: 'एकताल',
    vibhags: [2, 2, 2, 2, 2, 2],
    markers: ['X', '0', '2', '0', '3', '4'],
  },
  chautaal: {
    names: ['chautaal', 'chautal', 'चौताल'],
    display: 'चौताल',
    vibhags: [2, 2, 2, 2, 2, 2],
    markers: ['X', '0', '2', '0', '3', '4'],
  },
  rupak: {
    names: ['rupak', 'roopak', 'rupaktaal', 'रूपक'],
    display: 'रूपक',
    vibhags: [3, 2, 2],
    markers: ['0', '2', '3'],
  },
  dadra: { names: ['dadra', 'दादरा'], display: 'दादरा', vibhags: [3, 3], markers: ['X', '0'] },
  keherwa: {
    names: ['keherwa', 'kaharwa', 'kehrwa', 'कहरवा', 'केहरवा'],
    display: 'कहरवा',
    vibhags: [4, 4],
    markers: ['X', '0'],
  },
  dhamar: {
    names: ['dhamar', 'dhamaar', 'धमार'],
    display: 'धमार',
    vibhags: [5, 2, 3, 4],
    markers: ['X', '2', '0', '3'],
  },
  jhoomra: {
    names: ['jhoomra', 'jhumra', 'झूमरा'],
    display: 'झूमरा',
    vibhags: [3, 4, 3, 4],
    markers: ['X', '2', '0', '3'],
  },
  deepchandi: {
    names: ['deepchandi', 'dipchandi', 'दीपचंदी'],
    display: 'दीपचंदी',
    vibhags: [3, 4, 3, 4],
    markers: ['X', '2', '0', '3'],
  },
  tilwada: {
    names: ['tilwada', 'tilvada', 'तिलवाड़ा'],
    display: 'तिलवाड़ा',
    vibhags: [4, 4, 4, 4],
    markers: ['X', '2', '0', '3'],
  },
};

/** Lowercases and drops spaces, underscores and hyphens, so "Tin-Taal" and "tintaal" compare equal. */
const norm = (s: string) =>
  [...s.toLowerCase()].filter((c) => c.trim() !== '' && c !== '_' && c !== '-').join('');

function build(id: string, display: string, vibhags: number[], markers: string[]): TaalDef {
  const starts: number[] = [];
  let p = 1;
  for (const v of vibhags) {
    starts.push(p);
    p += v;
  }
  return { id, displayName: display, vibhags, markers, total: p - 1, starts };
}

export function resolveTaal(spec: TaalSpec | undefined, diags: Diagnostic[]): TaalDef {
  const s = spec ?? {};
  const key = s.name ? norm(s.name) : '';
  const hit = Object.entries(TABLE).find(([, r]) => r.names.some((n) => norm(n) === key));

  if (s.vibhags && s.vibhags.length) {
    // fully custom taal
    const markers =
      s.markers && s.markers.length === s.vibhags.length
        ? s.markers
        : s.vibhags.map((_, i) => (i === 0 ? 'X' : String(i + 1)));
    if (s.markers && s.markers.length !== s.vibhags.length)
      diags.push({
        level: 'warn',
        code: 'taal.markers',
        message: `taal.markers has ${s.markers.length} entries but ${s.vibhags.length} vibhags; using defaults`,
      });
    return build(key || 'custom', s.name ?? 'ताल', s.vibhags, markers);
  }
  if (!hit) {
    diags.push({
      level: 'error',
      code: 'taal.unknown',
      message: `Unknown taal "${s.name ?? ''}"; falling back to teentaal. Provide taal.vibhags for a custom taal.`,
    });
    const r = TABLE.teentaal;
    return build('teentaal', r.display, r.vibhags, r.markers);
  }
  const [id, row] = hit;
  const def = build(id, row.display, row.vibhags, row.markers);
  if (s.totalMatras !== undefined && s.totalMatras !== def.total)
    diags.push({
      level: 'warn',
      code: 'taal.total',
      message: `Input says ${s.totalMatras} matras but ${id} has ${def.total}`,
    });
  if (s.khands !== undefined && s.khands !== def.vibhags.length)
    diags.push({
      level: 'warn',
      code: 'taal.khands',
      message: `Input says ${s.khands} khands but ${id} has ${def.vibhags.length} vibhags (${def.vibhags.join('+')})`,
    });
  return def;
}

export const vibhagIndex = (t: TaalDef, pos: number): number => {
  let idx = 0;
  for (let i = 0; i < t.starts.length; i++) if (pos >= t.starts[i]) idx = i;
  return idx;
};
export const isVibhagStart = (t: TaalDef, pos: number) => t.starts.includes(pos);
export const expectedPos = (t: TaalDef, startMatra: number, k: number) =>
  ((startMatra - 1 + k) % t.total) + 1;

/** How a taal marker is printed. Bhatkhande books: × for sam, ० for khali, Devanagari numerals for the other talis. */
const DEVA_DIGITS = '०१२३४५६७८९';
const toDevanagariDigits = (text: string) =>
  [...text].map((c) => (c >= '0' && c <= '9' ? DEVA_DIGITS[Number(c)] : c)).join('');

export function markerText(marker: string, script: 'devanagari' | 'latin'): string {
  const m = marker.trim();
  if (m.toLowerCase() === 'x' || m === '×') return '×';
  if (m === '0' || m === 'O' || m === 'o' || m === '०') return script === 'devanagari' ? '०' : '0';
  return script === 'devanagari' ? toDevanagariDigits(m) : m;
}
