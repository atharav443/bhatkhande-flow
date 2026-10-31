// Bundles the browser entry and copies fonts + examples next to the playground:  npm run build:web
import { build } from 'esbuild';
import { cpSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
await build({
  entryPoints: [join(root, 'src/browser.ts')],
  bundle: true,
  format: 'iife',
  globalName: 'BhatkhandeFlow',
  platform: 'browser',
  target: 'es2020',
  outfile: join(root, 'web/bhatkhande-flow.js'),
  minify: true,
  logLevel: 'info',
});
const fonts = join(root, 'web/fonts');
mkdirSync(fonts, { recursive: true });
for (const [pkg, f] of [
  ['@fontsource/tiro-devanagari-hindi', 'tiro-devanagari-hindi-devanagari-400-normal.woff'],
  ['@fontsource/tiro-devanagari-hindi', 'tiro-devanagari-hindi-latin-400-normal.woff'],
  ['@fontsource/noto-serif-devanagari', 'noto-serif-devanagari-devanagari-400-normal.woff'],
  ['@fontsource/noto-serif-devanagari', 'noto-serif-devanagari-devanagari-700-normal.woff'],
])
  cpSync(require.resolve(`${pkg}/files/${f}`), join(fonts, f));
const ex = join(root, 'web/examples');
mkdirSync(ex, { recursive: true });
const copyJson = (dir, prefix = '') => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) copyJson(p, `${prefix}${f}-`);
    else if (/\.(json|xml)$/.test(f)) cpSync(p, join(ex, prefix + f));
  }
};
copyJson(join(root, 'examples'));
console.log('web/ ready: npm run web  ->  http://localhost:5173');
