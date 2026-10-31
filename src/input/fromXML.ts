import { parseXML, type XNode } from './xml.js';
import { normalizeBandish } from './fromJSON.js';
import type { BandishModel, Diagnostic } from './types.js';

/** Reads the swartaal `<hindustani-composition>` format (plus optional extensions: <rest/>, <extend/>, kan=, meend=, khatka=, <span/>). */
const kids = (n: XNode, name: string) => n.children.filter((c) => c.name === name);
const kid = (n: XNode, ...names: string[]) => n.children.find((c) => names.includes(c.name));

/** <kan> may itself contain <kan> children (kan-inside-kan). */
function mapKan(k: XNode): any {
  const nested = kids(k, 'kan');
  return { swar: k.text.trim(), ...k.attrs, ...(nested.length ? { kan: nested.map(mapKan) } : {}) };
}

function mapSwar(n: XNode): any {
  const o: any = { type: 'swar', swar: n.text.trim() };
  for (const [k, v] of Object.entries(n.attrs)) o[k] = v;
  const kans = kids(n, 'kan');
  if (kans.length) o.kan = kans.map(mapKan);
  return o;
}

/** <tihai repeat="3" gap="1/2" unit="1/2" label="तिहाई" lands-on="sam"> <swar>..</swar> ... </tihai> as a child of <line>, in matra order. */
function mapTihai(n: XNode): any {
  const phrase = n.children
    .filter((c) => c.name === 'swar' || c.name === 'rest' || c.name === 'extend')
    .map((c) => (c.name === 'swar' ? mapSwar(c) : { type: c.name, ...c.attrs }));
  return { tihai: { ...n.attrs, landsOn: n.attrs['lands-on'], gapKind: n.attrs['gap-kind'], phrase } };
}

function mapMatra(n: XNode): any {
  const events: any[] = [];
  let pendingLyric: string | undefined;
  for (const c of n.children) {
    if (c.name === 'swar' || c.name === 'rest' || c.name === 'extend') {
      const ev = c.name === 'swar' ? mapSwar(c) : { type: c.name, ...c.attrs };
      if (pendingLyric !== undefined) {
        ev.lyric = pendingLyric;
        pendingLyric = undefined;
      }
      events.push(ev);
    } else if (c.name === 'lyric') {
      const prev = events[events.length - 1];
      if (prev && prev.lyric === undefined) prev.lyric = c.text.trim();
      else pendingLyric = c.text.trim(); // lyric written before its swar
    }
  }
  const marker = kid(n, 'tala-marker', 'taal-marker', 'taalmarker');
  return {
    index: n.attrs.index,
    marker: marker?.text.trim(),
    volta: n.attrs.volta,
    'repeat-before': n.attrs['repeat-before'],
    'repeat-after': n.attrs['repeat-after'],
    events,
  };
}

export function fromXML(src: string): { model: BandishModel; diagnostics: Diagnostic[] } {
  const root = parseXML(src);
  const md = kid(root, 'metadata');
  const meta: any = {};
  if (md) {
    for (const c of md.children) {
      if (c.name === 'tala' || c.name === 'taal') {
        // custom taal in XML: vibhags="3,3,2" markers="X,2,0" (comma or space separated)
        const list = (v?: string) => (v === undefined ? undefined : v.split(/[\s,]+/).filter(Boolean));
        meta.taal = {
          ...c.attrs,
          ...(c.attrs.vibhags !== undefined ? { vibhags: list(c.attrs.vibhags) } : {}),
          ...(c.attrs.markers !== undefined ? { markers: list(c.attrs.markers) } : {}),
        };
      } else meta[c.name] = c.text.trim();
    }
  }
  const raw = {
    version: root.attrs.version,
    metadata: meta,
    sections: kids(root, 'section').map((s) => ({
      name: s.attrs.name,
      'start-matra': s.attrs['start-matra'],
      lines: kids(s, 'line').map((l) => ({
        number: l.attrs.number,
        'repeat-start': l.attrs['repeat-start'],
        'repeat-end': l.attrs['repeat-end'],
        // <matra>, <khand><matra>… and <tihai> in document order
        matras: l.children.flatMap((c) =>
          c.name === 'matra'
            ? [mapMatra(c)]
            : c.name === 'khand'
              ? kids(c, 'matra').map(mapMatra)
              : c.name === 'tihai'
                ? [mapTihai(c)]
                : [],
        ),
      })),
    })),
    spans: [...kids(root, 'span'), ...kids(root, 'section').flatMap((s) => kids(s, 'span'))].map((s) => ({
      ...s.attrs,
    })),
  };
  return normalizeBandish(raw);
}
