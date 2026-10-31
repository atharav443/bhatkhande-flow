import { Fraction } from '../core/fraction';
import { Tables } from '../core/tables';
import { degreeText, type Degree } from '../music/swar';
import { Note } from './note';

export interface SwarStruct {
  degree: Degree;
  octave?: number;
  komal?: boolean;
  tivra?: boolean;
  ticks: Fraction;
  small?: number;
}

/**
 * A swar (VexFlow `StaveNote`). Pitch decorations are NOT drawn here: the Builder attaches
 * OctaveDot / KomalMark / TivraMark / KhatkaBracket / KanGroup modifiers, and the ModifierContext stacks them.
 */
export class SwarNote extends Note {
  static CATEGORY = 'swar';
  readonly lane = 'swar' as const;
  readonly degree: Degree;
  readonly octave: number;
  readonly komal: boolean;
  readonly tivra: boolean;
  /** font scale (1 = main swar; kan notes are smaller) */
  readonly scale: number;

  constructor(s: SwarStruct) {
    super(s.ticks);
    this.degree = s.degree;
    this.octave = s.octave ?? 0;
    this.komal = !!s.komal;
    this.tivra = !!s.tivra;
    this.scale = s.small ?? 1;
    this.makeGlyph(
      degreeText(this.degree, Tables.style.script),
      'swar',
      Tables.style.fontSize.swar * this.scale,
    );
    this.setData('degree', this.degree)
      .setData('octave', this.octave)
      .setData('variant', this.komal ? 'komal' : this.tivra ? 'tivra' : 'shuddha');
  }
  getFontSize(): number {
    return Tables.style.fontSize.swar * this.scale;
  }
  protected inkColor(): string {
    return Tables.style.ink;
  }
}

/** A kan (grace) swar: a small SwarNote positioned by its KanGroup. Category = BhatkhandeSet `kan_swar`. */
export class KanNote extends SwarNote {
  static CATEGORY = 'kan_swar';
  constructor(s: Omit<SwarStruct, 'ticks'> & { small: number }) {
    super({ ...s, ticks: Fraction.of(0) });
    this.ignoreTicks = true;
  }
}

/** The dash "–" of the swar line: the previous swar is held through this (part of a) matra. Category `swar_rest`. */
export class SwarRest extends Note {
  static CATEGORY = 'swar_rest';
  readonly lane = 'swar' as const;
  constructor(ticks: Fraction) {
    super(ticks);
    this.setData('kind', 'dash');
  }
  protected measureNotePx(): number {
    return Tables.style.fontSize.swar * Tables.style.decor.dashWidth;
  }
  getExtents(): { above: number; below: number } {
    return { above: Tables.style.fontSize.swar * 0.45, below: 0 };
  }
  protected inkColor(): string {
    return Tables.style.ink;
  }
  protected drawNote(): void {
    const ctx = this.checkContext();
    const st = Tables.style,
      x = this.getInkLeft(),
      y = this.getBaselineY() - st.fontSize.swar * 0.36;
    ctx.save().setStrokeStyle(st.ink);
    ctx.line(x, y, x + this.notePx, y, st.decor.dashThickness);
    ctx.restore();
  }
}
