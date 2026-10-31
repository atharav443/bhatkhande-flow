import type { Element } from '../core/element.js';
import type { Formatter } from '../formatting/formatter.js';
import { LineEndBar, VibhagLine } from './barlines.js';
import type { ColumnGrid } from './columngrid.js';
import { RepeatBar, RepeatType } from './repeatbar.js';
import type { Lane, StaveMatra } from './staveTypes.js';
import { TaalMarker } from './taalmarker.js';
import { Volta, VoltaType } from './volta.js';

/** What the decorations need to know about the row they belong to. */
export interface DecorationInput {
  matras: StaveMatra[];
  grid: ColumnGrid;
  formatter: Formatter;
  lanes: Partial<Record<Lane, number>>;
  barTop: number;
  barBottom: number;
}

function repeatTypeBetween(ends: boolean, begins: boolean): RepeatType {
  if (ends && begins) return RepeatType.BOTH;
  return ends ? RepeatType.END : RepeatType.BEGIN;
}

/** The bar printed just before matra `i`: a vibhag line, or a repeat bar when a repeat sign sits there. */
function barBefore(i: number, { matras, grid: g, barTop, barBottom }: DecorationInput): Element | undefined {
  const m = matras[i];
  if (i === 0 || !g.barBefore(m.col)) return undefined;
  const ends = !!matras[i - 1].repeatAfter;
  const begins = !!m.repeatBefore;
  if (ends || begins) return new RepeatBar(repeatTypeBetween(ends, begins), g.barX(m.col), barTop, barBottom);
  return new VibhagLine(g.barX(m.col), barTop, barBottom).setData('before_matra', m.pos);
}

/** The repeat bar at the row's left edge, if the row starts a repeat. */
function startBar({ matras, grid: g, barTop, barBottom }: DecorationInput): Element | undefined {
  const first = matras[0];
  if (!first.repeatBefore) return undefined;
  return new RepeatBar(RepeatType.BEGIN, g.x(first.col) - g.vibhagGap / 2 - 7, barTop, barBottom);
}

/** The bar at the row's right edge: a repeat bar, or the closing bar when the row fills the grid. */
function endBar({ matras, grid: g, barTop, barBottom }: DecorationInput): Element | undefined {
  const last = matras[matras.length - 1];
  if (last.repeatAfter)
    return new RepeatBar(RepeatType.END, g.x(last.col) + g.matraWidth + g.vibhagGap / 2, barTop, barBottom);
  return last.col === g.columns - 1 ? new LineEndBar(g.endBarX(), barTop, barBottom) : undefined;
}

/** The taal marker (X, 2, 0, 3) of matra `i`, centred on its first note. */
function markerOf(i: number, { matras, grid: g, formatter, lanes }: DecorationInput): Element | undefined {
  const m = matras[i];
  if (!m.marker) return undefined;
  const firstTick = formatter.getMatraContext(i)?.ticks[0];
  const cx = firstTick ? firstTick.getCenterX() : g.x(m.col) + g.matraWidth / 2;
  return new TaalMarker(m.marker, cx, lanes.marker!).setData('matra_number', m.pos);
}

function voltaTypeOf(begins: boolean, ends: boolean): VoltaType {
  if (begins && ends) return VoltaType.BEGIN_END;
  if (begins) return VoltaType.BEGIN;
  return ends ? VoltaType.END : VoltaType.MID;
}

/** Volta brackets: one piece per run of matras with the same ending label (BEGIN/MID/END like VexFlow). */
function voltasOf({ matras, grid: g, lanes }: DecorationInput): Element[] {
  const voltas: Element[] = [];
  for (let i = 0; i < matras.length;) {
    const label = matras[i].volta;
    if (!label) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < matras.length && matras[j + 1].volta === label) j++;
    const a = matras[i];
    const b = matras[j];
    const type = voltaTypeOf(!!a.voltaStart, !!b.voltaEnd && !!b.voltaClosed);
    const x0 = g.x(a.col) - g.vibhagGap / 2 + 1;
    const x1 = g.x(b.col) + g.matraWidth + g.vibhagGap / 2 - 1;
    voltas.push(new Volta(type, label, x0, x1, lanes.volta!));
    i = j + 1;
  }
  return voltas;
}

/**
 * Bars, taal markers and volta brackets (VexFlow: Barline / StaveText stave modifiers).
 * The order is the drawing order, which also fixes the generated element ids.
 */
export function buildDecorations(input: DecorationInput): Element[] {
  const parts: (Element | undefined)[] = [startBar(input)];
  input.matras.forEach((_, i) => parts.push(barBefore(i, input), markerOf(i, input)));
  parts.push(endBar(input));
  return [...parts.filter((e): e is Element => e !== undefined), ...voltasOf(input)];
}
