import { Glyph } from '../core/glyph.js';
import { Tables } from '../core/tables.js';
import { DEGREES, degreeText } from '../music/swar.js';
import { KanGroup } from '../modifiers/kangroup.js';
import { Note } from '../notes/note.js';
import type { Voice } from '../notes/voice.js';
import type { NominalMetrics } from './staveTypes.js';

/** Nominal line metrics, measured from sample glyphs. */
export function nominalMetrics(): NominalMetrics {
  const st = Tables.style;
  const sw = DEGREES.map((d) => new Glyph(degreeText(d, st.script), 'swar', st.fontSize.swar).shape);
  const ly = new Glyph('सकीमुऽ', 'lyric', st.fontSize.lyric).shape;
  const mk = new Glyph('×०२३', 'marker', st.fontSize.marker).shape;
  return {
    swarAbove: Math.max(...sw.map((s) => -s.inkTop)),
    swarBelow: Math.max(0, ...sw.map((s) => s.inkBottom)),
    lyricAbove: -ly.inkTop,
    lyricBelow: Math.max(0, ly.inkBottom),
    markerAbove: -mk.inkTop,
    markerBelow: Math.max(0, mk.inkBottom),
  };
}

/** How far the row's content reaches above and below each baseline (never less than the nominal metrics). */
export interface RowExtents {
  swarAbove: number;
  swarBelow: number;
  kanAbove: number;
  kanBelow: number;
  lyricAbove: number;
  lyricBelow: number;
}

export function measureRowExtents(voices: Voice[], nominal: NominalMetrics): RowExtents {
  const r: RowExtents = {
    swarAbove: nominal.swarAbove,
    swarBelow: nominal.swarBelow,
    kanAbove: 0,
    kanBelow: 0,
    lyricAbove: nominal.lyricAbove,
    lyricBelow: nominal.lyricBelow,
  };
  for (const v of voices)
    for (const t of v.getTickables()) {
      if (!(t instanceof Note)) continue;
      const e = t.getExtents();
      if (t.lane === 'swar') {
        r.swarAbove = Math.max(r.swarAbove, e.above);
        r.swarBelow = Math.max(r.swarBelow, e.below);
        for (const g of t.getModifiersByCategory(KanGroup.CATEGORY) as KanGroup[]) {
          r.kanAbove = Math.max(r.kanAbove, g.getAbove());
          r.kanBelow = Math.max(r.kanBelow, g.getBelow());
        }
      } else if (t.lane === 'lyric') {
        r.lyricAbove = Math.max(r.lyricAbove, e.above);
        r.lyricBelow = Math.max(r.lyricBelow, e.below);
      }
    }
  return r;
}
