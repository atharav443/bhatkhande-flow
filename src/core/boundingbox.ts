/** Axis-aligned box (VexFlow `BoundingBox`). x,y = top-left. */
export class BoundingBox {
  constructor(public x: number, public y: number, public w: number, public h: number) {}
  static fromPoints(x0: number, y0: number, x1: number, y1: number): BoundingBox {
    return new BoundingBox(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  }
  get x1(): number { return this.x + this.w; }
  get y1(): number { return this.y + this.h; }
  clone(): BoundingBox { return new BoundingBox(this.x, this.y, this.w, this.h); }
  move(dx: number, dy: number): this { this.x += dx; this.y += dy; return this; }
  mergeWith(b: BoundingBox): this {
    const x0 = Math.min(this.x, b.x), y0 = Math.min(this.y, b.y), x1 = Math.max(this.x1, b.x1), y1 = Math.max(this.y1, b.y1);
    this.x = x0; this.y = y0; this.w = x1 - x0; this.h = y1 - y0;
    return this;
  }
  toXYXY(): [number, number, number, number] { return [this.x, this.y, this.x1, this.y1]; }
}
