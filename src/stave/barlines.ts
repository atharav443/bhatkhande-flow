import { Element } from '../core/element';
import { Tables } from '../core/tables';

/** Vertical line between vibhags. Spans the swar and lyric lines only (not the marker line). Category `vibhag_line`. */
export class VibhagLine extends Element {
  static CATEGORY = 'vibhag_line';
  constructor(
    readonly x: number,
    readonly y0: number,
    readonly y1: number,
  ) {
    super();
  }
  draw(): void {
    const ctx = this.checkContext();
    this.openGroup(ctx);
    ctx.save().setStrokeStyle(Tables.style.ink);
    ctx.line(this.x, this.y0, this.x, this.y1, Tables.style.bar.width);
    ctx.restore().closeGroup();
    this.setRendered();
  }
}
/** The bar closing a row that reaches the end of the cycle grid. Category `line_end_bar`. */
export class LineEndBar extends VibhagLine {
  static CATEGORY = 'line_end_bar';
}
