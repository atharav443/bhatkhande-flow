import { BoundingBox } from './boundingbox.js';
import { Registry } from './registry.js';
import type { RenderContext } from '../render/rendercontext.js';
import { defined } from './util.js';

/**
 * Base of everything drawable (VexFlow `Element`).
 * CATEGORY is the element's type name. In this engine the categories ARE the BhatkhandeSet class names
 * (swar, swar_rest, lyric, lyric_rest, kan_swar, octave_dot, komal_mark, tivra_mark, khatka_bracket,
 * grouping_curve, taal_marker, vibhag_line, line_end_bar, ...), so every drawn element is also a label.
 */
export abstract class Element {
  static CATEGORY = 'element';
  private static ID = 1000;
  protected static newID(): string {
    return `bf${Element.ID++}`;
  }
  static resetIDs(): void {
    Element.ID = 1000;
  }

  protected attrs: { id: string; type: string; class: string; [k: string]: string };
  /** extra metadata written as data-* attributes and into label exports */
  protected data: Record<string, string | number> = {};
  private context?: RenderContext;
  protected rendered = false;
  protected boundingBox?: BoundingBox;
  protected registry?: Registry;

  constructor() {
    this.attrs = { id: Element.newID(), type: this.getCategory(), class: '' };
    Registry.getDefaultRegistry()?.register(this);
  }

  getCategory(): string {
    return (this.constructor as typeof Element).CATEGORY;
  }
  getAttribute(name: string): string {
    return this.attrs[name];
  }
  setAttribute(name: string, v: string): this {
    this.attrs[name] = v;
    return this;
  }
  getClasses(): string[] {
    return this.attrs.class ? this.attrs.class.split(' ') : [];
  }
  addClass(c: string): this {
    if (!this.getClasses().includes(c)) {
      this.attrs.class = [...this.getClasses(), c].join(' ');
      this.registry?.onClassAdded(this, c);
    }
    return this;
  }
  setData(k: string, v: string | number): this {
    this.data[k] = v;
    return this;
  }
  getData(): Record<string, string | number> {
    return this.data;
  }
  onRegister(r: Registry): this {
    this.registry = r;
    return this;
  }

  setContext(ctx?: RenderContext): this {
    this.context = ctx;
    return this;
  }
  getContext(): RenderContext | undefined {
    return this.context;
  }
  checkContext(): RenderContext {
    return defined(this.context, 'NoContext', `${this.getCategory()} has no render context`);
  }

  isRendered(): boolean {
    return this.rendered;
  }
  setRendered(v = true): this {
    this.rendered = v;
    return this;
  }
  getBoundingBox(): BoundingBox | undefined {
    return this.boundingBox;
  }

  /** open an SVG group carrying this element's category, id and data (a label for dataset export) */
  protected openGroup(ctx: RenderContext): void {
    const cls = [this.getCategory(), ...this.getClasses()].join(' ');
    ctx.openGroup(cls, this.attrs.id, this.data);
  }

  abstract draw(): void;
}
