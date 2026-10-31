import { Tables } from './core/tables.js';
import type { Diagnostic, KanNote as KanModel } from './input/types.js';
import type { LMatra, Slot } from './input/lower.js';
import { KanGroup } from './modifiers/kangroup.js';
import { KhatkaBracket } from './modifiers/khatkabracket.js';
import { KomalMark } from './modifiers/komalmark.js';
import { ModifierPosition } from './modifiers/modifier.js';
import { OctaveDot } from './modifiers/octavedot.js';
import { TivraMark } from './modifiers/tivramark.js';
import { GhostNote } from './notes/ghostnote.js';
import { LyricNote, LyricRest } from './notes/lyricnote.js';
import type { Note } from './notes/note.js';
import { KanNote, SwarNote, SwarRest } from './notes/swarnote.js';

/** Turns one lowered slot into the note printed on the swar line. */
export function makeSwarTickable(s: Slot, m: LMatra, k: number, diags: Diagnostic[]): Note {
  let n: Note;
  if (s.kind === 'swar') {
    const ev = s.swar!;
    const sw = new SwarNote({
      degree: ev.degree,
      octave: ev.octave,
      komal: ev.komal,
      tivra: ev.tivra,
      ticks: s.dur,
    });
    decorate(sw, ev);
    if (s.parenOpen) sw.addModifier(new KhatkaBracket(ModifierPosition.LEFT));
    if (s.parenClose) sw.addModifier(new KhatkaBracket(ModifierPosition.RIGHT));
    if (ev.kan.length)
      sw.addModifier(new KanGroup(ev.kan.map((kn) => makeKan(kn, Tables.style.fontSize.kanScale))));
    n = sw;
  } else if (s.kind === 'extend') {
    n = new SwarRest(s.dur);
  } else {
    if (s.kind === 'rest')
      diags.push({
        level: 'info',
        code: 'rest.blank',
        message: `silence at matra ${m.pos} is printed as an empty slot (Bhatkhande has no rest sign)`,
      });
    n = new GhostNote(s.dur, 'swar');
  }
  n.setData('matra_number', m.pos)
    .setData('matra_fraction', s.dur.toString())
    .setData('sequence_in_matra', k + 1)
    .setData('slot', s.id);
  return n;
}

function decorate(n: SwarNote, ev: { komal: boolean; tivra: boolean; octave: number }): void {
  if (ev.komal) n.addModifier(new KomalMark());
  if (ev.tivra) n.addModifier(new TivraMark());
  for (let i = 0; i < Math.abs(ev.octave); i++)
    n.addModifier(new OctaveDot(ev.octave > 0 ? ModifierPosition.ABOVE : ModifierPosition.BELOW));
}

function makeKan(k: KanModel, scale: number): KanNote {
  const n = new KanNote({ degree: k.degree, octave: k.octave, komal: k.komal, tivra: k.tivra, small: scale });
  decorate(n, k);
  if (k.kan?.length)
    n.addModifier(new KanGroup(k.kan.map((c) => makeKan(c, scale * Tables.style.decor.kanNestScale))));
  return n;
}

export function makeLyricTickable(s: Slot, swar: Note, autoAva: boolean): Note {
  const t = s.lyric?.trim();
  let l: Note;
  if (t === 'ऽ' || t === 'S' || t === '-' || t === '–')
    l = new LyricRest(s.dur, t === '-' || t === '–' ? '–' : 'ऽ');
  else if (t) l = new LyricNote(t, s.dur);
  else if (autoAva && !(swar instanceof GhostNote)) l = new LyricRest(s.dur);
  else l = new GhostNote(s.dur, 'lyric');
  l.setData('matra_number', swar.getData().matra_number).setData('applies_to_slot', s.id);
  return l;
}
