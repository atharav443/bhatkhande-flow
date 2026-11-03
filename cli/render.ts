// Render one bandish file to SVG (and optionally PNG), with its dataset labels.
//
// Usage:
//   npm run render -- <input> [outDir] [options]
//
//   <input>   bandish JSON, swartaal XML or a Label Studio export (the format is detected from the content)
//   outDir    where to write the files (default: out)
//
// Options:
//   --png                 also write a PNG, sized from the page's printed width
//   --dpi <n>             PNG resolution for --png (default 300)
//   --page <a4|letter>    fit the page to that sheet's text column (1 in margins by default)
//   --page-margin <pt>    margin used by --page (default 72)
//   --fit-width <pt>      fit the page to an explicit column width in points instead of --page
//   --transparent         no white background, so the page inherits the document's background
//   --latin               print swars in Latin letters (S R G M) instead of Devanagari
//   --no-lyric-curves     no curve under grouped syllables (Label Studio annotations do not mark them)
//
// Writes, for input "bhimpalasi-geet.json":
//   out/bhimpalasi-geet.svg           the page
//   out/bhimpalasi-geet.labels.json   every drawn element: class, box, data
//   out/bhimpalasi-geet.yolo.txt      the same boxes in YOLO format
//   out/bhimpalasi-geet.png           with --png, carrying its dpi so Word/Docs place it at real size

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { Factory, createFontkitProvider, toYOLO, type Label } from '../src/node';
import { PAGE_PRESETS, textColumn, pixelsForDpi, type PagePresetName } from '../src/export/pagefit';
import { setPngDensity } from '../src/export/png';

const USAGE = [
  'usage: npm run render -- <input.json|input.xml> [outDir] [options]',
  '  --png              also write a PNG',
  '  --dpi <n>          PNG resolution (default 300)',
  '  --page <a4|letter> fit the page to a sheet text column',
  '  --page-margin <pt> margin for --page (default 72)',
  '  --fit-width <pt>   fit the page to an explicit column width',
  '  --transparent      no white background',
  '  --latin            Latin swar names',
  '  --no-lyric-curves  no curves under grouped syllables',
].join('\n');

// ---------------------------------------------------------------- read the command line

const VALUE_FLAGS = new Set(['--dpi', '--page', '--page-margin', '--fit-width']);
const args = process.argv.slice(2);
const flags = new Set<string>();
const values = new Map<string, string>();
const positional: string[] = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!arg.startsWith('--')) {
    positional.push(arg);
    continue;
  }
  const eq = arg.indexOf('=');
  const name = eq < 0 ? arg : arg.slice(0, eq);
  if (!VALUE_FLAGS.has(name)) {
    flags.add(name);
    continue;
  }
  const value = eq < 0 ? args[++i] : arg.slice(eq + 1);
  if (value === undefined) fail(`${name} needs a value`);
  values.set(name, value);
}

function fail(message: string): never {
  console.error(`${message}\n\n${USAGE}`);
  process.exit(1);
}

function numberFlag(name: string): number | undefined {
  const raw = values.get(name);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) fail(`${name} expects a positive number, got "${raw}"`);
  return value;
}

if (flags.has('--help') || flags.has('-h')) {
  console.log(USAGE);
  process.exit(0);
}

const [inputFile, outDir = 'out'] = positional;
if (!inputFile) fail('no input file');

const presetName = values.get('--page');
if (presetName !== undefined && !(presetName in PAGE_PRESETS)) {
  fail(`--page must be one of ${Object.keys(PAGE_PRESETS).join(', ')}, got "${presetName}"`);
}
const pageMarginPt = numberFlag('--page-margin') ?? 72;
const fitWidthPt =
  numberFlag('--fit-width') ??
  (presetName ? textColumn(presetName as PagePresetName, pageMarginPt).widthPt : undefined);
const dpi = numberFlag('--dpi') ?? 300;

// ---------------------------------------------------------------- render

const factory = new Factory({
  fonts: createFontkitProvider(),
  style: {
    ...(flags.has('--latin') ? { script: 'latin' as const } : {}),
    ...(flags.has('--transparent') ? { background: 'transparent' } : {}),
    ...(fitWidthPt === undefined ? {} : { page: { fitWidthPt } }),
  },
  build: { lyricCurves: !flags.has('--no-lyric-curves') },
});
const result = factory.renderBandish(readFileSync(inputFile, 'utf8'));

// ---------------------------------------------------------------- write the files

const stem = basename(inputFile, extname(inputFile));
const outPath = (extension: string) => join(outDir, `${stem}${extension}`);

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath('.svg'), result.svg);
writeFileSync(outPath('.labels.json'), JSON.stringify(result.labels));
writeFileSync(outPath('.yolo.txt'), toYOLO(result.labels, result.width, result.height));

let pngBytes = 0;
if (flags.has('--png')) {
  const pixels = pixelsForDpi(result.widthPt, dpi);
  const raster = new Resvg(result.svg, { fitTo: { mode: 'width', value: pixels } }).render().asPng();
  const png = setPngDensity(raster, dpi);
  writeFileSync(outPath('.png'), png);
  pngBytes = png.length;
}

// ---------------------------------------------------------------- report

for (const d of result.diagnostics) {
  const where = d.path ? `  (${d.path})` : '';
  console.log(`[${d.level}] ${d.code}: ${d.message}${where}`);
}

const px = `${Math.round(result.width)}x${Math.round(result.height)}px`;
const inches = `${(result.widthPt / 72).toFixed(1)}x${(result.heightPt / 72).toFixed(1)}in`;
const fit = fitWidthPt === undefined ? '' : `  fitted to ${fitWidthPt.toFixed(1)}pt`;
const png = flags.has('--png') ? `  png ${dpi}dpi ${Math.round(pngBytes / 1024)}KB` : '';
console.log(`${stem}: ${px}  = ${inches}${fit}  labels ${JSON.stringify(countByClass(result.labels))}${png}`);

function countByClass(labels: Label[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const label of labels) counts[label.cls] = (counts[label.cls] ?? 0) + 1;
  return counts;
}
