import { numbersIn } from '../core/text.js';
import { Tables } from '../core/tables.js';
import type { Shape } from '../font/provider.js';
import { Modifier, ModifierPosition } from './modifier.js';
import type { ModifierContextState } from './modifiercontext.js';

/**
 * Where the printed taar dot of सा sits: over the stem of the ा matra, at the right end of the glyph, not over the middle of the ink box.
 * With an outline provider the stem is found in the outline (the right-most stem in the lower part of the glyph);
 * a text-only provider has no outline, so a measured fraction of the ink width is used.
 */
export const SA_STEM_FRACTION = 0.84;
export function stemCenterOffset(shape: Shape): number {
  const w = shape.inkRight - shape.inkLeft;
  if (shape.pathD) {
    const nums = numbersIn(shape.pathD);
    const pts: Array<[number, number]> = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    const lowY = shape.inkBottom - 0.35 * (shape.inkBottom - shape.inkTop);
    const low = pts.filter(([, y]) => y >= lowY);
    if (low.length) {
      const maxX = Math.max(...low.map(([x]) => x));
      const stem = low.filter(([x]) => x >= maxX - 0.2 * w).map(([x]) => x);
      return (Math.min(...stem) + Math.max(...stem)) / 2 - shape.inkLeft;
    }
  }
  return w * SA_STEM_FRACTION;
}

/**
 * Saptak dot (VexFlow `Dot`/`Articulation` stacking): taar = dot ABOVE, mandra = dot BELOW. One OctaveDot per dot,
 * so ati-taar / ati-mandra are two stacked dots and each dot is its own `octave_dot` label.
 */
export class OctaveDot extends Modifier {
  static CATEGORY = 'octave_dot';
  constructor(position: ModifierPosition.ABOVE | ModifierPosition.BELOW) {
    super();
    this.position = position;
    this.setData('octave_dot_position', position === ModifierPosition.ABOVE ? 'above' : 'below');
  }

  static format(dots: OctaveDot[], state: ModifierContextState): void {
    const d = Tables.style.decor;
    let firstAbove = true,
      firstBelow = true;
    for (const m of dots) {
      const k = m.scale(),
        r = d.dotRadius * k;
      if (m.position === ModifierPosition.ABOVE) {
        m.setTextLine(state.top_px + (firstAbove ? d.dotGap : d.dotStack) * k);
        state.top_px = m.textLine + 2 * r;
        firstAbove = false;
      } else {
        m.setTextLine(state.bottom_px + (firstBelow ? d.dotGap : d.dotStack) * k);
        state.bottom_px = m.textLine + 2 * r;
        firstBelow = false;
      }
    }
  }
  private scale(): number {
    return (this.note as any)?.scale ?? 1;
  }

  draw(): void {
    const ctx = this.checkContext(),
      r = Tables.style.decor.dotRadius * this.scale();
    const ink = this.getNote().getInkBox();
    // the taar dot of सा is printed over the stem of its ा, so it sits to the right of the ink centre; every other swar stays centred
    const note = this.getNote() as any;
    const overStem =
      this.position === ModifierPosition.ABOVE &&
      note.degree === 'S' &&
      Tables.style.script === 'devanagari' &&
      note.getGlyph?.();
    const cx = overStem ? ink.x + stemCenterOffset(note.getGlyph().shape) : ink.x + ink.w / 2;
    const cy =
      this.position === ModifierPosition.ABOVE ? ink.y - this.textLine - r : ink.y1 + this.textLine + r;
    this.openGroup(ctx);
    ctx.save().setFillStyle(Tables.style.ink);
    ctx.circle(cx, cy, r);
    ctx.restore().closeGroup();
    this.setRendered();
  }
}
