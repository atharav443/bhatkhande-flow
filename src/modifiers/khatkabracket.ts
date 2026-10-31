import { Tables } from '../core/tables';
import { Modifier, ModifierPosition } from './modifier';
import type { ModifierContextState } from './modifiercontext';

/** One side of a khatka, printed as the swar in parentheses: (प). Category `khatka_bracket` (one label per side). */
export class KhatkaBracket extends Modifier {
  static CATEGORY = 'khatka_bracket';
  constructor(position: ModifierPosition.LEFT | ModifierPosition.RIGHT) {
    super();
    this.position = position;
    this.width = Tables.style.decor.khatkaWidth;
    this.setData('bracket_side', position === ModifierPosition.LEFT ? 'left' : 'right');
  }
  static format(brackets: KhatkaBracket[], state: ModifierContextState): void {
    const gap = 2;
    for (const b of brackets) {
      if (b.position === ModifierPosition.LEFT) state.left_shift += b.width + gap;
      else state.right_shift += b.width + gap;
    }
  }
  draw(): void {
    const ctx = this.checkContext(),
      st = Tables.style;
    const note = this.getNote(),
      ink = note.getInkBox();
    const base = note.getBaselineY(),
      fs = st.fontSize.swar;
    const top = base - fs * 0.78,
      bot = base + fs * 0.12,
      mid = (top + bot) / 2,
      gap = 2,
      w = this.width;
    this.openGroup(ctx);
    ctx.save().setStrokeStyle(st.ink).setLineWidth(st.decor.khatkaThickness);
    if (this.position === ModifierPosition.LEFT) {
      const x = ink.x - gap;
      ctx
        .beginPath()
        .moveTo(x, top)
        .quadraticCurveTo(x - w * 1.4, mid, x, bot)
        .stroke();
    } else {
      const x = ink.x1 + gap;
      ctx
        .beginPath()
        .moveTo(x, top)
        .quadraticCurveTo(x + w * 1.4, mid, x, bot)
        .stroke();
    }
    ctx.restore().closeGroup();
    this.setRendered();
  }
}
