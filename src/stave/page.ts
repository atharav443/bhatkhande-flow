import { Element } from '../core/element.js';
import { Tables } from '../core/tables.js';
import type { TaalDef } from '../music/taal.js';
import { ColumnGrid } from './columngrid.js';
import { TaalStave } from './taalstave.js';
import { SectionHeading, TextLine, Title } from './text.js';
import { Meend } from '../spanners/meend.js';
import { TihaiBracket } from '../spanners/tihai.js';

export interface PageSection {
  heading?: string;
  gridStart: number;
  staves: TaalStave[];
}
export interface PageHeader {
  title?: string;
  subtitle?: string;
  label?: string;
  right?: string;
  text?: string[];
}

/**
 * The page (VexFlow `System` + the score layout around it). Like a System running ONE formatter over all staves,
 * the page computes ONE matra width for every row, so the vibhag bars of all rows line up.
 */
export class Page extends Element {
  static CATEGORY = 'page';
  protected spanners: Element[] = [];
  protected items: Element[] = [];
  width = 0;
  height = 0;
  constructor(
    readonly taal: TaalDef,
    readonly header: PageHeader,
    readonly sections: PageSection[],
  ) {
    super();
  }

  addSpanner(e: Element): this {
    this.spanners.push(e);
    return this;
  }
  allStaves(): TaalStave[] {
    return this.sections.flatMap((s) => s.staves);
  }

  format(): this {
    const st = Tables.style,
      M = st.spacing.margin;
    const staves = this.allStaves();
    // 1. measure every row (joinVoices, tick contexts, min widths)
    staves.forEach((s) => s.preFormat());
    // 2. one page-wide matra width
    const mw =
      Math.max(st.fontSize.swar * 1.25, ...staves.map((s) => s.getMaxMatraWidth())) + 2 * st.spacing.matraPad;
    const grids = this.sections.map(
      (sec) => new ColumnGrid(this.taal, sec.gridStart, mw, st.spacing.vibhagGap, M),
    );
    this.sections.forEach((sec, i) => sec.staves.forEach((s) => s.formatX(grids[i])));
    const gridW = grids[0]?.width() ?? 0;
    // 3. spanners reserve lanes on the rows they touch
    for (const sp of this.spanners) {
      if (sp instanceof Meend) sp.staves.forEach((s) => s.reserveLane('meend', st.meend.lane));
      if (sp instanceof TihaiBracket) sp.staves.forEach((s) => s.reserveLane('tihai', st.tihai.lane));
    }
    // 4. header + rows, top to bottom
    this.items = [];
    const pageW = gridW + 2 * M;
    let y = M;
    const h = this.header;
    if (h.title || h.label || h.right) {
      const t = h.title ? new Title(h.title, 'title', st.fontSize.title) : undefined;
      const l = h.label ? new TextLine(h.label, 'subtitle', st.fontSize.label) : undefined;
      const r = h.right ? new TextLine(h.right, 'subtitle', st.fontSize.label) : undefined;
      const above = Math.max(t?.above ?? 0, l?.above ?? 0, r?.above ?? 0),
        below = Math.max(t?.below ?? 0, l?.below ?? 0, r?.below ?? 0);
      const base = y + above;
      if (t) this.items.push(t.at((pageW - t.width) / 2, base));
      if (l) this.items.push(l.at(M, base));
      if (r) this.items.push(r.at(pageW - M - r.width, base));
      y = base + below + 10;
    }
    if (h.subtitle) {
      const s = new Title(h.subtitle, 'subtitle', st.fontSize.subtitle);
      this.items.push(s.at((pageW - s.width) / 2, y + s.above));
      y += s.above + s.below + 12;
    }
    if (h.text?.length) {
      const lines = h.text.map((t) => new TextLine(t, 'subtitle', st.fontSize.text));
      const w = Math.max(...lines.map((l) => l.width));
      for (const l of lines) {
        this.items.push(l.at((pageW - w) / 2, y + l.above));
        y += st.fontSize.text * 1.5;
      }
      y += 6;
    }
    const nominal = TaalStave.nominalMetrics();
    this.sections.forEach((sec) => {
      y += st.spacing.sectionGap;
      if (sec.heading) {
        const hd = new SectionHeading(sec.heading, 'section', st.fontSize.heading);
        this.items.push(hd.at((pageW - hd.width) / 2, y + hd.above));
        y += hd.above + hd.below + st.spacing.headingGap;
      }
      sec.staves.forEach((s) => {
        s.formatY(y, nominal);
        y += s.getHeight() + st.spacing.rowGap;
      });
    });
    this.width = pageW;
    this.height = y - st.spacing.rowGap + M;
    return this;
  }

  draw(): void {
    const ctx = this.checkContext();
    for (const i of this.items) i.setContext(ctx).draw();
    for (const s of this.allStaves()) s.setContext(ctx).draw();
    for (const sp of this.spanners) sp.setContext(ctx).draw();
    this.setRendered();
  }
}
