import { Element } from '../core/element';
import { Glyph } from '../core/glyph';
import { Tables } from '../core/tables';
import type { Note } from '../notes/note';
import type { TaalStave } from '../stave/taalstave';

/** Bracket with a caption over a tihai (VexFlow `Tuplet` bracket). Category `tihai_bracket`. */
export class TihaiBracket extends Element {
  static CATEGORY = 'tihai_bracket';
  constructor(
    readonly from: Note,
    readonly to: Note,
    readonly staves: TaalStave[],
    readonly label?: string,
  ) {
    super();
  }
  draw(): void {
    const ctx = this.checkContext(),
      st = Tables.style.tihai;
    this.openGroup(ctx);
    ctx.save().setStrokeStyle(Tables.style.ink).setFillStyle(Tables.style.ink).setLineWidth(st.thickness);
    this.staves.forEach((s, i) => {
      const first = i === 0,
        last = i === this.staves.length - 1;
      const x0 = first ? this.from.getInkBox().x : s.getLeftX(),
        x1 = last ? this.to.getInkBox().x1 : s.getRightX();
      const y = s.getYForLane('tihai');
      ctx.beginPath();
      if (first) ctx.moveTo(x0, y + st.tick).lineTo(x0, y);
      else ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      if (last) ctx.lineTo(x1, y + st.tick);
      ctx.stroke();
      const text = this.label ?? st.label;
      if (first && text) {
        const g = new Glyph(text, 'small', st.labelSize);
        g.renderAtInk(ctx, (x0 + x1) / 2 - g.inkWidth / 2, y - 3);
      }
    });
    ctx.restore().closeGroup();
    this.setRendered();
  }
}
