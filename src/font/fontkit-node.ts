import { createRequire } from 'node:module';
import * as fontkit from 'fontkit';
import type { FontProvider } from './provider';
import { createProviderFromFonts, type FKFont } from './fontkit-core';

const require = createRequire(import.meta.url);
const file = (pkg: string, f: string) => require.resolve(`${pkg}/files/${f}`);
const open = (p: string): FKFont => fontkit.openSync(p) as FKFont;

/** Node provider: loads the @fontsource fonts from node_modules and shapes with fontkit (see fontkit-core.ts). */
export function createFontkitProvider(): FontProvider {
  return createProviderFromFonts({
    tiroDeva: open(file('@fontsource/tiro-devanagari-hindi', 'tiro-devanagari-hindi-devanagari-400-normal.woff')),
    tiroLatin: open(file('@fontsource/tiro-devanagari-hindi', 'tiro-devanagari-hindi-latin-400-normal.woff')),
    notoBold: open(file('@fontsource/noto-serif-devanagari', 'noto-serif-devanagari-devanagari-700-normal.woff')),
    notoReg: open(file('@fontsource/noto-serif-devanagari', 'noto-serif-devanagari-devanagari-400-normal.woff')),
  });
}
