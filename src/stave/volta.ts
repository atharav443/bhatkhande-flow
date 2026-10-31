import { Element } from '../core/element.js';
import { Glyph } from '../core/glyph.js';
import { Tables } from '../core/tables.js';

/** Same types as VexFlow's `Volta`: which ends of the bracket this row's piece has. */
export enum VoltaType {
  NONE = 1,
  BEGIN = 2,
  MID = 3,
  END = 4,
  BEGIN_END = 5,
}

/**
 * Alternate-ending bracket (VexFlow `Volta`, a stave modifier drawn above the row): a horizontal line with a
 * downward tick at the start (and at the end when the ending is closed) and the ending's label. A bracket that
 * runs over a row break is drawn as BEGIN / MID / END pieces, exactly like VexFlow. Category `volta_bracket`.
 */
export class Volta extends Element {
  static CATEGORY = 'volta_bracket';
  constructor(
    readonly type: VoltaType,
    readonly label: string,
    readonly x0: number,
    readonly x1: number,
    readonly y: number,
  ) {
    super();
    this.setData('label', label).setData('volta_type', VoltaType[type]);
  }
  draw(): void {
    const ctx = this.checkContext(),
      st = Tables.style.volta;
    const { x0, x1, y, type } = this;
    this.openGroup(ctx);
    ctx.save().setStrokeStyle(Tables.style.ink).setFillStyle(Tables.style.ink).setLineWidth(st.thickness);
    const begins = type === VoltaType.BEGIN || type === VoltaType.BEGIN_END,
      ends = type === VoltaType.END || type === VoltaType.BEGIN_END;
    ctx.beginPath();
    if (begins) ctx.moveTo(x0, y + st.tick).lineTo(x0, y);
    else ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    if (ends) ctx.lineTo(x1, y + st.tick);
    ctx.stroke();
    if (begins && this.label)
      new Glyph(this.label, 'small', st.labelSize).renderAtInk(ctx, x0 + 5, y + st.labelSize * 0.95);
    ctx.restore().closeGroup();
    this.setRendered();
  }
}
