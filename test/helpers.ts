import { readFileSync } from 'node:fs';
import { Factory, createFontkitProvider, type Label } from '../src/node';

export const fonts = createFontkitProvider();
export const render = (file: string, build = {}) =>
  new Factory({ fonts, build }).renderBandish(
    readFileSync(new URL(`../examples/${file}`, import.meta.url), 'utf8'),
  );
export const count = (ls: Label[]) =>
  ls.reduce<Record<string, number>>((a, l) => ((a[l.cls] = (a[l.cls] ?? 0) + 1), a), {});
export const of = (ls: Label[], c: string) => ls.filter((l) => l.cls === c);
export const cy = (l: Label) => (l.bbox[1] + l.bbox[3]) / 2;
export const cx = (l: Label) => (l.bbox[0] + l.bbox[2]) / 2;
