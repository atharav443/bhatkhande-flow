import { Element } from '../core/element';
import { Tables } from '../core/tables';
import type { Note } from '../notes/note';

/**
 * The ⌣ under the events of one matra when it holds more than one (VexFlow `Curve`/beam-group idea,
 * Bhatkhande shape). Drawn under the swar cluster, and under the lyric cluster when the syllables are grouped too.
 * Category `grouping_curve`.
 */
export class GroupingCurve extends Element {
  static CATEGORY = 'grouping_curve';
  constructor(readonly notes: Note[], readonly lane: 'swar' | 'lyric') { super(); this.setData('curve_scope', lane); }
  draw(): void {
    const ctx = this.checkContext(), st = Tables.style.curve;
    const boxes = this.notes.map((n) => n.getInkBox());
    const stave = this.notes[0].checkStave();
    const nominalBelow = this.lane === 'swar' ? Tables.style.fontSize.swar * 0.12 : Tables.style.fontSize.lyric * 0.2;
    const lowest = Math.max(stave.getYForLane(this.lane) + nominalBelow, ...this.notes.map((n) => n.getBaselineY() + n.getExtents().below));
    const x0 = Math.min(...boxes.map((b) => b.x)) + st.inset, x1 = Math.max(...boxes.map((b) => b.x1)) - st.inset;
    const y = lowest + st.gap, mid = (x0 + x1) / 2;
    this.openGroup(ctx);
    ctx.save().setStrokeStyle(Tables.style.ink).setLineWidth(st.thickness);
    ctx.beginPath().moveTo(x0, y).quadraticCurveTo(mid, y + 2 * st.depth, x1, y).stroke();
    ctx.restore().closeGroup();
    this.setRendered();
  }
}
