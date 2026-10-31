import type * as fontkit from 'fontkit';
import type { FontProvider, FontRole, Shape } from './provider';

/** Environment-free part of the fontkit provider: it only needs already-parsed fonts, so the same shaping code runs in Node and in the browser. */
export type FKFont = fontkit.Font;
export interface FontSet {
  tiroDeva: FKFont;
  tiroLatin: FKFont;
  notoBold: FKFont;
  notoReg: FKFont;
}

const isMark = (cp: number) => /\p{M}/u.test(String.fromCodePoint(cp)) || cp === 0x200d || cp === 0x200c;

/**
 * Shapes with fontkit (OpenType Indic shaper) and returns OUTLINES.
 * Outline text makes the SVG self-contained and pixel-stable on any machine (the same trick
 * VexFlow uses for its music glyphs), which also matters for reproducible dataset images.
 */
export function createProviderFromFonts(fonts: FontSet): FontProvider {
  const { tiroDeva, tiroLatin, notoBold, notoReg } = fonts;
  const stacks: Record<FontRole, FKFont[]> = {
    swar: [tiroDeva, tiroLatin],
    lyric: [tiroDeva, tiroLatin],
    marker: [tiroLatin, tiroDeva],
    title: [notoBold, tiroLatin],
    subtitle: [notoReg, tiroLatin],
    section: [notoBold, tiroLatin],
    small: [tiroLatin, tiroDeva],
  };
  const cache = new Map<string, Shape>();

  function shape(text: string, role: FontRole, size: number): Shape {
    const key = `${role}|${size}|${text}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const stack = stacks[role];
    // split into runs by font coverage; combining marks stick to their base
    const runs: { font: FKFont; str: string }[] = [];
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      const font = stack.find((f) => f.hasGlyphForCodePoint(cp)) ?? stack[0];
      const last = runs[runs.length - 1];
      if (last && (last.font === font || isMark(cp))) last.str += ch;
      else runs.push({ font, str: ch });
    }
    let pen = 0;
    let d = '';
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (const run of runs) {
      const s = size / run.font.unitsPerEm;
      const out = run.font.layout(run.str);
      for (let i = 0; i < out.glyphs.length; i++) {
        const g = out.glyphs[i];
        const p = out.positions[i];
        const path = g.path.transform(s, 0, 0, -s, pen + p.xOffset * s, -p.yOffset * s);
        if (path.commands.length) {
          d += path.toSVG();
          const b = path.bbox;
          x0 = Math.min(x0, b.minX);
          y0 = Math.min(y0, b.minY);
          x1 = Math.max(x1, b.maxX);
          y1 = Math.max(y1, b.maxY);
        }
        pen += p.xAdvance * s;
      }
    }
    if (!isFinite(x0)) {
      x0 = 0;
      x1 = pen;
      y0 = 0;
      y1 = 0;
    }
    const sh: Shape = { advance: pen, inkLeft: x0, inkRight: x1, inkTop: y0, inkBottom: y1, pathD: d };
    cache.set(key, sh);
    return sh;
  }

  return {
    shape,
    family: (role) =>
      role === 'title' || role === 'section' || role === 'subtitle'
        ? "'Noto Serif Devanagari', serif"
        : "'Tiro Devanagari Hindi', serif",
    weight: (role) => (role === 'title' || role === 'section' ? 700 : 400),
  };
}
