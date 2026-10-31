import { Element } from './core/element';
import { createStyle, Tables, type BhatkhandeStyle } from './core/tables';
import type { FontProvider } from './font/provider';
import { fromXML } from './input/fromXML';
import { normalizeBandish } from './input/fromJSON';
import { isLabelStudio, labelStudioToBandish } from './input/fromLabelStudio';
import { lowerBandish } from './input/lower';
import type { Diagnostic } from './input/types';
import { buildPage, type BuildOptions } from './builder';
import { SVGContext } from './render/svgcontext';
import { collectLabels, type Label } from './render/labels';
import type { Page } from './stave/page';

export interface FactoryOptions {
  fonts: FontProvider;
  style?: Parameters<typeof createStyle>[0];
  build?: BuildOptions;
}
export interface RenderResult {
  svg: string;
  width: number;
  height: number;
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
    const scale = Math.min(1, this.style.spacing.maxWidth / page.width);
    const ctx = new SVGContext().resize(page.width, page.height, this.style.background).setScale(scale);
    page.setContext(ctx).draw();
    return {
      svg: ctx.toString(),
      width: page.width * scale,
      height: page.height * scale,
      scale,
      labels: collectLabels(ctx, scale),
      diagnostics,
      page,
      context: ctx,
    };
  }
}
