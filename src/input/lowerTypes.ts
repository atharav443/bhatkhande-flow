import type { Fraction } from '../core/fraction.js';
import type { TaalDef } from '../music/taal.js';
import type { Diagnostic, MetadataModel, SwarEvent } from './types.js';

/**
 * LOWERING: authored events -> a grid the layout engine can reason about.
 *
 * VexFlow draws a half note as ONE glyph; time passing is implicit in the spacing.
 * Bhatkhande notation must MATERIALISE time: a note held for 3 beats becomes  सा | ऽ | ऽ  - one glyph per matra.
 * So we convert every matra into an ordered list of Slots whose rational durations sum to exactly 1,
 * spilling held notes into following matras ("carry"), and deriving taal positions/markers from the taal definition.
 */
export type SlotKind = 'swar' | 'extend' | 'rest' | 'blank';

export interface Slot {
  id: string;
  kind: SlotKind;
  onset: Fraction;
  dur: Fraction;
  swar?: SwarEvent;
  lyric?: string;
  /** true when this slot is the carried tail of a longer event rather than its attack */
  carried?: boolean;
  parenOpen?: boolean;
  parenClose?: boolean;
}
export interface LMatra {
  id: string;
  pos: number;
  vibhag: number;
  vibhagStart: boolean;
  marker?: string;
  volta?: string;
  repeatBefore?: boolean;
  repeatAfter?: boolean;
  slots: Slot[];
}
export interface LLine {
  number: number;
  matras: LMatra[];
  repeatStart?: boolean;
  repeatEnd?: boolean;
}
export interface LSection {
  name: string;
  lines: LLine[];
}
export interface LoweredSpan {
  type: 'meend';
  from: string;
  to: string;
}
/** A bracket over a run of slots (currently: tihai). */
export interface LoweredBracket {
  kind: 'tihai';
  from: string;
  to: string;
  label?: string;
}
export interface Lowered {
  meta: MetadataModel;
  taal: TaalDef;
  sections: LSection[];
  spans: LoweredSpan[];
  brackets: LoweredBracket[];
  diagnostics: Diagnostic[];
}

/** State shared by every step of lowering one bandish. */
export interface LowerContext {
  taal: TaalDef;
  diagnostics: Diagnostic[];
  alias: Map<string, string>; // user event id -> slot id
  spans: LoweredSpan[];
  brackets: LoweredBracket[];
  slotById: Map<string, Slot>;
  slotWhere: Map<string, { pos: number; onset: Fraction }>;
  /** meend state lives across sections: a meend may start at the end of one section and finish in the next */
  meendStack: string[];
}

/** Where we are inside one section while its matras are numbered. */
export interface SectionState {
  /** the section's first matra, clamped into the taal */
  start: number;
  /** how many matras have been counted so far in this section */
  k: number;
  /** length of a held note still sounding from an earlier matra */
  carry: Fraction;
  /** volta: a new ending label rewinds the cycle position to where the first ending began */
  prevVolta?: string;
  voltaFirstK: number;
}
