// Render one bandish file to SVG (and optionally PNG), with its dataset labels.
//
// Usage:
//   npm run render -- <input> [outDir] [options]
//
//   <input>   bandish JSON, swartaal XML or a Label Studio export (the format is detected from the content)
//   outDir    where to write the files (default: out)
//
// Options:
//   --png               also write a PNG at 2x size
//   --latin             print swars in Latin letters (S R G M) instead of Devanagari
//   --no-lyric-curves   no curve under grouped syllables (Label Studio annotations do not mark them)
//
// Writes, for input "bhimpalasi-geet.json":
//   out/bhimpalasi-geet.svg           the page
//   out/bhimpalasi-geet.labels.json   every drawn element: class, box, data
//   out/bhimpalasi-geet.yolo.txt      the same boxes in YOLO format
//   out/bhimpalasi-geet.png           with --png

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { Factory, createFontkitProvider, toYOLO, type Label } from '../src/node';

const USAGE =
  'usage: npm run render -- <input.json|input.xml> [outDir] [--png] [--latin] [--no-lyric-curves]';
const PNG_ZOOM = 2;

// ---------------------------------------------------------------- read the command line

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const [inputFile, outDir = 'out'] = args.filter((arg) => !arg.startsWith('--'));

if (!inputFile) {
  console.error(USAGE);
  process.exit(1);
}

// ---------------------------------------------------------------- render

const factory = new Factory({
  fonts: createFontkitProvider(),
  style: flags.has('--latin') ? { script: 'latin' } : {},
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

if (flags.has('--png')) {
  const png = new Resvg(result.svg, { fitTo: { mode: 'zoom', value: PNG_ZOOM } }).render().asPng();
  writeFileSync(outPath('.png'), png);
}

// ---------------------------------------------------------------- report

for (const d of result.diagnostics) {
  const where = d.path ? `  (${d.path})` : '';
  console.log(`[${d.level}] ${d.code}: ${d.message}${where}`);
}

const size = `${Math.round(result.width)}x${Math.round(result.height)}px`;
console.log(`${stem}: ${size}  labels ${JSON.stringify(countByClass(result.labels))}`);

function countByClass(labels: Label[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const label of labels) counts[label.cls] = (counts[label.cls] ?? 0) + 1;
  return counts;
}
