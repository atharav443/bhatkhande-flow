import type { Fraction } from '../core/fraction';
import { Tables } from '../core/tables';
import { Note } from './note';

/**
 * A lyric syllable (VexFlow lyrics are TextNotes in their own Voice). It sits in the same TickContext as the swar
 * sung on it, so swar and syllable share x without any special-casing. Category `lyric`.
 */
export class LyricNote extends Note {
  static CATEGORY = 'lyric';
  readonly lane = 'lyric' as const;
  constructor(
    readonly text: string,
    ticks: Fraction,
  ) {
    super(ticks);
    this.makeGlyph(text, 'lyric', Tables.style.fontSize.lyric);
    this.setData('text', text);
  }
  protected inkColor(): string {
    return Tables.style.ink;
  }
}

/** "ऽ" in the lyric line: the syllable is prolonged (Bhatkhande convention). Category `lyric_rest`. */
export class LyricRest extends LyricNote {
  static CATEGORY = 'lyric_rest';
  constructor(ticks: Fraction, text = 'ऽ') {
    super(text, ticks);
  }
}
