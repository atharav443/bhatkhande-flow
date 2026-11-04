import { Element } from './core/element.js';
import { createStyle, Tables, type BhatkhandeStyle } from './core/tables.js';
import type { FontProvider } from './font/provider.js';
import { fromXML } from './input/fromXML.js';
import { normalizeBandish } from './input/fromJSON.js';
import { isLabelStudio, labelStudioToBandish } from './input/fromLabelStudio.js';
import { lowerBandish } from './input/lower.js';
import type { Diagnostic } from './input/types.js';
import { buildPage, type BuildOptions } from './builder.js';
import { SVGContext } from './render/svgcontext.js';
import { collectLabels, type Label } from './render/labels.js';
import { documentSize, pageScale } from './export/pagefit.js';
import type { Page } from './stave/page.js';

export interface FactoryOptions {
  fonts: FontProvider;
  style?: Parameters<typeof createStyle>[0];
  build?: BuildOptions;
}
export interface RenderResult {
  svg: string;
  /** emitted size, CSS px at 96 dpi (what the SVG's width/height attributes say) */
  width: number;
  height: number;
  /** the same size in points and EMU: what Word, Google Docs and print use to place the image */
  widthPt: number;
  heightPt: number;
  widthEmu: number;
  heightEmu: number;
  scale: number;
  labels: Label[];
  diagnostics: Diagnostic[];
  page: Page;
  context: SVGContext;
}

/**
 * Entry point (VexFlow `Factory`): sets the current style + fonts, builds the elements from a bandish,
 * formats (Page = System) and draws in a fixed order: header -> rows (bars, markers, notes, modifiers) -> spanners.
 */
export class Factory {
  readonly style: BhatkhandeStyle;
  constructor(readonly options: FactoryOptions) {
    this.style = createStyle(options.style);
  }

  /** A Label Studio export (task or list of tasks) is converted to bandish JSON; anything else passes through. */
  private fromJSONLike(j: any): any {
    return isLabelStudio(j) ? labelStudioToBandish(Array.isArray(j) ? j : [j]) : j;
  }

  renderBandish(input: string | object, format: 'auto' | 'json' | 'xml' = 'auto'): RenderResult {
    Tables.setStyle(this.style);
    Tables.setFonts(this.options.fonts);
    Element.resetIDs();
    let parsed;
    if (typeof input === 'string') {
      const xml = format === 'xml' || (format === 'auto' && input.trimStart().startsWith('<'));
      parsed = xml ? fromXML(input) : normalizeBandish(this.fromJSONLike(JSON.parse(input)));
    } else parsed = normalizeBandish(this.fromJSONLike(input));
    const low = lowerBandish(parsed.model, parsed.diagnostics);
    const { page, diagnostics } = buildPage(low, this.options.build);
    page.format();
    const scale = pageScale(page.width, this.style);
    const ctx = new SVGContext().resize(page.width, page.height, this.style.background).setScale(scale);
    page.setContext(ctx).draw();
    const width = page.width * scale;
    const height = page.height * scale;
    const size = documentSize(width, height);
    return {
      svg: ctx.toString(),
      width,
      height,
      widthPt: size.widthPt,
      heightPt: size.heightPt,
      widthEmu: size.widthEmu,
      heightEmu: size.heightEmu,
      scale,
      labels: collectLabels(ctx, scale),
      diagnostics,
      page,
      context: ctx,
    };
  }
}
