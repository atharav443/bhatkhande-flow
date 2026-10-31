// Convert a bandish JSON (or a Label Studio export) into swartaal XML (<hindustani-composition>).
//
// Usage:
//   npx tsx cli/bandish2xml.ts <in.json> <out.xml>
//
// Written: metadata (title, raag, taal), sections, lines, matras (index, volta, repeat signs),
// swars (octave, komal, tivra, khatka, duration, meend, id), kan (also nested), rests,
// held swars and lyrics.
// Not written: tihai items and top-level spans. They are reported, and the XML is still written.

import { readFileSync, writeFileSync } from 'node:fs';
import { escapeXml as escapeText } from '../src/core/text';
import { isLabelStudio, labelStudioToBandish } from '../src/input/fromLabelStudio';

const USAGE = 'usage: npx tsx cli/bandish2xml.ts <in.json> <out.xml>';

// The input is loose, user-written JSON, so it is read as plain objects.
type Json = Record<string, any>;

// ---------------------------------------------------------------- helpers

/** Escape text for use inside XML. */
function escapeXml(value: unknown): string {
  return escapeText(String(value));
}

/**
 * ` name="value"` for each attribute that is set.
 * Skipped: undefined, null, false, '' and 0 (0 is the default, e.g. madhya octave).
 */
function attributes(values: Json): string {
  return Object.entries(values)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== false && value !== '' && value !== 0,
    )
    .map(([name, value]) => ` ${name}="${escapeXml(value === true ? 'true' : value)}"`)
    .join('');
}

/** JSON event shorthand: "-" is a held swar, "," a rest, anything else a swar's text. */
const HELD = new Set(['-', '–', '—', 'ऽ', '_', '~']);
const REST = new Set(['rest', ',', '0']);

function expandShorthand(event: Json | string): Json {
  if (typeof event !== 'string') return event;
  if (HELD.has(event.trim())) return { type: 'extend' };
  if (REST.has(event.trim())) return { type: 'rest' };
  return { swar: event };
}

// ---------------------------------------------------------------- elements

/** <kan> grace note; a kan can hold its own <kan> (kan inside kan). */
function kanXml(kan: Json | string, indent: string): string[] {
  const k = typeof kan === 'string' ? { swar: kan } : kan;
  const attrs = attributes({ octave: k.octave, komal: k.komal, tivra: k.tivra });
  const nested: (Json | string)[] = k.kan === undefined ? [] : Array.isArray(k.kan) ? k.kan : [k.kan];

  if (nested.length === 0) return [`${indent}<kan${attrs}>${escapeXml(k.swar)}</kan>`];
  return [
    `${indent}<kan${attrs}>${escapeXml(k.swar)}`,
    ...nested.flatMap((inner) => kanXml(inner, indent + '  ')),
    `${indent}</kan>`,
  ];
}

/** One event: <swar>, <extend/> or <rest/>, followed by its <lyric> if it has one. */
function eventXml(rawEvent: Json | string, indent: string): string[] {
  const event = expandShorthand(rawEvent);
  const lines: string[] = [];

  if (event.type === 'extend' || event.type === 'rest') {
    lines.push(`${indent}<${event.type}${attributes({ duration: event.duration })}/>`);
  } else {
    const attrs = attributes({
      id: event.id,
      octave: event.octave,
      komal: event.komal,
      tivra: event.tivra,
      khatka: event.khatka,
      duration: event.duration,
      meend: event.meend,
    });
    const swarText = escapeXml(event.swar ?? event.text ?? event.degree);
    const kans: (Json | string)[] =
      event.kan === undefined ? [] : Array.isArray(event.kan) ? event.kan : [event.kan];

    if (kans.length === 0) {
      lines.push(`${indent}<swar${attrs}>${swarText}</swar>`);
    } else {
      lines.push(`${indent}<swar${attrs}>${swarText}`);
      for (const kan of kans) lines.push(...kanXml(kan, indent + '  '));
      lines.push(`${indent}</swar>`);
    }
  }

  if (event.lyric !== undefined) lines.push(`${indent}<lyric>${escapeXml(event.lyric)}</lyric>`);
  return lines;
}

function metadataXml(metadata: Json): string[] {
  const lines = ['  <metadata>'];
  if (metadata.title) lines.push(`    <title>${escapeXml(metadata.title)}</title>`);
  if (metadata.raag) lines.push(`    <raag>${escapeXml(metadata.raag)}</raag>`);
  if (typeof metadata.taal === 'string') {
    lines.push(`    <taal name="${escapeXml(metadata.taal)}"/>`);
  } else if (metadata.taal) {
    const t = metadata.taal;
    lines.push(
      `    <taal${attributes({
        name: t.name,
        vibhags: t.vibhags?.join(','),
        markers: t.markers?.join(','),
        'total-matras': t.totalMatras,
      })}/>`,
    );
  }
  lines.push('  </metadata>');
  return lines;
}

/** Collects what this converter cannot write, so it can be reported instead of lost silently. */
const skipped: string[] = [];

function sectionXml(section: Json): string[] {
  const lines = [`  <section${attributes({ name: section.name, 'start-matra': section.startMatra })}>`];

  section.lines.forEach((line: Json, lineIndex: number) => {
    const lineAttrs = attributes({
      number: line.number ?? lineIndex + 1,
      'repeat-start': line.repeatStart,
      'repeat-end': line.repeatEnd,
    });
    lines.push(`    <line${lineAttrs}>`);

    for (const matra of line.matras) {
      if (matra.tihai !== undefined) {
        skipped.push(`tihai in section "${section.name}", line ${lineIndex + 1}`);
        continue;
      }
      const matraAttrs = attributes({
        index: matra.index,
        volta: matra.volta,
        'repeat-before': matra.repeatBefore,
        'repeat-after': matra.repeatAfter,
      });
      lines.push(`      <matra${matraAttrs}>`);
      for (const event of matra.events ?? []) lines.push(...eventXml(event, '        '));
      lines.push('      </matra>');
    }

    lines.push('    </line>');
  });

  lines.push('  </section>');
  return lines;
}

// ---------------------------------------------------------------- main

const [inFile, outFile] = process.argv.slice(2);
if (!inFile || !outFile) {
  console.error(USAGE);
  process.exit(1);
}

const parsed = JSON.parse(readFileSync(inFile, 'utf8'));
const bandish: Json = isLabelStudio(parsed)
  ? labelStudioToBandish(Array.isArray(parsed) ? parsed : [parsed])
  : parsed;

if (Array.isArray(bandish.spans) && bandish.spans.length > 0) {
  skipped.push(`${bandish.spans.length} top-level span(s)`);
}

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<hindustani-composition version="1">',
  ...metadataXml(bandish.metadata ?? {}),
  ...bandish.sections.flatMap(sectionXml),
  '</hindustani-composition>',
  '',
].join('\n');

writeFileSync(outFile, xml);
console.log(`${outFile}: ${bandish.sections.length} section(s)`);
for (const what of skipped) console.log(`  not converted (add it to the XML by hand): ${what}`);
