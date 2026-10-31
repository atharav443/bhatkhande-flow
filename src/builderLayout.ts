import type { LMatra, LSection } from './input/lower.js';
import type { StaveMatra } from './stave/taalstave.js';

/**
 * Which taal position sits in the first column of the section's grid.
 * Usually where the full-length lines begin (sam for most bandishes, khali for some swarmalikas).
 * A section with only short lines (e.g. an antara of one half cycle) keeps the grid of the section before it,
 * so its row sits under its own cycle positions.
 */
export function sectionGridStart(
  sec: LSection,
  taalTotal: number,
  previousGridStart: number | undefined,
): number {
  const full = sec.lines.find((l) => l.matras.length >= taalTotal);
  return full ? full.matras[0].pos : (previousGridStart ?? sec.lines[0]?.matras[0]?.pos ?? 1);
}

/** Column of a cycle position inside the section's grid. */
export const columnOf = (pos: number, gridStart: number, taalTotal: number) =>
  (((pos - gridStart) % taalTotal) + taalTotal) % taalTotal;

/** Volta + repeat information per matra (VexFlow keeps these on the stave as modifiers). */
export function matraExtras(sec: LSection): Map<LMatra, Partial<StaveMatra>> {
  const extra = new Map<LMatra, Partial<StaveMatra>>();
  for (const line of sec.lines) {
    const labels = [...new Set(line.matras.map((m) => m.volta).filter(Boolean))] as string[];
    const open = labels.length > 1 ? labels[labels.length - 1] : undefined; // the last of several endings stays open
    line.matras.forEach((m, i) => {
      const prev = line.matras[i - 1];
      const next = line.matras[i + 1];
      extra.set(m, {
        volta: m.volta,
        voltaStart: !!m.volta && prev?.volta !== m.volta,
        voltaEnd: !!m.volta && next?.volta !== m.volta,
        voltaClosed: !!m.volta && m.volta !== open,
        repeatBefore: m.repeatBefore || (i === 0 && line.repeatStart) || undefined,
        repeatAfter: m.repeatAfter || (i === line.matras.length - 1 && line.repeatEnd) || undefined,
      });
    });
  }
  return extra;
}

/** Splits every line where the column index stops increasing (it crossed the right edge of the grid). */
export function splitIntoRows(sec: LSection, colOf: (pos: number) => number): LMatra[][] {
  const rows: LMatra[][] = [];
  for (const line of sec.lines) {
    let row: LMatra[] = [];
    for (const m of line.matras) {
      if (row.length && colOf(m.pos) <= colOf(row[row.length - 1].pos)) {
        rows.push(row);
        row = [];
      }
      row.push(m);
    }
    if (row.length) rows.push(row);
  }
  return rows;
}
