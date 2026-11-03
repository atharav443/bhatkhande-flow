/**
 * Page geometry for documents (Word, Google Docs, print).
 *
 * The engine lays out in CSS px at 96 dpi; paper and image placement are specified in points, and
 * Word stores sizes in EMU. This module is the single conversion point, so no other file has to
 * know that 1 pt = 4/3 px or that 1 in = 914400 EMU.
 */
import type { BhatkhandeStyle } from '../core/tables.js';

/** CSS px -> pt (1 in = 96 px = 72 pt) */
export const PX_TO_PT = 72 / 96;
/** pt -> EMU (1 in = 72 pt = 914400 EMU): the unit docx `<wp:extent>` is written in */
export const PT_TO_EMU = 914400 / 72;

export interface PagePreset {
  readonly label: string;
  /** full sheet, in points */
  readonly widthPt: number;
  readonly heightPt: number;
}

/** Sheet sizes in points (1 in = 72 pt). */
export const PAGE_PRESETS: Record<'a4' | 'letter', PagePreset> = {
  a4: { label: 'A4', widthPt: 595.28, heightPt: 841.89 },
  letter: { label: 'US Letter', widthPt: 612, heightPt: 792 },
};

export type PagePresetName = keyof typeof PAGE_PRESETS;

/** The usable column inside a sheet, assuming equal margins on all four sides (Word's default is 1 in). */
export function textColumn(name: PagePresetName, marginPt = 72): { widthPt: number; heightPt: number } {
  const page = PAGE_PRESETS[name];
  if (!(marginPt >= 0) || marginPt * 2 >= page.widthPt)
    throw new RangeError(`margin ${marginPt}pt does not fit a ${page.label} sheet`);
  return { widthPt: page.widthPt - 2 * marginPt, heightPt: page.heightPt - 2 * marginPt };
}

export function ptToEmu(pt: number): number {
  return Math.round(pt * PT_TO_EMU);
}

/**
 * How much the drawn page must shrink to land in a document column.
 *
 * `style.page.fitWidthPt` (points) wins when set; otherwise `style.spacing.maxWidth` (px) keeps the
 * historical behaviour, where a page is never enlarged past its drawn size. Both are clamped to 1,
 * because a bandish row is a taal cycle: it can shrink but it can never be re-wrapped.
 */
export function pageScale(pageWidthPx: number, style: BhatkhandeStyle): number {
  if (!(pageWidthPx > 0)) return 1;
  const fit = style.page.fitWidthPt;
  const scale = fit === undefined ? style.spacing.maxWidth / pageWidthPx : fit / (pageWidthPx * PX_TO_PT);
  return Math.min(1, scale);
}

export interface DocumentSize {
  /** size of the emitted image, points (what Word calls the drawing's extent) */
  widthPt: number;
  heightPt: number;
  /** the same, in EMU, ready for `<wp:extent cx cy>` */
  widthEmu: number;
  heightEmu: number;
  /** the same, inches, for humans */
  widthIn: number;
  heightIn: number;
}

/** Physical size of an image whose intrinsic size is `widthPx` x `heightPx` CSS px. */
export function documentSize(widthPx: number, heightPx: number): DocumentSize {
  const widthPt = widthPx * PX_TO_PT;
  const heightPt = heightPx * PX_TO_PT;
  return {
    widthPt,
    heightPt,
    widthEmu: ptToEmu(widthPt),
    heightEmu: ptToEmu(heightPt),
    widthIn: widthPt / 72,
    heightIn: heightPt / 72,
  };
}

/** Pixels needed to print an image `widthPt` wide at `dpi`. */
export function pixelsForDpi(widthPt: number, dpi: number): number {
  return Math.max(1, Math.round((widthPt / 72) * dpi));
}
