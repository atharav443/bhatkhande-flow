import { Element } from '../core/element';
import { Fraction, ZERO } from '../core/fraction';
import { RuntimeError } from '../core/util';
import type { Tickable } from './tickable';
import type { TaalStave } from '../stave/taalstave';
import { Note } from './note';

export enum VoiceMode { STRICT = 1, SOFT = 2 }

/**
 * A sequence of tickables against a time budget (VexFlow `Voice`). The budget here is the number of matras on the
 * line. STRICT = must be filled exactly; SOFT = may be shorter (pickup / last line).
 */
export class Voice extends Element {
  static CATEGORY = 'voice';
  protected tickables: Tickable[] = [];
  protected ticksUsed: Fraction = ZERO;
  protected stave?: TaalStave;
  constructor(readonly totalTicks: Fraction, protected mode: VoiceMode = VoiceMode.SOFT) { super(); }

  addTickable(t: Tickable): this {
    if (!t.shouldIgnoreTicks()) {
      const next = this.ticksUsed.add(t.getTicks());
      if (next.gt(this.totalTicks)) throw new RuntimeError('TooManyTicks', `voice exceeds ${this.totalTicks.toString()} matras`);
      this.ticksUsed = next;
    }
    this.tickables.push(t);
    t.setVoice(this);
    return this;
  }
  addTickables(ts: Tickable[]): this { ts.forEach((t) => this.addTickable(t)); return this; }
  getTickables(): Tickable[] { return this.tickables; }
  getTicksUsed(): Fraction { return this.ticksUsed; }
  isComplete(): boolean { return this.mode === VoiceMode.SOFT || this.ticksUsed.eq(this.totalTicks); }
  setStave(s: TaalStave): this { this.stave = s; for (const t of this.tickables) if (t instanceof Note) t.setStave(s); return this; }
  getStave(): TaalStave | undefined { return this.stave; }
  draw(): void {
    const ctx = this.checkContext();
    for (const t of this.tickables) t.setContext(ctx).draw();
    this.setRendered();
  }
}
