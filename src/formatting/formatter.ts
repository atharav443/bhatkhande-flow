import { ZERO, type Fraction } from '../core/fraction';
import { RuntimeError } from '../core/util';
import { ModifierContext } from '../modifiers/modifiercontext';
import type { Voice } from '../notes/voice';
import { TickContext } from './tickcontext';
import { MatraContext } from './matracontext';

/**
 * VexFlow's `Formatter`, kept where Bhatkhande agrees and changed where it does not:
 *   joinVoices        -> one ModifierContext per onset (same as VexFlow)
 *   createTickContexts-> one TickContext per onset across the swar + lyric voices (same)
 *   preFormat         -> minimum widths (same)
 *   createMatraContexts / formatToColumns -> REPLACES softmax justification and tune():
 *                        every matra gets the same column width (page-wide grid) and its events are packed and centred.
 */
export class Formatter {
  protected tickContexts = new Map<string, TickContext>();
  protected tickList: TickContext[] = [];
  protected matraContexts: MatraContext[] = [];
  protected voices: Voice[] = [];

  joinVoices(voices: Voice[]): this {
    const map = new Map<string, ModifierContext>();
    for (const v of voices) {
      let t: Fraction | undefined;
      for (const tk of v.getTickables()) {
        const onset = t ?? ZERO;
        const key = onset.toString();
        if (!map.has(key)) map.set(key, new ModifierContext());
        tk.addToModifierContext(map.get(key)!);
        t = onset.add(tk.getTicks());
      }
    }
    return this;
  }

  createTickContexts(voices: Voice[]): this {
    this.voices = voices;
    for (const v of voices) {
      let onset: Fraction | undefined;
      for (const tk of v.getTickables()) {
        const on = onset ?? ZERO;
        const key = on.toString();
        if (!this.tickContexts.has(key)) this.tickContexts.set(key, new TickContext(on));
        this.tickContexts.get(key)!.addTickable(tk);
        onset = on.add(tk.getTicks());
      }
    }
    this.tickList = [...this.tickContexts.values()].sort((a, b) => a.onset.cmp(b.onset));
    return this;
  }

  preFormat(): this {
    for (const tc of this.tickList) tc.preFormat();
    this.createMatraContexts();
    return this;
  }

  protected createMatraContexts(): void {
    const by = new Map<number, TickContext[]>();
    for (const tc of this.tickList) {
      const m = Math.floor(tc.onset.toNumber() + 1e-9);
      (by.get(m) ?? by.set(m, []).get(m)!).push(tc);
    }
    this.matraContexts = [...by.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([i, t]) => new MatraContext(i, t));
  }
  getMatraContexts(): MatraContext[] {
    return this.matraContexts;
  }
  getMatraContext(i: number): MatraContext | undefined {
    return this.matraContexts.find((m) => m.index === i);
  }
  /** widest packed matra: drives the page-wide column width */
  getMaxMatraWidth(): number {
    return Math.max(0, ...this.matraContexts.map((m) => m.getWidth()));
  }

  /** assign x: matra i occupies column `col(i)` */
  formatToColumns(col: (matraIndex: number) => { x: number; w: number }): this {
    if (!this.matraContexts.length && this.tickList.length)
      throw new RuntimeError('NotPreformatted', 'call preFormat() first');
    for (const m of this.matraContexts) {
      const c = col(m.index);
      m.place(c.x, c.w);
    }
    return this;
  }
}
