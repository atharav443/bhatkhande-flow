import { Element } from '../core/element';
import { Glyph } from '../core/glyph';
import { Tables } from '../core/tables';
import { RuntimeError } from '../core/util';
import { DEGREES, degreeText } from '../music/swar';
import { Formatter } from '../formatting/formatter';
import { KanGroup } from '../modifiers/kangroup';
import { Note } from '../notes/note';
import type { Voice } from '../notes/voice';
import { LineEndBar, VibhagLine } from './barlines';
import type { ColumnGrid } from './columngrid';
import { TaalMarker } from './taalmarker';
import { RepeatBar, RepeatType } from './repeatbar';
import { Volta, VoltaType } from './volta';

export type Lane = 'volta' | 'meend' | 'tihai' | 'kan' | 'swar' | 'lyric' | 'marker';

/** One matra of this row: its cycle position, the derived taal marker (if it starts a vibhag) and its column. */
export interface StaveMatra {
  pos: number;
  marker?: string;
  col: number;
  id: string;
  /** alternate ending this matra belongs to, and whether the ending's bracket starts / ends / is closed here */
  volta?: string;
  voltaStart?: boolean;
  voltaEnd?: boolean;
  voltaClosed?: boolean;
  repeatBefore?: boolean;
  repeatAfter?: boolean;
}

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
  formatY(
    y: number,
    nominal: {
      swarAbove: number;
      swarBelow: number;
      lyricAbove: number;
      lyricBelow: number;
      markerAbove: number;
      markerBelow: number;
    },
  ): this {
    const st = Tables.style;
    this.y = y;
    let above = nominal.swarAbove,
      below = nominal.swarBelow,
      kanAbove = 0,
      kanBelow = 0,
      lyrAbove = nominal.lyricAbove,
      lyrBelow = nominal.lyricBelow;
    for (const v of this.voices)
      for (const t of v.getTickables()) {
        if (!(t instanceof Note)) continue;
        const e = t.getExtents();
        if (t.lane === 'swar') {
          above = Math.max(above, e.above);
          below = Math.max(below, e.below);
          for (const g of t.getModifiersByCategory(KanGroup.CATEGORY) as KanGroup[]) {
            kanAbove = Math.max(kanAbove, g.getAbove());
            kanBelow = Math.max(kanBelow, g.getBelow());
          }
        } else if (t.lane === 'lyric') {
          lyrAbove = Math.max(lyrAbove, e.above);
          lyrBelow = Math.max(lyrBelow, e.below);
        }
      }
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
    if (kanAbove > 0) {
      this.lanes.kan = cur + kanAbove;
      cur = this.lanes.kan + kanBelow + st.decor.kanLift;
    }
    this.lanes.swar = cur + above;
    cur = this.lanes.swar + below;
    this.barTop = this.lanes.swar - nominal.swarAbove - st.bar.overshoot;
    if (this.hasSwarCurves) cur += st.curve.gap + st.curve.depth;
    if (this.hasLyricLine) {
      this.lanes.lyric = cur + st.spacing.swarToLyric + lyrAbove;
      cur = this.lanes.lyric + lyrBelow;
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
    this.buildDecorations();
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

  /** bars and taal markers (VexFlow: Barline / StaveText stave modifiers) */
  protected buildDecorations(): void {
    const g = this.grid!;
    this.children = [];
    const first = this.matras[0];
    if (first.repeatBefore)
      this.children.push(
        new RepeatBar(RepeatType.BEGIN, g.x(first.col) - g.vibhagGap / 2 - 7, this.barTop, this.barBottom),
      );
    this.matras.forEach((m, i) => {
      const prev = this.matras[i - 1];
      if (i > 0 && g.barBefore(m.col)) {
        const end = !!prev.repeatAfter,
          begin = !!m.repeatBefore;
        if (end || begin)
          this.children.push(
            new RepeatBar(
              end && begin ? RepeatType.BOTH : end ? RepeatType.END : RepeatType.BEGIN,
              g.barX(m.col),
              this.barTop,
              this.barBottom,
            ),
          );
        else
          this.children.push(
            new VibhagLine(g.barX(m.col), this.barTop, this.barBottom).setData('before_matra', m.pos),
          );
      }
      if (m.marker) {
        const mc = this.formatter.getMatraContext(i);
        const first = mc?.ticks[0];
        const cx = first ? first.getCenterX() : g.x(m.col) + g.matraWidth / 2;
        this.children.push(new TaalMarker(m.marker, cx, this.lanes.marker!).setData('matra_number', m.pos));
      }
    });
    const last = this.matras[this.matras.length - 1];
    if (last.repeatAfter)
      this.children.push(
        new RepeatBar(
          RepeatType.END,
          g.x(last.col) + g.matraWidth + g.vibhagGap / 2,
          this.barTop,
          this.barBottom,
        ),
      );
    else if (last.col === g.columns - 1)
      this.children.push(new LineEndBar(g.endBarX(), this.barTop, this.barBottom));
    // volta brackets: one piece per run of matras with the same ending label (BEGIN/MID/END like VexFlow)
    for (let i = 0; i < this.matras.length;) {
      const lab = this.matras[i].volta;
      if (!lab) {
        i++;
        continue;
      }
      let j = i;
      while (j + 1 < this.matras.length && this.matras[j + 1].volta === lab) j++;
      const a = this.matras[i],
        b = this.matras[j];
      const begins = !!a.voltaStart,
        ends = !!b.voltaEnd && !!b.voltaClosed;
      const type =
        begins && ends
          ? VoltaType.BEGIN_END
          : begins
            ? VoltaType.BEGIN
            : ends
              ? VoltaType.END
              : VoltaType.MID;
      const x0 = g.x(a.col) - g.vibhagGap / 2 + 1,
        x1 = g.x(b.col) + g.matraWidth + g.vibhagGap / 2 - 1;
      this.children.push(new Volta(type, lab, x0, x1, this.lanes.volta!));
      i = j + 1;
    }
  }

  draw(): void {
    const ctx = this.checkContext();
    for (const c of this.children) c.setContext(ctx).draw();
    for (const v of this.voices) v.setContext(ctx).draw();
    this.setRendered();
  }

  /** nominal line metrics so every row of a page uses the same baseline spacing */
  static nominalMetrics(): {
    swarAbove: number;
    swarBelow: number;
    lyricAbove: number;
    lyricBelow: number;
    markerAbove: number;
    markerBelow: number;
  } {
    const st = Tables.style;
    const sw = DEGREES.map((d) => new Glyph(degreeText(d, st.script), 'swar', st.fontSize.swar).shape);
    const ly = new Glyph('सकीमुऽ', 'lyric', st.fontSize.lyric).shape;
    const mk = new Glyph('×०२३', 'marker', st.fontSize.marker).shape;
    return {
      swarAbove: Math.max(...sw.map((s) => -s.inkTop)),
      swarBelow: Math.max(0, ...sw.map((s) => s.inkBottom)),
      lyricAbove: -ly.inkTop,
      lyricBelow: Math.max(0, ly.inkBottom),
      markerAbove: -mk.inkTop,
      markerBelow: Math.max(0, mk.inkBottom),
    };
  }
}
