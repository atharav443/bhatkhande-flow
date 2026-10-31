/** Swar vocabulary. The model stores a scale DEGREE, never a script-specific string. */
export type Degree = 'S' | 'R' | 'G' | 'M' | 'P' | 'D' | 'N';
export const DEGREES: Degree[] = ['S', 'R', 'G', 'M', 'P', 'D', 'N'];

export const canBeKomal = (d: Degree) => d === 'R' || d === 'G' || d === 'D' || d === 'N';
export const canBeTivra = (d: Degree) => d === 'M';

export type Script = 'devanagari' | 'latin';

const DISPLAY: Record<Script, Record<Degree, string>> = {
  devanagari: { S: 'सा', R: 'रे', G: 'ग', M: 'म', P: 'प', D: 'ध', N: 'नी' },
  latin: { S: 'S', R: 'R', G: 'G', M: 'M', P: 'P', D: 'D', N: 'N' },
};
export const degreeText = (d: Degree, script: Script): string => DISPLAY[script][d];

export interface ParsedSwar {
  degree: Degree;
  komal?: boolean;
  tivra?: boolean;
  /** Only a hint: anusvara (सां) is used by some typists to mean taar saptak. Explicit octave wins. */
  octaveHint?: number;
}

const DEVA_BASE: Record<string, Degree> = { स: 'S', र: 'R', ग: 'G', म: 'M', प: 'P', ध: 'D', न: 'N' };
const LATIN_NAMES: Record<string, Degree> = {
  sa: 'S',
  re: 'R',
  ga: 'G',
  ma: 'M',
  pa: 'P',
  dha: 'D',
  ni: 'N',
};

/** Unicode svara marks: ॒ (anudatta) = komal, ॑ (udatta) = tivra. Returns the parsed base with the flag applied, or null if no mark. */
function parseSvaraMark(t: string): ParsedSwar | undefined | null {
  const flag = t.endsWith('॒') ? 'komal' : t.endsWith('॑') ? 'tivra' : null;
  if (!flag) return null;
  const base = parseSwarText(t.slice(0, -1));
  return base && { ...base, [flag]: true };
}

/** Splits a trailing octave mark off the text: one or two of ' or . , or a single nukta. */
function splitOctaveSuffix(t: string): { base: string; suffix: string } | null {
  const last = t[t.length - 1];
  let len = 0;
  if (last === '़') len = 1;
  else if (last === "'" || last === '.') len = t[t.length - 2] === last ? 2 : 1;
  const base = t.slice(0, t.length - len);
  return len && base ? { base, suffix: t.slice(base.length) } : null;
}

/**
 * Octave shorthands: S' / सा' = taar, S. / ध़ / ध. = mandra (doubled = ati-).
 * Returns the parsed base with octaveHint applied, or null if no suffix.
 */
function parseOctaveSuffix(t: string): ParsedSwar | undefined | null {
  const split = splitOctaveSuffix(t);
  if (!split) return null;
  const { base, suffix } = split;
  const parsed = parseSwarText(base);
  if (!parsed) return undefined;
  const n = suffix === '़' ? 1 : suffix.length;
  return { ...parsed, octaveHint: suffix[0] === "'" ? n : -n };
}

/** Single-letter notation: capitals are shuddha, r g d n = komal, m = tivra, s / p accepted in lowercase. */
const LETTER_NOTES: Record<string, ParsedSwar> = {
  ...Object.fromEntries(DEGREES.map((d) => [d, { degree: d }])),
  r: { degree: 'R', komal: true },
  g: { degree: 'G', komal: true },
  d: { degree: 'D', komal: true },
  n: { degree: 'N', komal: true },
  m: { degree: 'M', tivra: true },
  s: { degree: 'S' },
  p: { degree: 'P' },
};

/** सा, रे etc: the first letter picks the degree; anusvara / candrabindu anywhere means taar. */
function parseDevanagariNote(t: string): ParsedSwar | undefined {
  const degree = DEVA_BASE[[...t][0]];
  if (!degree) return undefined;
  return { degree, octaveHint: t.includes('ं') || t.includes('ँ') ? 1 : undefined };
}

function parseLatinName(t: string): ParsedSwar | undefined {
  const degree = LATIN_NAMES[t.toLowerCase()];
  return degree && { degree };
}

/** A bare note with no marks: Devanagari, Latin name, or single letter. */
function parseBaseNote(t: string): ParsedSwar | undefined {
  const letter = LETTER_NOTES[t];
  return parseDevanagariNote(t) ?? parseLatinName(t) ?? (letter && { ...letter });
}

/** Accepts Devanagari (सा रे ग म प ध नि, with variants), Latin names (Sa Re ...), and single letters (S R G M P D N; r g d n = komal, m = tivra). */
export function parseSwarText(raw: string): ParsedSwar | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const marked = parseSvaraMark(t);
  if (marked !== null) return marked;
  const suffixed = parseOctaveSuffix(t);
  if (suffixed !== null) return suffixed;
  return parseBaseNote(t);
}

export function parseOctave(v: unknown): number | undefined {
  if (typeof v === 'number') return Math.max(-2, Math.min(2, Math.round(v)));
  if (typeof v !== 'string') return undefined;
  const s = v.trim().toLowerCase();
  const map: Record<string, number> = {
    'ati-mandra': -2,
    ati_mandra: -2,
    atimandra: -2,
    mandra: -1,
    lower: -1,
    low: -1,
    madhya: 0,
    middle: 0,
    mid: 0,
    '': 0,
    taar: 1,
    tar: 1,
    higher: 1,
    high: 1,
    'ati-taar': 2,
    ati_taar: 2,
    atitaar: 2,
  };
  if (s in map) return map[s];
  const n = Number(s);
  return Number.isFinite(n) ? Math.max(-2, Math.min(2, Math.round(n))) : undefined;
}
