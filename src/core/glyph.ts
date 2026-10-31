import { BoundingBox } from './boundingbox';
import { Tables } from './tables';
import type { FontRole, Shape } from '../font/provider';
import type { RenderContext } from '../render/rendercontext';

/**
 * A shaped piece of text (VexFlow `Glyph`). Devanagari needs real OpenType shaping (matra reordering, conjuncts),
 * so outlines and ink boxes come from the FontProvider, never from a static table.
 */
export class Glyph {
  readonly shape: Shape;
  constructor(readonly text: string, readonly role: FontRole, readonly size: number) {
    this.shape = Tables.fonts.shape(text, role, size);
  }
  get inkWidth(): number { return this.shape.inkRight - this.shape.inkLeft; }
  get advance(): number { return this.shape.advance; }
  /** ink box if the pen starts at (x, baseline y) */
  inkBox(x: number, y: number): BoundingBox {
    return new BoundingBox(x + this.shape.inkLeft, y + this.shape.inkTop, this.inkWidth, this.shape.inkBottom - this.shape.inkTop);
  }
  /** draw with the ink's LEFT edge at `inkX` and baseline `y` */
  renderAtInk(ctx: RenderContext, inkX: number, y: number): BoundingBox {
    const penX = inkX - this.shape.inkLeft;
    return this.render(ctx, penX, y);
  }
  render(ctx: RenderContext, penX: number, y: number): BoundingBox {
    const ink = this.inkBox(penX, y);
    const st = Tables.style;
    if (st.textMode === 'path' && this.shape.pathD !== undefined) ctx.glyph(this.shape.pathD, penX, y, ink);
    else ctx.text(this.text, penX, y, { family: Tables.fonts.family(this.role), size: this.size, weight: Tables.fonts.weight(this.role) }, ink);
    return ink;
  }
}
