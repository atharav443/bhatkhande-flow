import { BoundingBox } from '../core/boundingbox';

export interface GroupRecord {
  cls: string;
  id: string;
  data: Record<string, string | number>;
  bbox?: BoundingBox;
  parent?: number;
}

/**
 * Abstract drawing API (VexFlow `RenderContext`): a canvas-like path API plus groups.
 * Every backend inherits the extent tracking below, so after drawing the context knows the ink box of
 * every group. Groups carry the element category, which makes dataset label export a by-product of drawing.
 */
export abstract class RenderContext {
  protected groups: GroupRecord[] = [];
  private open: number[] = [];
  protected fillStyle = '#000';
  protected strokeStyle = '#000';
  protected lineWidth = 1;
  private stack: { fillStyle: string; strokeStyle: string; lineWidth: number }[] = [];
  private pen = { x: 0, y: 0 };

  // ---- groups
  openGroup(cls: string, id: string, data: Record<string, string | number> = {}): void {
    this.groups.push({ cls, id, data, parent: this.open[this.open.length - 1] });
    this.open.push(this.groups.length - 1);
    this.beginGroup(cls, id, data);
  }
  closeGroup(): void {
    this.open.pop();
    this.endGroup();
  }
  getGroups(): GroupRecord[] {
    return this.groups;
  }

  // ---- state
  setFillStyle(c: string): this {
    this.fillStyle = c;
    return this;
  }
  setStrokeStyle(c: string): this {
    this.strokeStyle = c;
    return this;
  }
  setLineWidth(w: number): this {
    this.lineWidth = w;
    return this;
  }
  save(): this {
    this.stack.push({ fillStyle: this.fillStyle, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth });
    return this;
  }
  restore(): this {
    const s = this.stack.pop();
    if (s) {
      this.fillStyle = s.fillStyle;
      this.strokeStyle = s.strokeStyle;
      this.lineWidth = s.lineWidth;
    }
    return this;
  }

  // ---- path API (records extents, delegates to backend)
  beginPath(): this {
    this.path = [];
    return this;
  }
  moveTo(x: number, y: number): this {
    this.path.push(['M', x, y]);
    this.pen = { x, y };
    this.extend(x, y);
    return this;
  }
  lineTo(x: number, y: number): this {
    this.path.push(['L', x, y]);
    this.pen = { x, y };
    this.extend(x, y);
    return this;
  }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): this {
    const p0 = this.pen;
    for (let i = 1; i <= 8; i++) {
      const t = i / 8,
        a = (1 - t) ** 2,
        b = 2 * (1 - t) * t,
        c = t * t;
      this.extend(a * p0.x + b * cx + c * x, a * p0.y + b * cy + c * y);
    }
    this.path.push(['Q', cx, cy, x, y]);
    this.pen = { x, y };
    return this;
  }
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): this {
    const p0 = this.pen;
    for (let i = 1; i <= 12; i++) {
      const t = i / 12,
        a = (1 - t) ** 3,
        b = 3 * (1 - t) ** 2 * t,
        c = 3 * (1 - t) * t * t,
        d = t ** 3;
      this.extend(a * p0.x + b * c1x + c * c2x + d * x, a * p0.y + b * c1y + c * c2y + d * y);
    }
    this.path.push(['C', c1x, c1y, c2x, c2y, x, y]);
    this.pen = { x, y };
    return this;
  }
  closePath(): this {
    this.path.push(['Z']);
    return this;
  }
  stroke(): this {
    this.strokePath(this.path, this.lineWidth / 2);
    return this;
  }
  fill(): this {
    this.fillPath(this.path);
    return this;
  }
  /** convenience: a stroked straight line */
  line(x1: number, y1: number, x2: number, y2: number, width = this.lineWidth): this {
    const w = this.lineWidth;
    this.lineWidth = width;
    this.beginPath().moveTo(x1, y1).lineTo(x2, y2);
    this.strokePath(this.path, width / 2);
    this.lineWidth = w;
    return this;
  }
  circle(cx: number, cy: number, r: number): this {
    this.extendBox(new BoundingBox(cx - r, cy - r, 2 * r, 2 * r));
    this.fillCircle(cx, cy, r);
    return this;
  }
  /** an outline glyph: SVG path data in coordinates relative to (x, y), with its known ink box */
  glyph(pathD: string, x: number, y: number, ink: BoundingBox): this {
    this.extendBox(ink);
    this.drawGlyphPath(pathD, x, y);
    return this;
  }
  /** text drawn by the backend's own font engine (canvas-metrics mode) */
  text(
    s: string,
    x: number,
    y: number,
    font: { family: string; size: number; weight: number },
    ink: BoundingBox,
  ): this {
    this.extendBox(ink);
    this.drawText(s, x, y, font);
    return this;
  }

  // ---- extent tracking
  protected path: (string | number)[][] = [];
  private extend(x: number, y: number) {
    this.extendBox(new BoundingBox(x, y, 0, 0));
  }
  protected extendBox(b: BoundingBox) {
    const pad = 0;
    for (const gi of this.open) {
      const g = this.groups[gi];
      const bb = b.clone();
      if (pad) {
        bb.x -= pad;
        bb.y -= pad;
        bb.w += 2 * pad;
        bb.h += 2 * pad;
      }
      g.bbox = g.bbox ? g.bbox.mergeWith(bb) : bb;
    }
  }
  /** widen the open groups' boxes by half the stroke width (call after stroking) */
  protected widen(hw: number) {
    for (const gi of this.open) {
      const g = this.groups[gi];
      if (g.bbox) {
        g.bbox.x -= hw;
        g.bbox.y -= hw;
        g.bbox.w += 2 * hw;
        g.bbox.h += 2 * hw;
      }
    }
  }

  // ---- backend hooks
  protected abstract beginGroup(cls: string, id: string, data: Record<string, string | number>): void;
  protected abstract endGroup(): void;
  protected abstract strokePath(path: (string | number)[][], halfWidth: number): void;
  protected abstract fillPath(path: (string | number)[][]): void;
  protected abstract fillCircle(cx: number, cy: number, r: number): void;
  protected abstract drawGlyphPath(d: string, x: number, y: number): void;
  protected abstract drawText(
    s: string,
    x: number,
    y: number,
    font: { family: string; size: number; weight: number },
  ): void;
  abstract resize(width: number, height: number, background?: string): this;
}

export const pathToD = (p: (string | number)[][]) =>
  p
    .map(
      (c) =>
        c[0] +
        c
          .slice(1)
          .map((v) => String(Math.round((v as number) * 100) / 100))
          .join(' '),
    )
    .join('');
