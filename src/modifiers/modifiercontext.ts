import type { Modifier } from './modifier.js';
import type { Tickable } from '../notes/tickable.js';
import { KhatkaBracket } from './khatkabracket.js';
import { KomalMark } from './komalmark.js';
import { TivraMark } from './tivramark.js';
import { OctaveDot } from './octavedot.js';
import { KanGroup } from './kangroup.js';

export interface ModifierContextState {
  left_shift: number;
  right_shift: number;
  /** px stacked above the glyph's ink top so far */
  top_px: number;
  /** px stacked below the glyph's ink bottom so far */
  bottom_px: number;
}
type Member = Modifier | Tickable;

/**
 * All modifiers of the note(s) at one onset (VexFlow `ModifierContext`). preFormat() runs each modifier class's
 * static format() in a FIXED ORDER; the order is the Bhatkhande stacking order, inner to outer:
 *   khatka brackets (sides) -> komal bar (below) -> tivra stroke (above) -> saptak dots (above/below) -> kan (above, own lane)
 */
export class ModifierContext {
  protected state: ModifierContextState = { left_shift: 0, right_shift: 0, top_px: 0, bottom_px: 0 };
  protected members: Record<string, Member[]> = {};
  protected preFormatted = false;

  addMember(m: Member): this {
    const c = m.getCategory();
    (this.members[c] ??= []).push(m);
    m.setModifierContext(this);
    this.preFormatted = false;
    return this;
  }
  getMembers(category: string): Member[] {
    return this.members[category] ?? [];
  }

  preFormat(): void {
    if (this.preFormatted) return;
    const s = this.state;
    KhatkaBracket.format(this.getMembers(KhatkaBracket.CATEGORY) as KhatkaBracket[], s);
    KomalMark.format(this.getMembers(KomalMark.CATEGORY) as KomalMark[], s);
    TivraMark.format(this.getMembers(TivraMark.CATEGORY) as TivraMark[], s);
    OctaveDot.format(this.getMembers(OctaveDot.CATEGORY) as OctaveDot[], s);
    KanGroup.format(this.getMembers(KanGroup.CATEGORY) as KanGroup[], s);
    this.preFormatted = true;
  }
  getLeftShift(): number {
    return this.state.left_shift;
  }
  getRightShift(): number {
    return this.state.right_shift;
  }
  getTopPx(): number {
    return this.state.top_px;
  }
  getBottomPx(): number {
    return this.state.bottom_px;
  }
  getState(): ModifierContextState {
    return this.state;
  }
}
