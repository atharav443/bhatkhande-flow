import { Element } from '../core/element.js';
import { Fraction } from '../core/fraction.js';
import { defined } from '../core/util.js';
import type { Modifier } from '../modifiers/modifier.js';
import type { ModifierContext } from '../modifiers/modifiercontext.js';
import type { TickContext } from '../formatting/tickcontext.js';
import type { Voice } from './voice.js';

export interface TickableMetrics {
  /** total width the formatter must reserve: modLeft + notePx + modRight */
  width: number;
  /** width of the glyph itself */
  notePx: number;
  modLeftPx: number;
  modRightPx: number;
}

/**
 * Something that occupies time (VexFlow `Tickable`). Ticks are exact rationals in MATRAS (1 = one beat).
 * Width is computed in preFormat() from the glyph and the ModifierContext's left/right shift;
 * x comes from the TickContext the Formatter assigns.
 */
export abstract class Tickable extends Element {
  static CATEGORY = 'tickable';
  protected ticks: Fraction;
  protected width = 0;
  protected notePx = 0;
  protected x_shift = 0;
  protected modifiers: Modifier[] = [];
  protected modifierContext?: ModifierContext;
  protected tickContext?: TickContext;
  protected voice?: Voice;
  protected ignoreTicks = false;
  protected preFormatted = false;

  constructor(ticks: Fraction) {
    super();
    this.ticks = ticks;
  }

  getTicks(): Fraction {
    return this.ticks;
  }
  shouldIgnoreTicks(): boolean {
    return this.ignoreTicks;
  }
  setVoice(v: Voice): this {
    this.voice = v;
    return this;
  }
  getVoice(): Voice {
    return defined(this.voice, 'NoVoice', 'Tickable has no voice');
  }

  addModifier(m: Modifier): this {
    m.setNote(this);
    this.modifiers.push(m);
    this.preFormatted = false;
    return this;
  }
  getModifiers(): Modifier[] {
    return this.modifiers;
  }
  getModifiersByCategory(cat: string): Modifier[] {
    return this.modifiers.filter((m) => m.getCategory() === cat);
  }

  addToModifierContext(mc: ModifierContext): this {
    this.modifierContext = mc;
    for (const m of this.modifiers) mc.addMember(m);
    mc.addMember(this);
    this.preFormatted = false;
    return this;
  }
  setModifierContext(mc: ModifierContext): this {
    this.modifierContext = mc;
    return this;
  }
  getModifierContext(): ModifierContext | undefined {
    return this.modifierContext;
  }

  setTickContext(tc: TickContext): this {
    this.tickContext = tc;
    this.preFormatted = false;
    return this;
  }
  getTickContext(): TickContext {
    return defined(this.tickContext, 'NoTickContext', `${this.getCategory()} has no tick context`);
  }
  hasTickContext(): boolean {
    return !!this.tickContext;
  }

  /** measure: glyph width + modifier shifts */
  preFormat(): void {
    if (this.preFormatted) return;
    this.notePx = this.measureNotePx();
    let l = 0,
      r = 0;
    if (this.modifierContext) {
      this.modifierContext.preFormat();
      l = this.modifierContext.getLeftShift();
      r = this.modifierContext.getRightShift();
    }
    this.width = l + this.notePx + r;
    this.preFormatted = true;
  }
  protected abstract measureNotePx(): number;

  getWidth(): number {
    return this.width;
  }
  getMetrics(): TickableMetrics {
    const l = this.modifierContext?.getLeftShift() ?? 0,
      r = this.modifierContext?.getRightShift() ?? 0;
    return { width: this.width, notePx: this.notePx, modLeftPx: l, modRightPx: r };
  }

  /** left edge of this tickable's reserved space: it is centred in its TickContext slot */
  getX(): number {
    const tc = this.getTickContext();
    return tc.getX() + (tc.getWidth() - this.width) / 2 + this.x_shift;
  }
  /** left edge of the glyph itself (after left modifiers) */
  getNoteX(): number {
    return this.getX() + this.getMetrics().modLeftPx;
  }
}
