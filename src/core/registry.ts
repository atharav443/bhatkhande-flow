import type { Element } from './element';

/** Index of elements by id / type / class (VexFlow `Registry`). Enable a default registry to track every element created. */
export class Registry {
  private static defaultRegistry?: Registry;
  static getDefaultRegistry(): Registry | undefined {
    return Registry.defaultRegistry;
  }
  static enableDefaultRegistry(r: Registry): void {
    Registry.defaultRegistry = r;
  }
  static disableDefaultRegistry(): void {
    Registry.defaultRegistry = undefined;
  }

  private byId = new Map<string, Element>();
  private byType = new Map<string, Set<Element>>();
  private byClass = new Map<string, Set<Element>>();

  register(e: Element): this {
    this.byId.set(e.getAttribute('id'), e);
    this.add(this.byType, e.getCategory(), e);
    for (const c of e.getClasses()) this.add(this.byClass, c, e);
    e.onRegister(this);
    return this;
  }
  onClassAdded(e: Element, cls: string): void {
    this.add(this.byClass, cls, e);
  }
  getElementById(id: string): Element | undefined {
    return this.byId.get(id);
  }
  getElementsByType(t: string): Element[] {
    return [...(this.byType.get(t) ?? [])];
  }
  getElementsByClass(c: string): Element[] {
    return [...(this.byClass.get(c) ?? [])];
  }
  clear(): this {
    this.byId.clear();
    this.byType.clear();
    this.byClass.clear();
    return this;
  }
  private add(m: Map<string, Set<Element>>, k: string, e: Element) {
    if (!m.has(k)) m.set(k, new Set());
    m.get(k)!.add(e);
  }
}
