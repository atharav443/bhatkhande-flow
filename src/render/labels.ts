import type { RenderContext } from './rendercontext';

/** The BhatkhandeSet label taxonomy. Element categories with these names become labels. */
export const LABEL_CLASSES = [
  'swar',
  'swar_rest',
  'lyric',
  'lyric_rest',
  'kan_swar',
  'khatka_bracket',
  'octave_dot',
  'komal_mark',
  'tivra_mark',
  'grouping_curve',
  'meend',
  'tihai_bracket',
  'taal_marker',
  'vibhag_line',
  'line_end_bar',
  'repeat_bar',
  'volta_bracket',
  'section_heading',
  'title',
] as const;
export type LabelClass = (typeof LABEL_CLASSES)[number];

export interface Label {
  cls: LabelClass;
  id: string;
  bbox: [number, number, number, number];
  data: Record<string, string | number>;
}

/** Collects labelled boxes from a context after drawing (absolute page coordinates, scaled by `scale`). */
export function collectLabels(ctx: RenderContext, scale = 1, pad = 0): Label[] {
  const out: Label[] = [];
  for (const g of ctx.getGroups()) {
    const cls = g.cls.split(' ')[0] as LabelClass;
    if (!LABEL_CLASSES.includes(cls) || !g.bbox) continue;
    const b = g.bbox;
    out.push({
      cls,
      id: g.id,
      data: g.data,
      bbox: [(b.x - pad) * scale, (b.y - pad) * scale, (b.x1 + pad) * scale, (b.y1 + pad) * scale],
    });
  }
  return out;
}

/** YOLO txt lines: class_index cx cy w h (normalised). */
export function toYOLO(
  labels: Label[],
  width: number,
  height: number,
  classes: readonly string[] = LABEL_CLASSES,
): string {
  return labels
    .filter((l) => classes.includes(l.cls))
    .map((l) => {
      const [x0, y0, x1, y1] = l.bbox;
      const f = (v: number) => v.toFixed(6);
      return `${classes.indexOf(l.cls)} ${f((x0 + x1) / 2 / width)} ${f((y0 + y1) / 2 / height)} ${f((x1 - x0) / width)} ${f((y1 - y0) / height)}`;
    })
    .join('\n');
}
