export type Lane = 'volta' | 'meend' | 'tihai' | 'kan' | 'swar' | 'lyric' | 'marker';

/** One matra of this row: its cycle position, the derived taal marker (if it starts a vibhag) and its column. */
export interface StaveMatra {
  pos: number;
  marker?: string;
  col: number;
  id: string;
  /** alternate ending this matra belongs to, and whether the ending's bracket starts / ends / is closed here */
  volta?: string;
  voltaStart?: boolean;
  voltaEnd?: boolean;
  voltaClosed?: boolean;
  repeatBefore?: boolean;
  repeatAfter?: boolean;
}

/** Line metrics every row of a page shares, so all rows use the same baseline spacing. */
export interface NominalMetrics {
  swarAbove: number;
  swarBelow: number;
  lyricAbove: number;
  lyricBelow: number;
  markerAbove: number;
  markerBelow: number;
}
