// Node entry point: `import { renderBandish } from 'bhatkhande-flow'`.
// Everything from index.ts, plus the font provider that loads the bundled fonts from node_modules.

import { Factory, type FactoryOptions, type RenderResult } from './factory.js';
import { createFontkitProvider } from './font/fontkit-node.js';
import type { FontProvider } from './font/provider.js';

export * from './index.js';
export { createFontkitProvider } from './font/fontkit-node.js';

export interface RenderOptions {
  /** Defaults to the bundled fonts (Tiro Devanagari Hindi and Noto Serif Devanagari). */
  fonts?: FontProvider;
  /** Look of the page: script ('devanagari' | 'latin'), font sizes, spacing, ... */
  style?: FactoryOptions['style'];
  /** Build switches, e.g. `{ lyricCurves: false }`. */
  build?: FactoryOptions['build'];
}

let defaultFonts: FontProvider | undefined;

/**
 * Render a bandish in one call.
 *
 * `input` is bandish JSON (text or object), swartaal XML text, or a Label Studio export (text or object).
 * Returns the SVG, its size, the dataset labels and any diagnostics. Fonts are loaded once and reused.
 *
 * @example
 *   const { svg, labels, diagnostics } = renderBandish(readFileSync('bandish.json', 'utf8'));
 */
export function renderBandish(input: string | object, options: RenderOptions = {}): RenderResult {
  const fonts = options.fonts ?? (defaultFonts ??= createFontkitProvider());
  return new Factory({ fonts, style: options.style, build: options.build }).renderBandish(input);
}
