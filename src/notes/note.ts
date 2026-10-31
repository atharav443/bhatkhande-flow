import { BoundingBox } from '../core/boundingbox';
import { Glyph } from '../core/glyph';
import { defined } from '../core/util';
import { Tickable } from './tickable';
import type { Fraction } from '../core/fraction';
import type { FontRole } from '../font/provider';
import type { TaalStave, Lane } from '../stave/taalstave';

/**
 * A tickable that shows a glyph on one of the stave's lanes (VexFlow `Note`).
 * The stave owns y (lanes), the formatter owns x. A note can also be placed absolutely
 * (used by kan notes, which live inside a KanGroup like VexFlow grace notes live inside a GraceNoteGroup).
 */
export abstract class Note extends Tickable {
  static CATEGORY = 'note';
  protected stave?: TaalStave;
  protected glyph?: Glyph;
  protected fixed?: { x: number; y: number };
  abstract readonly lane: Lane;

  constructor(ticks: Fraction) { super(ticks); }

  setStave(s: TaalStave): this { this.stave = s; return this; }
  getStave(): TaalStave | undefined { return this.stave; }
  checkStave(): TaalStave { return defined(this.stave, 'NoStave', `${this.getCategory()} has no stave`); }

  /** place absolutely: ink-left x and baseline y */
  setFixedPosition(x: number, y: number): this { this.fixed = { x, y }; return this; }

  protected makeGlyph(text: string, role: FontRole, size: number): Glyph { this.glyph = new Glyph(text, role, size); return this.glyph; }
  getGlyph(): Glyph | undefined { return this.glyph; }
  protected measureNotePx(): number { return this.glyph ? this.glyph.inkWidth : 0; }

  getBaselineY(): number { return this.fixed ? this.fixed.y : this.checkStave().getYForLane(this.lane); }
  getInkLeft(): number { return this.fixed ? this.fixed.x : this.getNoteX(); }

  /** absolute ink box of the glyph (before modifiers) */
  getInkBox(): BoundingBox {
    const y = this.getBaselineY();
    if (!this.glyph) return new BoundingBox(this.getInkLeft(), y, this.notePx, 0);
    const g = this.glyph.shape;
    return new BoundingBox(this.getInkLeft(), y + g.inkTop, this.glyph.inkWidth, g.inkBottom - g.inkTop);
  }
  /** vertical ink extents relative to the baseline (above > 0 upwards), including stacked modifiers */
  getExtents(): { above: number; below: number } {
    const g = this.glyph?.shape;
    const above = g ? -g.inkTop : 0, below = g ? Math.max(0, g.inkBottom) : 0;
    const mc = this.modifierContext;
    return { above: above + (mc?.getTopPx() ?? 0), below: below + (mc?.getBottomPx() ?? 0) };
  }

  draw(): void {
    const ctx = this.checkContext();
    this.setRendered();
    this.openGroup(ctx);
    ctx.setFillStyle(this.inkColor());
    this.drawNote();
    ctx.closeGroup();
    for (const m of this.modifiers) m.setContext(ctx).draw();
  }
  protected inkColor(): string { return '#151515'; }
  protected drawNote(): void {
    if (this.glyph) this.glyph.renderAtInk(this.checkContext(), this.getInkLeft(), this.getBaselineY());
  }
}
