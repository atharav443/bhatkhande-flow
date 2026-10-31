import { RenderContext, pathToD } from './rendercontext';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v: number) => String(Math.round(v * 100) / 100);

/** SVG backend producing a string (works in Node and the browser). Groups become <g class=… data-…>. */
export class SVGContext extends RenderContext {
  private out: string[] = [];
  private width = 0;
  private height = 0;
  private background = '#fff';
  private scale = 1;

  resize(width: number, height: number, background = '#fff'): this { this.width = width; this.height = height; this.background = background; return this; }
  setScale(s: number): this { this.scale = s; return this; }

  protected beginGroup(cls: string, id: string, data: Record<string, string | number>): void {
    const extra = Object.entries(data).map(([k, v]) => ` data-${k}="${esc(String(v))}"`).join('');
    this.out.push(`<g class="${esc(cls)}" id="${esc(id)}"${extra}>`);
  }
  protected endGroup(): void { this.out.push('</g>'); }
  protected strokePath(p: (string | number)[][], hw: number): void {
    this.out.push(`<path d="${pathToD(p)}" fill="none" stroke="${this.strokeStyle}" stroke-width="${n(this.lineWidth)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    this.widen(hw);
  }
  protected fillPath(p: (string | number)[][]): void { this.out.push(`<path d="${pathToD(p)}" fill="${this.fillStyle}"/>`); }
  protected fillCircle(cx: number, cy: number, r: number): void { this.out.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${this.fillStyle}"/>`); }
  protected drawGlyphPath(d: string, x: number, y: number): void { this.out.push(`<path transform="translate(${n(x)} ${n(y)})" fill="${this.fillStyle}" d="${d}"/>`); }
  protected drawText(s: string, x: number, y: number, f: { family: string; size: number; weight: number }): void {
    this.out.push(`<text x="${n(x)}" y="${n(y)}" fill="${this.fillStyle}" font-family="${esc(f.family)}" font-size="${n(f.size)}" font-weight="${f.weight}">${esc(s)}</text>`);
  }
  toString(): string {
    const W = this.width * this.scale, H = this.height * this.scale;
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${n(W)}" height="${n(H)}" viewBox="0 0 ${n(this.width)} ${n(this.height)}">`,
      `<rect width="100%" height="100%" fill="${this.background}"/>`,
      ...this.out,
      '</svg>',
    ].join('\n');
  }
}
