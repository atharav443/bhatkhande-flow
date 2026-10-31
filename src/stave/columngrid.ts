import type { TaalDef } from '../music/taal';

/**
 * The page-wide matra grid. Bhatkhande pages are TABLES: every matra column has the same width and every row
 * starts at the same cycle position, so vibhag bars line up from row to row. A row that starts mid-cycle
 * (a pickup) simply occupies the columns of its cycle positions, which right-aligns it.
 */
export class ColumnGrid {
  constructor(
    readonly taal: TaalDef,
    /** cycle position (1-based) of column 0 */
    readonly startPos: number,
    readonly matraWidth: number,
    readonly vibhagGap: number,
    readonly left: number,
  ) {}
  get columns(): number { return this.taal.total; }
  posOf(col: number): number { return ((this.startPos - 1 + col) % this.taal.total) + 1; }
  colOf(pos: number): number { return (((pos - this.startPos) % this.taal.total) + this.taal.total) % this.taal.total; }
  /** a bar stands BEFORE column `col` when that column starts a vibhag (never before column 0: rows have no opening bar) */
  barBefore(col: number): boolean { return col > 0 && this.taal.starts.includes(this.posOf(col)); }
  barsUpTo(col: number): number { let n = 0; for (let c = 1; c <= col; c++) if (this.barBefore(c)) n++; return n; }
  x(col: number): number { return this.left + col * this.matraWidth + this.barsUpTo(col) * this.vibhagGap; }
  /** x of the bar standing before `col` */
  barX(col: number): number { return this.x(col) - this.vibhagGap / 2; }
  /** x of the bar after the last column */
  endBarX(): number { return this.x(this.columns - 1) + this.matraWidth + this.vibhagGap / 2; }
  width(): number { return this.endBarX() + this.vibhagGap / 2 - this.left; }
}
