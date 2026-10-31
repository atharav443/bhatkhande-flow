import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { Factory, createFontkitProvider, toYOLO } from '../src/node';

/** usage: tsx cli/render.ts <bandish.json|.xml> [outDir=out] [--png] [--latin] [--no-lyric-curves] */
const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith('--'));
const file = files[0];
if (!file) { console.error('usage: render <bandish.json|xml> [outDir] [--png] [--latin]'); process.exit(1); }
const outDir = files[1] ?? 'out';
const f = new Factory({ fonts: createFontkitProvider(), style: args.includes('--latin') ? { script: 'latin' } : {}, build: { lyricCurves: !args.includes('--no-lyric-curves') } });
const r = f.renderBandish(readFileSync(file, 'utf8'));
mkdirSync(outDir, { recursive: true });
const stem = basename(file, extname(file));
writeFileSync(join(outDir, `${stem}.svg`), r.svg);
writeFileSync(join(outDir, `${stem}.labels.json`), JSON.stringify(r.labels, null, 0));
writeFileSync(join(outDir, `${stem}.yolo.txt`), toYOLO(r.labels, r.width, r.height));
if (args.includes('--png')) writeFileSync(join(outDir, `${stem}.png`), new Resvg(r.svg, { fitTo: { mode: 'zoom', value: 2 } }).render().asPng());
for (const d of r.diagnostics) console.log(`[${d.level}] ${d.code}: ${d.message}${d.path ? `  (${d.path})` : ''}`);
const counts: Record<string, number> = {};
for (const l of r.labels) counts[l.cls] = (counts[l.cls] ?? 0) + 1;
console.log(`${stem}: ${Math.round(r.width)}x${Math.round(r.height)}px  labels ${JSON.stringify(counts)}`);
