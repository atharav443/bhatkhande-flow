import { Fraction } from './core/fraction.js';
import type { Diagnostic } from './input/types.js';
import type { LMatra, Lowered, LSection } from './input/lower.js';
import { makeLyricTickable, makeSwarTickable } from './builderNotes.js';
import { columnOf, matraExtras, sectionGridStart, splitIntoRows } from './builderLayout.js';
import { GhostNote } from './notes/ghostnote.js';
import type { Note } from './notes/note.js';
import { Voice, VoiceMode } from './notes/voice.js';
import { GroupingCurve } from './spanners/groupingcurve.js';
import { Meend } from './spanners/meend.js';
import { TihaiBracket } from './spanners/tihai.js';
import { Page, type PageSection } from './stave/page.js';
import { TaalStave, type StaveMatra } from './stave/taalstave.js';

export interface BuildOptions {
  /** write ऽ under every swar slot that has no syllable, when the section has lyrics (book convention) */
  autoAvagraha?: boolean;
  /** draw grouping curves under grouped syllables too */
  lyricCurves?: boolean;
}

/** What building the page collects as it goes. */
interface BuildState {
  low: Lowered;
  autoAvagraha: boolean;
  lyricCurves: boolean;
  diagnostics: Diagnostic[];
  noteBySlot: Map<string, Note>;
  staveOfNote: Map<Note, TaalStave>;
  pageStaves: TaalStave[];
  curves: GroupingCurve[];
}

/** One row (stave) from a run of matras: a swar voice, a lyric voice, and the grouping curves between them. */
function buildStave(
  ms: LMatra[],
  hasLyrics: boolean,
  colOf: (pos: number) => number,
  extra: Map<LMatra, Partial<StaveMatra>>,
  st: BuildState,
): TaalStave {
  const staveMatras: StaveMatra[] = ms.map((m) => ({
    pos: m.pos,
    marker: m.vibhagStart ? m.marker : undefined,
    col: colOf(m.pos),
    id: m.id,
    ...extra.get(m),
  }));
  const stave = new TaalStave(staveMatras, hasLyrics);
  const total = Fraction.of(ms.length);
  const mode = ms.length === st.low.taal.total ? VoiceMode.STRICT : VoiceMode.SOFT;
  const swarVoice = new Voice(total, mode);
  const lyricVoice = new Voice(total, mode);
  for (const m of ms) {
    const swarNotes: Note[] = [];
    const lyricNotes: Note[] = [];
    m.slots.forEach((s, k) => {
      const n = makeSwarTickable(s, m, k, st.diagnostics);
      swarVoice.addTickable(n);
      st.noteBySlot.set(s.id, n);
      if (!(n instanceof GhostNote)) swarNotes.push(n);
      if (hasLyrics) {
        const l = makeLyricTickable(s, n, st.autoAvagraha);
        lyricVoice.addTickable(l);
        if (!(l instanceof GhostNote)) lyricNotes.push(l);
      }
    });
    if (swarNotes.length >= 2) {
      st.curves.push(new GroupingCurve(swarNotes, 'swar'));
      stave.hasSwarCurves = true;
    }
    if (st.lyricCurves && lyricNotes.length >= 2) {
      st.curves.push(new GroupingCurve(lyricNotes, 'lyric'));
      stave.hasLyricCurves = true;
    }
  }
  stave.addVoice(swarVoice);
  if (hasLyrics) stave.addVoice(lyricVoice);
  for (const t of swarVoice.getTickables()) st.staveOfNote.set(t as Note, stave);
  st.pageStaves.push(stave);
  return stave;
}

function buildSection(sec: LSection, gridStart: number, st: BuildState): PageSection {
  const taalTotal = st.low.taal.total;
  const hasLyrics = sec.lines.some((l) => l.matras.some((m) => m.slots.some((s) => s.lyric)));
  const colOf = (pos: number) => columnOf(pos, gridStart, taalTotal);
  const extra = matraExtras(sec);
  const staves = splitIntoRows(sec, colOf).map((ms) => buildStave(ms, hasLyrics, colOf, extra, st));
  return { heading: sec.name || undefined, gridStart, staves };
}

/** Meends and tihai brackets run between two notes, possibly across several rows. */
function addSpanners(page: Page, st: BuildState): void {
  const between = (a: TaalStave, b: TaalStave) => {
    const i = st.pageStaves.indexOf(a);
    const j = st.pageStaves.indexOf(b);
    return st.pageStaves.slice(Math.min(i, j), Math.max(i, j) + 1);
  };
  const ends = (from: string, to: string) => {
    const a = st.noteBySlot.get(from);
    const b = st.noteBySlot.get(to);
    return a && b ? { a, b, rows: between(st.staveOfNote.get(a)!, st.staveOfNote.get(b)!) } : undefined;
  };
  for (const sp of st.low.spans) {
    const e = ends(sp.from, sp.to);
    if (e) page.addSpanner(new Meend(e.a, e.b, e.rows));
  }
  for (const br of st.low.brackets) {
    const e = ends(br.from, br.to);
    if (e) page.addSpanner(new TihaiBracket(e.a, e.b, e.rows, br.label));
  }
}

/**
 * Lowered bandish -> notation elements (the role of VexFlow's EasyScore Builder).
 * Rows are taal cycles: a lowered line is cut wherever it wraps past the end of the page grid.
 */
export function buildPage(low: Lowered, opts: BuildOptions = {}): { page: Page; diagnostics: Diagnostic[] } {
  const st: BuildState = {
    low,
    autoAvagraha: opts.autoAvagraha ?? true,
    lyricCurves: opts.lyricCurves ?? true,
    diagnostics: low.diagnostics,
    noteBySlot: new Map(),
    staveOfNote: new Map(),
    pageStaves: [],
    curves: [],
  };
  let previousGridStart: number | undefined;
  const sections = low.sections.map((sec) => {
    const gridStart = sectionGridStart(sec, low.taal.total, previousGridStart);
    previousGridStart ??= gridStart;
    return buildSection(sec, gridStart, st);
  });

  const m = low.meta;
  const page = new Page(
    low.taal,
    {
      title: m.title ?? (m.raag ? `राग ${m.raag}` : undefined),
      subtitle: `ताल-${low.taal.displayName}`,
      label: m.label,
      text: m.text,
    },
    sections,
  );
  st.curves.forEach((c) => page.addSpanner(c));
  addSpanners(page, st);
  return { page, diagnostics: st.diagnostics };
}
