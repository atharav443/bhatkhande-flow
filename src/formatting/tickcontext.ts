import type { Fraction } from '../core/fraction.js';
import type { Tickable } from '../notes/tickable.js';

/**
 * Everything that starts at one onset, across voices (VexFlow `TickContext`): the swar and the syllable sung on it.
 * width = widest member; members are centred in the slot, so swar and lyric share a centre line.
 */
export class TickContext {
  protected tickables: Tickable[] = [];
  protected x = 0;
  protected width = 0;
  protected preFormatted = false;
  constructor(readonly onset: Fraction) {}

  addTickable(t: Tickable): this {
    this.tickables.push(t);
    t.setTickContext(this);
    this.preFormatted = false;
    return this;
  }
  getTickables(): Tickable[] {
    return this.tickables;
  }
  preFormat(): this {
    if (this.preFormatted) return this;
    this.width = 0;
    for (const t of this.tickables) {
      t.preFormat();
      this.width = Math.max(this.width, t.getWidth());
    }
    this.preFormatted = true;
    return this;
  }
  getWidth(): number {
    return this.width;
  }
  getX(): number {
    return this.x;
  }
  setX(x: number): this {
    this.x = x;
    return this;
  }
  getCenterX(): number {
    return this.x + this.width / 2;
  }
}
