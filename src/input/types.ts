import type { Fraction } from '../core/fraction';
import type { Degree } from '../music/swar';

export type Level = 'error' | 'warn' | 'info';
export interface Diagnostic { level: Level; code: string; message: string; path?: string }

/** A grace note. `kan` nests a grace note of the grace note (kan-inside-kan); depth is limited by the parser (MAX_KAN_DEPTH). */
export interface KanNote { degree: Degree; octave: number; komal: boolean; tivra: boolean; kan?: KanNote[] }

export interface SwarEvent {
  type: 'swar';
  id?: string;
  degree: Degree;
  /** -2 ati-mandra, -1 mandra, 0 madhya, +1 taar, +2 ati-taar */
  octave: number;
  komal: boolean;
  tivra: boolean;
  /** In matras (1 = one beat). Omitted => matra is split equally among unspecified events. May exceed 1 (held note). */
  duration?: Fraction;
  lyric?: string;
  kan: KanNote[];
  meend?: 'start' | 'end' | 'both';
  /** Bhatkhande khatka, printed as the swar in parentheses: (प) */
  khatka?: boolean;
}
export interface RestEvent { type: 'rest'; id?: string; duration?: Fraction; lyric?: string }
export interface ExtendEvent { type: 'extend'; id?: string; duration?: Fraction; lyric?: string }
export type EventModel = SwarEvent | RestEvent | ExtendEvent;

export interface MatraModel {
  /** 1-based position within the taal cycle (optional; derived from section.startMatra if absent). */
  index?: number;
  /** Authored taal marker. Normally omitted: it is derived from the taal definition and validated. */
  marker?: string;
  /** Volta (alternate ending) label such as "1." or "2."; consecutive matras with the same label share one bracket. */
  volta?: string;
  /** Repeat sign immediately before / after this matra (must fall on a vibhag bar or the row edge). */
  repeatBefore?: boolean;
  repeatAfter?: boolean;
  events: EventModel[];
}
export interface LineModel { number: number; matras: MatraModel[]; repeatStart?: boolean; repeatEnd?: boolean }
export interface SectionModel { name: string; startMatra?: number; lines: LineModel[] }
export interface SpanModel {
  type: 'meend' | 'khatka' | 'tihai';
  from: string;
  to: string;
  /** tihai only: bracket caption (default from style) */
  label?: string;
  /** tihai only: where the last note must land: 'sam' (default), 'any', or a matra number */
  landsOn?: string;
}

export interface TaalSpec {
  name?: string;
  vibhags?: number[];
  markers?: string[];
  totalMatras?: number;
  khands?: number;
}
export interface MetadataModel {
  title?: string;
  raag?: string;
  taal: TaalSpec;
  laya?: string;
  thaat?: string;
  composer?: string;
  /** left-hand page label as printed, e.g. "गीत-४" */
  label?: string;
  /** song text printed above the notation, one entry per line */
  text?: string[];
  tempo?: number;
}
export interface BandishModel {
  version?: string;
  metadata: MetadataModel;
  sections: SectionModel[];
  spans: SpanModel[];
}
