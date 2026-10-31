import { Element } from '../core/element.js';
import { Tables } from '../core/tables.js';
import type { Note } from '../notes/note.js';
import type { TaalStave } from '../stave/taalstave.js';

/**
 * Meend: an arc ABOVE the swars from one note to another (VexFlow `Curve`). Like VexFlow's partial curves,
 * a meend that crosses a row (or section) boundary is drawn as one open piece per row: the first piece runs to
 * the row's right edge, the last starts at the left edge. Category `meend`.
 */
export class Meend extends Element {
  static CATEGORY = 'meend';
  constructor(
    readonly from: Note,
    readonly to: Note,
    readonly staves: TaalStave[],
  ) {
    super();
  }
  /** the staves this meend touches, in page order (filled in by the Page) */
  static lane(): number {
    return Tables.style.meend.lane;
  }
  draw(): void {
    const ctx = this.checkContext(),
      st = Tables.style.meend;
    this.openGroup(ctx);
    ctx.save().setStrokeStyle(Tables.style.ink).setLineWidth(st.thickness);
    this.staves.forEach((s, i) => {
      const first = i === 0,
        last = i === this.staves.length - 1;
      const a = first ? this.from.getInkBox() : undefined,
        b = last ? this.to.getInkBox() : undefined;
      const x0 = a ? a.x + a.w / 2 : s.getLeftX(),
        x1 = b ? b.x + b.w / 2 : s.getRightX();
      const y = s.getYForLane('meend');
      const h = Math.min(st.height, Math.max(3, (x1 - x0) * 0.15));
      ctx
        .beginPath()
        .moveTo(x0, y)
        .quadraticCurveTo((x0 + x1) / 2, y - 2 * h, x1, y)
        .stroke();
    });
    ctx.restore().closeGroup();
    this.setRendered();
  }
}
