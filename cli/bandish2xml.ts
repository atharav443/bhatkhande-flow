import { readFileSync, writeFileSync } from 'node:fs';
import { isLabelStudio, labelStudioToBandish } from '../src/input/fromLabelStudio';

/** usage: tsx cli/bandish2xml.ts <in.json> <out.xml>   (in = bandish JSON, or a Label Studio export) -> swartaal <hindustani-composition> XML */
const [inp, out] = process.argv.slice(2);
if (!inp || !out) { console.error('usage: bandish2xml <in.json> <out.xml>'); process.exit(1); }
const j = JSON.parse(readFileSync(inp, 'utf8'));
const b = isLabelStudio(j) ? labelStudioToBandish(Array.isArray(j) ? j : [j]) : j;

const esc = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attrs = (o: Record<string, unknown>) => Object.entries(o).filter(([, v]) => v !== undefined && v !== false && v !== null && v !== 0 && v !== '').map(([k, v]) => ` ${k}="${esc(v === true ? 'true' : v)}"`).join('');

function kan(k: any, pad: string): string {
  const nested = (k.kan ?? []) as any[];
  const a = attrs({ octave: k.octave, komal: k.komal, tivra: k.tivra });
  return nested.length ? `${pad}<kan${a}>${esc(k.swar)}\n${nested.map((n) => kan(n, pad + '  ')).join('\n')}\n${pad}</kan>` : `${pad}<kan${a}>${esc(k.swar)}</kan>`;
}

function event(e: any, pad: string): string[] {
  const rows: string[] = [];
  const lyric = e.lyric !== undefined ? `${pad}<lyric>${esc(e.lyric)}</lyric>` : undefined;
  if (e.type === 'extend' || e.type === 'rest') {
    rows.push(`${pad}<${e.type}${attrs({ duration: e.duration })}/>`);
  } else {
    const a = attrs({ octave: e.octave, komal: e.komal, tivra: e.tivra, khatka: e.khatka, duration: e.duration });
    const kans = (e.kan ?? []) as any[];
    if (kans.length) rows.push(`${pad}<swar${a}>${esc(e.swar)}`, ...kans.map((k) => kan(k, pad + '  ')), `${pad}</swar>`);
    else rows.push(`${pad}<swar${a}>${esc(e.swar)}</swar>`);
  }
  if (lyric) rows.push(lyric);
  return rows;
}

const md = b.metadata ?? {};
const x: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', `<hindustani-composition version="1">`, '  <metadata>'];
if (md.title) x.push(`    <title>${esc(md.title)}</title>`);
if (md.raag) x.push(`    <raag>${esc(md.raag)}</raag>`);
if (md.taal) x.push(typeof md.taal === 'string' ? `    <taal name="${esc(md.taal)}"/>` : `    <taal${attrs({ name: md.taal.name, 'total-matras': md.taal.totalMatras })}/>`);
x.push('  </metadata>');
for (const s of b.sections as any[]) {
  x.push(`  <section${attrs({ name: s.name, 'start-matra': s.startMatra })}>`);
  s.lines.forEach((l: any, i: number) => {
    x.push(`    <line${attrs({ number: l.number ?? i + 1, 'repeat-start': l.repeatStart, 'repeat-end': l.repeatEnd })}>`);
    for (const m of l.matras) {
      x.push(`      <matra${attrs({ index: m.index, volta: m.volta, 'repeat-before': m.repeatBefore, 'repeat-after': m.repeatAfter })}>`);
      for (const e of m.events) x.push(...event(e, '        '));
      x.push('      </matra>');
    }
    x.push('    </line>');
  });
  x.push('  </section>');
}
x.push('</hindustani-composition>', '');
writeFileSync(out, x.join('\n'));
console.log(`${out}: ${b.sections.length} section(s)`);
