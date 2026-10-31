import type { Fraction } from '../core/fraction.js';
import { Note } from './note.js';
import type { Lane } from '../stave/taalstave.js';

/** Invisible time filler (VexFlow `GhostNote`): keeps voices aligned where nothing is printed. */
export class GhostNote extends Note {
  static CATEGORY = 'ghost';
  constructor(
    ticks: Fraction,
    readonly lane: Lane = 'swar',
  ) {
    super(ticks);
  }
  protected measureNotePx(): number {
    return 0;
  }
  getExtents() {
    return { above: 0, below: 0 };
  }
  draw(): void {
    this.setRendered();
  }
}
