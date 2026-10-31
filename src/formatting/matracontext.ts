import { Tables } from '../core/tables';
import type { TickContext } from './tickcontext';

/**
 * NEW (no VexFlow equivalent): the TickContexts inside one matra.
 * Bhatkhande does not space sub-beats proportionally: the events of a matra are written TIGHTLY together
 * (गम, पनी, -रे) and the cluster is centred in the matra's column, with a grouping curve underneath.
 */
export class MatraContext {
  constructor(readonly index: number, readonly ticks: TickContext[]) {}
  /** packed width of the cluster */
  getWidth(): number {
    const g = Tables.style.spacing.clusterGap;
    return this.ticks.reduce((a, t, i) => a + t.getWidth() + (i ? g : 0), 0);
  }
  /** centre the packed cluster in [colX, colX + colW] */
  place(colX: number, colW: number): void {
    const g = Tables.style.spacing.clusterGap;
    let x = colX + (colW - this.getWidth()) / 2;
    for (const t of this.ticks) { t.setX(x); x += t.getWidth() + g; }
  }
}
