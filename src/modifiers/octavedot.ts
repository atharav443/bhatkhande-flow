import { Tables } from '../core/tables';
import { Modifier, ModifierPosition } from './modifier';
import type { ModifierContextState } from './modifiercontext';

/**
 * Saptak dot (VexFlow `Dot`/`Articulation` stacking): taar = dot ABOVE, mandra = dot BELOW. One OctaveDot per dot,
 * so ati-taar / ati-mandra are two stacked dots and each dot is its own `octave_dot` label.
 */
export class OctaveDot extends Modifier {
  static CATEGORY = 'octave_dot';
  constructor(position: ModifierPosition.ABOVE | ModifierPosition.BELOW) {
    super(); this.position = position;
    this.setData('octave_dot_position', position === ModifierPosition.ABOVE ? 'above' : 'below');
  }

  static format(dots: OctaveDot[], state: ModifierContextState): void {
    const d = Tables.style.decor;
    let firstAbove = true, firstBelow = true;
    for (const m of dots) {
      const k = m.scale(), r = d.dotRadius * k;
      if (m.position === ModifierPosition.ABOVE) {
        m.setTextLine(state.top_px + (firstAbove ? d.dotGap : d.dotStack) * k); state.top_px = m.textLine + 2 * r; firstAbove = false;
      } else {
        m.setTextLine(state.bottom_px + (firstBelow ? d.dotGap : d.dotStack) * k); state.bottom_px = m.textLine + 2 * r; firstBelow = false;
      }
    }
  }
  private scale(): number { return (this.note as any)?.scale ?? 1; }

  draw(): void {
    const ctx = this.checkContext(), r = Tables.style.decor.dotRadius * this.scale();
    const ink = this.getNote().getInkBox();
    const cx = ink.x + ink.w / 2;
    const cy = this.position === ModifierPosition.ABOVE ? ink.y - this.textLine - r : ink.y1 + this.textLine + r;
    this.openGroup(ctx);
    ctx.save().setFillStyle(Tables.style.ink);
    ctx.circle(cx, cy, r);
    ctx.restore().closeGroup();
    this.setRendered();
  }
}
