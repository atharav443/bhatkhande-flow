import { Element } from '../core/element';
import { defined } from '../core/util';
import type { Note } from '../notes/note';
import type { Tickable } from '../notes/tickable';
import type { ModifierContext } from './modifiercontext';

export enum ModifierPosition {
  LEFT = 1,
  RIGHT = 2,
  ABOVE = 3,
  BELOW = 4,
}

/**
 * Something attached to a note (VexFlow `Modifier`). Like VexFlow, a modifier never positions itself against
 * its neighbours: its class has a static format(members, state) that the ModifierContext calls in a fixed order,
 * which assigns `textLine` (px outward from the glyph's ink) and grows the shared left/right/top/bottom state.
 */
export abstract class Modifier extends Element {
  static CATEGORY = 'modifier';
  protected note?: Note;
  protected position: ModifierPosition = ModifierPosition.ABOVE;
  /** distance in px from the note's ink edge (top for ABOVE, bottom for BELOW) to this modifier's near edge */
  protected textLine = 0;
  protected width = 0;
  protected modifierContext?: ModifierContext;

  setNote(n: Tickable): this {
    this.note = n as Note;
    return this;
  }
  getNote(): Note {
    return defined(this.note, 'NoNote', `${this.getCategory()} is not attached to a note`);
  }
  getPosition(): ModifierPosition {
    return this.position;
  }
  setPosition(p: ModifierPosition): this {
    this.position = p;
    return this;
  }
  setTextLine(px: number): this {
    this.textLine = px;
    return this;
  }
  getTextLine(): number {
    return this.textLine;
  }
  getWidth(): number {
    return this.width;
  }
  setModifierContext(mc: ModifierContext): this {
    this.modifierContext = mc;
    return this;
  }
}
