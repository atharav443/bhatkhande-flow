import { Tables } from '../core/tables';
import { Modifier, ModifierPosition } from './modifier';
import type { ModifierContextState } from './modifiercontext';

/** Tivra Ma: a short vertical stroke ABOVE the swar. Category `tivra_mark`. */
export class TivraMark extends Modifier {
  static CATEGORY = 'tivra_mark';
  constructor() { super(); this.position = ModifierPosition.ABOVE; }

  static format(marks: TivraMark[], state: ModifierContextState): void {
    const d = Tables.style.decor;
    for (const m of marks) { const k = m.scale(); m.setTextLine(state.top_px + d.tivraGap * k); state.top_px = m.textLine + d.tivraHeight * k; }
  }
  private scale(): number { return (this.note as any)?.scale ?? 1; }

  draw(): void {
    const ctx = this.checkContext(), d = Tables.style.decor, k = this.scale();
    const ink = this.getNote().getInkBox();
    const x = ink.x + ink.w / 2, y0 = ink.y - this.textLine, y1 = y0 - d.tivraHeight * k;
    this.openGroup(ctx);
    ctx.save().setStrokeStyle(Tables.style.ink);
    ctx.line(x, y0, x, y1, d.tivraThickness * k);
    ctx.restore().closeGroup();
    this.setRendered();
  }
}
