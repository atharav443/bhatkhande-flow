import { Element } from '../core/element.js';
import { Glyph } from '../core/glyph.js';
import { Tables } from '../core/tables.js';
import type { FontRole } from '../font/provider.js';

/** A line of page text positioned by its ink box (VexFlow `StaveText`/`TextNote` outside the music). */
export class TextLine extends Element {
  static CATEGORY = 'text';
  readonly glyph: Glyph;
  x = 0;
  baseline = 0;
  constructor(
    readonly text: string,
    role: FontRole,
    size: number,
  ) {
    super();
    this.glyph = new Glyph(text, role, size);
    this.setData('text', text);
  }
  get above(): number {
    return -this.glyph.shape.inkTop;
  }
  get below(): number {
    return Math.max(0, this.glyph.shape.inkBottom);
  }
  get width(): number {
    return this.glyph.inkWidth;
  }
  at(inkX: number, baseline: number): this {
    this.x = inkX;
    this.baseline = baseline;
    return this;
  }
  draw(): void {
    const ctx = this.checkContext();
    this.openGroup(ctx);
    ctx.setFillStyle(Tables.style.ink);
    this.glyph.renderAtInk(ctx, this.x, this.baseline);
    ctx.closeGroup();
    this.setRendered();
  }
}
export class Title extends TextLine {
  static CATEGORY = 'title';
}
export class SectionHeading extends TextLine {
  static CATEGORY = 'section_heading';
}
