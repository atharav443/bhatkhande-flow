import { Element } from '../core/element.js';
import { Tables } from '../core/tables.js';
import { RuntimeError } from '../core/util.js';
import { Formatter } from '../formatting/formatter.js';
import type { Voice } from '../notes/voice.js';
import type { ColumnGrid } from './columngrid.js';

import { buildDecorations } from './staveDecorations.js';
import { measureRowExtents, nominalMetrics } from './staveMetrics.js';
import type { Lane, NominalMetrics, StaveMatra } from './staveTypes.js';

export type { Lane, NominalMetrics, StaveMatra } from './staveTypes.js';

/**
 * One printed row = (part of) one taal cycle (VexFlow `Stave`). The stave owns y: it stacks the lanes
 *   meend · tihai · kan · SWAR · grouping curve · LYRIC · lyric curve · MARKER
 * sized from what is actually in the row, and owns its bars and taal markers. x comes from the page grid.
 */
export class TaalStave extends Element {
  static CATEGORY = 'taal_stave';
  protected voices: Voice[] = [];
  protected formatter = new Formatter();
  protected y = 0;
  protected lanes: Partial<Record<Lane, number>> = {};
  protected reserved: Partial<Record<'meend' | 'tihai', number>> = {};
  protected height = 0;
  protected barTop = 0;
  protected barBottom = 0;
  protected children: Element[] = [];
  protected grid?: ColumnGrid;
  /** lanes needing room below swar / lyric for grouping curves */
  hasSwarCurves = false;
  hasLyricCurves = false;

  constructor(
    readonly matras: StaveMatra[],
    readonly hasLyricLine: boolean,
  ) {
    super();
  }

  addVoice(v: Voice): this {
    v.setStave(this);
    this.voices.push(v);
    return this;
  }
  getVoices(): Voice[] {
    return this.voices;
  }
  getFormatter(): Formatter {
    return this.formatter;
  }
  reserveLane(l: 'meend' | 'tihai', h: number): this {
    this.reserved[l] = Math.max(this.reserved[l] ?? 0, h);
    return this;
  }

  /** step 1 (VexFlow Formatter.joinVoices + createTickContexts + preFormat) */
  preFormat(): this {
    this.formatter.joinVoices(this.voices).createTickContexts(this.voices).preFormat();
    return this;
  }
  getMaxMatraWidth(): number {
    return this.formatter.getMaxMatraWidth();
  }

  /** step 2: x from the shared page grid */
  formatX(grid: ColumnGrid): this {
    this.grid = grid;
    this.formatter.formatToColumns((i) => {
      const m = this.matras[i];
      if (!m) throw new RuntimeError('MatraIndex', `no matra ${i} in row`);
      return { x: grid.x(m.col), w: grid.matraWidth };
    });
    return this;
  }

  /** step 3: lanes (VexFlow getYForLine) */
  formatY(y: number, nominal: NominalMetrics): this {
    const st = Tables.style;
    this.y = y;
    const ext = measureRowExtents(this.voices, nominal);
    let cur = y;
    if (this.matras.some((m) => m.volta)) {
      this.lanes.volta = cur + 2;
      cur += st.volta.lane;
    }
    if (this.reserved.meend) {
      this.lanes.meend = cur + this.reserved.meend;
      cur += this.reserved.meend;
    }
    if (this.reserved.tihai) {
      this.lanes.tihai = cur + this.reserved.tihai - 2;
      cur += this.reserved.tihai;
    }
    if (ext.kanAbove > 0) {
      this.lanes.kan = cur + ext.kanAbove;
      cur = this.lanes.kan + ext.kanBelow + st.decor.kanLift;
    }
    this.lanes.swar = cur + ext.swarAbove;
    cur = this.lanes.swar + ext.swarBelow;
    this.barTop = this.lanes.swar - nominal.swarAbove - st.bar.overshoot;
    if (this.hasSwarCurves) cur += st.curve.gap + st.curve.depth;
    if (this.hasLyricLine) {
      this.lanes.lyric = cur + st.spacing.swarToLyric + ext.lyricAbove;
      cur = this.lanes.lyric + ext.lyricBelow;
      this.barBottom = this.lanes.lyric + nominal.lyricBelow + st.bar.overshoot;
      if (this.hasLyricCurves) cur += st.curve.gap + st.curve.depth + 3;
    } else {
      this.barBottom = this.lanes.swar + nominal.swarBelow + st.bar.overshoot;
    }
    this.lanes.marker =
      cur +
      st.spacing.lyricToMarker +
      (this.hasLyricLine ? 0 : st.spacing.lyricToMarker) +
      nominal.markerAbove;
    const hasMarker = this.matras.some((m) => m.marker);
    cur = hasMarker ? this.lanes.marker + nominal.markerBelow : cur;
    this.height = cur - y;
    this.children = buildDecorations({
      matras: this.matras,
      grid: this.grid!,
      formatter: this.formatter,
      lanes: this.lanes,
      barTop: this.barTop,
      barBottom: this.barBottom,
    });
    return this;
  }

  getYForLane(lane: Lane): number {
    const v = this.lanes[lane];
    if (v === undefined) throw new RuntimeError('NoLane', `row has no ${lane} lane (did formatY run?)`);
    return v;
  }
  hasLane(lane: Lane): boolean {
    return this.lanes[lane] !== undefined;
  }
  getHeight(): number {
    return this.height;
  }
  getY(): number {
    return this.y;
  }
  /** horizontal extent of the row (used by partial spanners crossing a row edge) */
  getLeftX(): number {
    const g = this.grid!;
    return g.x(this.matras[0].col);
  }
  getRightX(): number {
    const g = this.grid!;
    const c = this.matras[this.matras.length - 1].col;
    return g.x(c) + g.matraWidth;
  }

  draw(): void {
    const ctx = this.checkContext();
    for (const c of this.children) c.setContext(ctx).draw();
    for (const v of this.voices) v.setContext(ctx).draw();
    this.setRendered();
  }

  /** nominal line metrics so every row of a page uses the same baseline spacing */
  static nominalMetrics = nominalMetrics;
}
