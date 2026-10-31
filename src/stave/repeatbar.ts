import { Element } from '../core/element.js';
import { Tables } from '../core/tables.js';

export enum RepeatType {
  BEGIN = 1,
  END = 2,
  BOTH = 3,
}

/** Repeat sign ‖: / :‖ / :‖: (VexFlow `Barline` REPEAT_BEGIN / REPEAT_END / REPEAT_BOTH). Category `repeat_bar`. */
export class RepeatBar extends Element {
  static CATEGORY = 'repeat_bar';
  constructor(
    readonly type: RepeatType,
    readonly x: number,
    readonly y0: number,
    readonly y1: number,
  ) {
    super();
    this.setData('repeat', type === RepeatType.BEGIN ? 'begin' : type === RepeatType.END ? 'end' : 'both');
  }
  draw(): void {
    const ctx = this.checkContext(),
      b = Tables.style.bar,
      ink = Tables.style.ink;
    const { x, y0, y1 } = this,
      mid = (y0 + y1) / 2,
      gap = (y1 - y0) * 0.12;
    this.openGroup(ctx);
    ctx.save().setStrokeStyle(ink).setFillStyle(ink);
    const dots = (dx: number) => {
      ctx.circle(dx, mid - gap, b.repeatDot);
      ctx.circle(dx, mid + gap, b.repeatDot);
    };
    if (this.type === RepeatType.BEGIN) {
      ctx.line(x - 2, y0, x - 2, y1, b.thick);
      ctx.line(x + 2.5, y0, x + 2.5, y1, b.width);
      dots(x + 7);
    } else if (this.type === RepeatType.END) {
      dots(x - 7);
      ctx.line(x - 2.5, y0, x - 2.5, y1, b.width);
      ctx.line(x + 2, y0, x + 2, y1, b.thick);
    } else {
      dots(x - 7);
      ctx.line(x - 2, y0, x - 2, y1, b.width);
      ctx.line(x + 2, y0, x + 2, y1, b.width);
      dots(x + 7);
    }
    ctx.restore().closeGroup();
    this.setRendered();
  }
}
