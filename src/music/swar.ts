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

/** Accepts Devanagari (सा रे ग म प ध नि, with variants), Latin names (Sa Re ...), and single letters (S R G M P D N; r g d n = komal, m = tivra). */
export function parseSwarText(raw: string): ParsedSwar | undefined {
  let t = raw.trim();
  if (!t) return undefined;
  // octave shorthands used in readings and typed notation: S' / सा' = taar, S. / ध़ / ध. = mandra (doubled = ati-)
  // Unicode svara marks: ॒ (anudatta) = komal, ॑ (udatta) = tivra
  if (t.endsWith('॒')) {
    const b = parseSwarText(t.slice(0, -1));
    return b && { ...b, komal: true };
  }
  if (t.endsWith('॑')) {
    const b = parseSwarText(t.slice(0, -1));
    return b && { ...b, tivra: true };
  }
  const m = /^(.*?)('{1,2}|\.{1,2}|़)$/.exec(t);
  if (m && m[1]) {
    const base = parseSwarText(m[1]);
    if (!base) return undefined;
    const n = m[2] === '़' ? 1 : m[2].length;
    return { ...base, octaveHint: m[2][0] === "'" ? n : -n };
  }
  const first = [...t][0];
  if (DEVA_BASE[first]) {
    const hint = /[ंँ]/.test(t) ? 1 : undefined; // anusvara / candrabindu
    return { degree: DEVA_BASE[first], octaveHint: hint };
  }
  const lower = t.toLowerCase();
  if (LATIN_NAMES[lower]) return { degree: LATIN_NAMES[lower] };
  if (/^[SRGMPDN]$/.test(t)) return { degree: t as Degree };
  if (/^[rgdn]$/.test(t)) return { degree: t.toUpperCase() as Degree, komal: true };
  if (t === 'm') return { degree: 'M', tivra: true };
  if (t === 's' || t === 'p') return { degree: t.toUpperCase() as Degree };
  return undefined;
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
