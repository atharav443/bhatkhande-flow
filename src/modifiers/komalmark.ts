import { Tables } from '../core/tables';
import { Modifier, ModifierPosition } from './modifier';
import type { ModifierContextState } from './modifiercontext';

/** Komal: a short bar UNDER the swar (only under that letter when it sits in a group). Category `komal_mark`. */
export class KomalMark extends Modifier {
  static CATEGORY = 'komal_mark';
  constructor() {
    super();
    this.position = ModifierPosition.BELOW;
  }

  static format(marks: KomalMark[], state: ModifierContextState): void {
    const d = Tables.style.decor;
    for (const m of marks) {
      m.setTextLine(state.bottom_px + d.komalGap * m.scale());
      state.bottom_px = m.textLine + d.komalThickness * m.scale();
    }
  }
  private scale(): number {
    return (this.note as any)?.scale ?? 1;
  }

  draw(): void {
    const ctx = this.checkContext(),
      d = Tables.style.decor,
      k = this.scale();
    const ink = this.getNote().getInkBox();
    const w = ink.w * d.komalWidth,
      th = d.komalThickness * k;
    const y = ink.y1 + this.textLine + th / 2,
      cx = ink.x + ink.w / 2;
    this.openGroup(ctx);
    ctx.save().setStrokeStyle(Tables.style.ink);
    ctx.line(cx - w / 2, y, cx + w / 2, y, th);
    ctx.restore().closeGroup();
    this.setRendered();
  }
}
