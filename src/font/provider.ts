/**
 * FontProvider = what VexFlow's music-font metrics tables are, for us.
 * The engine never measures text itself: it asks a provider for the SHAPED ink box of a string.
 * Devanagari shaping (matra reordering, conjuncts) happens inside the provider (HarfBuzz/fontkit/browser),
 * so decoration anchors (dots, komal bar, tivra tick, kan) are computed from real glyph geometry.
 */
export type FontRole = 'swar' | 'lyric' | 'marker' | 'title' | 'subtitle' | 'section' | 'small';

export interface Shape {
  /** pen advance, px */
  advance: number;
  /** ink box relative to the text origin (x = pen start, y = baseline; y grows DOWN so inkTop < 0 for ascenders) */
  inkLeft: number;
  inkRight: number;
  inkTop: number;
  inkBottom: number;
  /** outline as SVG path data in origin-relative coords. Present for outline-capable providers. */
  pathD?: string;
}

export interface FontProvider {
  shape(text: string, role: FontRole, size: number): Shape;
  /** CSS font-family to use when the SVG backend emits <text> instead of outlines */
  family(role: FontRole): string;
  /** CSS font-weight for the role */
  weight(role: FontRole): number;
}
