import { Element } from '../core/element';
import { Glyph } from '../core/glyph';
import { Tables } from '../core/tables';
import { markerText } from '../music/taal';

/** ×, ०, २, ३ … printed on the line BELOW the lyrics, under the first matra of each vibhag. Category `taal_marker`. */
export class TaalMarker extends Element {
  static CATEGORY = 'taal_marker';
  readonly glyph: Glyph;
  constructor(readonly marker: string, readonly cx: number, readonly baseline: number) {
    super();
    this.glyph = new Glyph(markerText(marker, Tables.style.script), 'marker', Tables.style.fontSize.marker * (marker.toUpperCase() === 'X' || marker === '×' ? 1.35 : 1));
    this.setData('marker_symbol', marker);
  }
  draw(): void {
    const ctx = this.checkContext();
    this.openGroup(ctx);
    ctx.setFillStyle(Tables.style.ink);
    this.glyph.renderAtInk(ctx, this.cx - this.glyph.inkWidth / 2, this.baseline);
    ctx.closeGroup();
    this.setRendered();
  }
}
