import type { Script } from '../music/swar';
import type { FontProvider, FontRole } from '../font/provider';
import { defined } from './util';

/**
 * House style + metric tables (VexFlow `Tables` + music-font metrics).
 * All values in px at scale 1. Defaults are measured off the Raag Bodh / Praveshika scans
 * (swar and lyric about the same height, markers on their own line below the lyrics, etc.).
 */
export interface BhatkhandeStyle {
  script: Script;
  textMode: 'path' | 'text';
  ink: string;
  background: string;
  fontSize: { swar: number; lyric: number; marker: number; kanScale: number; title: number; subtitle: number; heading: number; label: number; text: number };
  spacing: {
    /** minimum white space on each side of a matra's packed cluster */
    matraPad: number;
    /** gap between tightly packed events inside one matra (गम, पनी) */
    clusterGap: number;
    /** horizontal room taken by a vibhag bar */
    vibhagGap: number;
    /** swar line -> lyric line */
    swarToLyric: number;
    /** lyric line -> marker line */
    lyricToMarker: number;
    rowGap: number;
    sectionGap: number;
    headingGap: number;
    margin: number;
    /** pages wider than this are scaled down as a whole (rows are taal cycles and never wrap) */
    maxWidth: number;
  };
  decor: {
    dotRadius: number; dotGap: number; dotStack: number;
    komalThickness: number; komalGap: number; komalWidth: number;
    tivraHeight: number; tivraThickness: number; tivraGap: number;
    kanNestScale: number; kanGap: number; kanLift: number;
    khatkaWidth: number; khatkaThickness: number;
    dashWidth: number; dashThickness: number;
  };
  curve: { depth: number; thickness: number; gap: number; inset: number };
  meend: { height: number; thickness: number; lane: number };
  tihai: { lane: number; tick: number; thickness: number; labelSize: number; label: string };
  bar: { width: number; overshoot: number; thick: number; repeatDot: number };
  /** alternate endings: bracket lane above the row (VexFlow `Volta`) */
  volta: { lane: number; tick: number; thickness: number; labelSize: number };
}

export const DEFAULT_STYLE: BhatkhandeStyle = {
  script: 'devanagari',
  textMode: 'path',
  ink: '#151515',
  background: '#ffffff',
  fontSize: { swar: 24, lyric: 21, marker: 21, kanScale: 0.6, title: 32, subtitle: 21, heading: 21, label: 19, text: 19 },
  spacing: { matraPad: 7, clusterGap: 1, vibhagGap: 16, swarToLyric: 16, lyricToMarker: 6, rowGap: 30, sectionGap: 14, headingGap: 14, margin: 44, maxWidth: 1000 },
  decor: {
    dotRadius: 2.1, dotGap: 3, dotStack: 2.2,
    komalThickness: 1.8, komalGap: 3, komalWidth: 0.8,
    tivraHeight: 8, tivraThickness: 1.7, tivraGap: 2.5,
    kanNestScale: 0.8, kanGap: 1.5, kanLift: 5,
    khatkaWidth: 6, khatkaThickness: 1.4,
    dashWidth: 0.5, dashThickness: 1.8,
  },
  curve: { depth: 5, thickness: 1.5, gap: 4, inset: 1 },
  meend: { height: 7, thickness: 1.4, lane: 12 },
  tihai: { lane: 20, tick: 5, thickness: 1.2, labelSize: 14, label: 'तिहाई' },
  bar: { width: 1.8, overshoot: 4, thick: 3.6, repeatDot: 2 },
  volta: { lane: 22, tick: 9, thickness: 1.3, labelSize: 15 },
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
export function createStyle(over: DeepPartial<BhatkhandeStyle> = {}): BhatkhandeStyle {
  const merge = (a: any, b: any): any => {
    if (!b) return a;
    const out: any = { ...a };
    for (const k of Object.keys(b)) out[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) ? merge(a[k] ?? {}, b[k]) : b[k];
    return out;
  };
  return merge(DEFAULT_STYLE, over);
}

/** Global current style + font provider, set by the Factory (VexFlow keeps the current music font in Tables the same way). */
export class Tables {
  private static _style: BhatkhandeStyle = DEFAULT_STYLE;
  private static _fonts?: FontProvider;
  static get style(): BhatkhandeStyle { return Tables._style; }
  static setStyle(s: BhatkhandeStyle): void { Tables._style = s; }
  static get fonts(): FontProvider { return defined(Tables._fonts, 'NoFontProvider', 'Tables.setFonts() must be called (the Factory does this)'); }
  static setFonts(f: FontProvider): void { Tables._fonts = f; }
}

export type { FontRole };
