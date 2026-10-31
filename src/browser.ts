import * as fontkit from 'fontkit';
import type { FontProvider, FontRole, Shape } from './font/provider';
import { createProviderFromFonts, type FKFont } from './font/fontkit-core';
import { isLabelStudio, labelStudioToBandish } from './input/fromLabelStudio';

export * from './index';

/**
 * Browser entry. Two interchangeable FontProviders (VexFlow keeps its font behind an interface the same way):
 *  - createBrowserFontProvider(urls): fetches the font files and shapes with fontkit -> outline SVG, byte-identical
 *    to the Node render. Use with style.textMode = 'path' (default).
 *  - createCanvasFontProvider(): no font files to fetch; measures with CanvasRenderingContext2D and emits <text>.
 *    Use with style.textMode = 'text', after ensureFontsLoaded().
 */
export interface BrowserFontUrls { tiroDeva: string; tiroLatin: string; notoBold: string; notoReg: string }

export async function createBrowserFontProvider(urls: BrowserFontUrls): Promise<FontProvider> {
  const load = async (u: string): Promise<FKFont> => {
    const res = await fetch(u);
    if (!res.ok) throw new Error(`font ${u}: HTTP ${res.status}`);
    return fontkit.create(new Uint8Array(await res.arrayBuffer()) as any) as FKFont;
  };
  const [tiroDeva, tiroLatin, notoBold, notoReg] = await Promise.all([load(urls.tiroDeva), load(urls.tiroLatin), load(urls.notoBold), load(urls.notoReg)]);
  return createProviderFromFonts({ tiroDeva, tiroLatin, notoBold, notoReg });
}

const BODY = "'Tiro Devanagari Hindi', 'Noto Serif Devanagari', serif";
const HEAD = "'Noto Serif Devanagari', 'Tiro Devanagari Hindi', serif";
const FAMILIES: Record<FontRole, string> = { swar: BODY, lyric: BODY, marker: BODY, small: BODY, title: HEAD, subtitle: HEAD, section: HEAD };
const WEIGHTS: Record<FontRole, number> = { swar: 400, lyric: 400, marker: 400, small: 400, title: 700, subtitle: 400, section: 700 };

export function createCanvasFontProvider(families: Partial<Record<FontRole, string>> = {}): FontProvider {
  const fam = { ...FAMILIES, ...families };
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(8, 8) : document.createElement('canvas');
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.textBaseline = 'alphabetic';
  const cache = new Map<string, Shape>();
  return {
    shape(text, role, size) {
      const key = `${role}|${size}|${text}`;
      const hit = cache.get(key); if (hit) return hit;
      ctx.font = `${WEIGHTS[role]} ${size}px ${fam[role]}`;
      const m = ctx.measureText(text);
      const s: Shape = { advance: m.width, inkLeft: -m.actualBoundingBoxLeft, inkRight: m.actualBoundingBoxRight, inkTop: -m.actualBoundingBoxAscent, inkBottom: m.actualBoundingBoxDescent };
      cache.set(key, s); return s;
    },
    family: (role) => fam[role],
    weight: (role) => WEIGHTS[role],
  };
}

export async function ensureFontsLoaded(): Promise<void> {
  await Promise.all((Object.keys(FAMILIES) as FontRole[]).map((r) => document.fonts.load(`${WEIGHTS[r]} 20px ${FAMILIES[r]}`, 'सा रे ग म प ध नी × ० २ ३ 1.')));
}

/** Accepts bandish JSON, swartaal XML or a Label Studio export (task / list of tasks) and returns what Factory.renderBandish takes. */
export function toBandishInput(text: string): string | object {
  const t = text.trimStart();
  if (t.startsWith('<')) return text;
  const j = JSON.parse(text);
  return isLabelStudio(j) ? labelStudioToBandish(Array.isArray(j) ? j : [j]) : j;
}
