import { Tables } from '../core/tables';
import { Modifier, ModifierPosition } from './modifier';
import { ModifierContext, type ModifierContextState } from './modifiercontext';
import type { KanNote } from '../notes/swarnote';

/**
 * Kan swar(s) of a note (VexFlow `GraceNoteGroup`): a modifier that owns small notes and formats them itself.
 * Bhatkhande prints the kan as a small swar written ABOVE the main swar, starting at its left edge, on a line of
 * its own (the stave's kan lane). A kan may carry its own KanGroup (kan-inside-kan), placed above it the same way.
 */
export class KanGroup extends Modifier {
  static CATEGORY = 'kan_group';
  protected preFormatted = false;
  constructor(readonly kanNotes: KanNote[]) { super(); this.position = ModifierPosition.ABOVE; }

  static format(groups: KanGroup[], state: ModifierContextState): void {
    for (const g of groups) {
      g.preFormat();
      const host = g.getNote().getGlyph()?.inkWidth ?? 0;
      // a kan wider than its host swar must not run into the next swar's kan
      if (g.width > host) state.right_shift = Math.max(state.right_shift, g.width - host);
    }
  }

  /** like GraceNoteGroup.preFormat: each small note gets its own ModifierContext; the group width is the packed width */
  preFormat(): void {
    if (this.preFormatted) return;
    let w = 0;
    this.kanNotes.forEach((n, i) => {
      n.addToModifierContext(new ModifierContext());
      n.preFormat();
      w += n.getWidth() + (i ? Tables.style.decor.kanGap : 0);
    });
    this.width = w;
    this.preFormatted = true;
  }

  /** px from the kan baseline up to the top of everything in this group (including nested kan) */
  getAbove(): number {
    let a = 0;
    for (const n of this.kanNotes) {
      a = Math.max(a, n.getExtents().above);
      for (const g of n.getModifiersByCategory(KanGroup.CATEGORY) as KanGroup[]) a = Math.max(a, this.nestLift(n) + g.getAbove());
    }
    return a;
  }
  getBelow(): number { return Math.max(0, ...this.kanNotes.map((n) => n.getExtents().below)); }
  private nestLift(n: KanNote): number { return -(n.getGlyph()?.shape.inkTop ?? 0) + Tables.style.decor.kanLift * n.scale; }

  /** position the kan notes: first ink-left at `x`, baseline `y` */
  place(x: number, y: number): void {
    let cx = x;
    for (const n of this.kanNotes) {
      n.setFixedPosition(cx + n.getMetrics().modLeftPx, y);
      for (const g of n.getModifiersByCategory(KanGroup.CATEGORY) as KanGroup[]) g.place(cx, y - this.nestLift(n));
      cx += n.getWidth() + Tables.style.decor.kanGap;
    }
  }

  draw(): void {
    const ctx = this.checkContext();
    const host = this.getNote();
    // top-level kan: kan lane of the stave; nested kan: already placed by its parent group
    if (!(host as any).fixed) this.place(host.getInkLeft(), host.checkStave().getYForLane('kan'));
    for (const n of this.kanNotes) n.setContext(ctx).draw();
    this.setRendered();
  }
}
