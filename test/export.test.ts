import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import {
  Factory,
  PAGE_PRESETS,
  PX_TO_PT,
  PT_TO_EMU,
  createStyle,
  documentSize,
  getPngDensity,
  pageScale,
  pixelsForDpi,
  ptToEmu,
  setPngDensity,
  textColumn,
} from '../src/node';
import { fonts, render } from './helpers';

/* ---------------- paper geometry: px -> pt -> EMU */

test('units: 96 px is an inch, an inch is 72 pt and 914400 EMU', () => {
  assert.equal(PX_TO_PT, 0.75);
  assert.equal(PT_TO_EMU, 12700);
  assert.equal(ptToEmu(72), 914400);
  assert.equal(ptToEmu(468), 5943600, '6.5 in of text column');
});

test('textColumn: A4 and Letter with 1 in margins give the familiar 6.27 / 6.5 in columns', () => {
  const a4 = textColumn('a4'),
    letter = textColumn('letter');
  assert.equal(Math.round((a4.widthPt / 72) * 100) / 100, 6.27);
  assert.equal(Math.round((letter.widthPt / 72) * 100) / 100, 6.5);
  assert.equal(PAGE_PRESETS.letter.heightPt, 792);
  assert.equal(textColumn('letter', 36).widthPt, 612 - 72, 'wider column with smaller margins');
  assert.throws(() => textColumn('letter', 400), RangeError, 'a margin that eats the page is rejected');
});

test('documentSize: a 1000px page is 10.4 in wide and fits 6.5 in after scaling', () => {
  const raw = documentSize(1000, 800);
  assert.equal(raw.widthPt, 750);
  assert.equal(Math.round(raw.widthIn * 10) / 10, 10.4);
  const fitted = documentSize(1000 * 0.624, 800 * 0.624);
  assert.ok(Math.abs(fitted.widthPt - 468) < 0.5, 'scaled page matches the column');
});

test('pixelsForDpi: 6.5 in at 300 dpi is 1950 px, at 600 dpi twice that', () => {
  assert.equal(pixelsForDpi(468, 300), 1950);
  assert.equal(pixelsForDpi(468, 600), 3900);
  assert.equal(pixelsForDpi(0, 300), 1, 'never asks for a zero-pixel image');
});

/* ---------------- the scale decision */

test('pageScale: fitWidthPt wins over maxWidth, and nothing is ever enlarged', () => {
  const wide = createStyle({ page: { fitWidthPt: 468 } });
  assert.ok(Math.abs(pageScale(1000, wide) - 0.624) < 1e-3, 'fits a 6.5 in column');
  assert.equal(pageScale(400, wide), 1, 'a narrow page is not blown up');
  const legacy = createStyle({});
  assert.equal(pageScale(1000, legacy), 1);
  assert.equal(pageScale(2000, legacy), 0.5, 'maxWidth still clamps when no column is given');
  assert.equal(pageScale(0, legacy), 1, 'degenerate widths do not divide by zero');
});

const COLUMN = 468; // 6.5 in: US Letter with 1 in margins
const fit = (file: string) =>
  new Factory({ fonts, style: { page: { fitWidthPt: COLUMN } } }).renderBandish(
    readFileSync(new URL(`../examples/${file}`, import.meta.url), 'utf8'),
  );

test('renderBandish: fitWidthPt lands the page exactly on the column and keeps the aspect ratio', () => {
  const plain = render('full-sample.json');
  const fitted = fit('full-sample.json');
  assert.ok(Math.abs(fitted.widthPt - COLUMN) < 1, `page is ${fitted.widthPt}pt wide, expected ${COLUMN}`);
  assert.ok(fitted.scale < 1, 'the wide page was actually shrunk');
  assert.ok(
    Math.abs(fitted.heightPt / fitted.widthPt - plain.height / plain.width) < 1e-9,
    'aspect ratio is untouched, so nothing is squashed',
  );
  assert.equal(fitted.widthEmu, ptToEmu(fitted.widthPt));
});

test('renderBandish: a fitted page still prints its swars at a readable size', () => {
  const styled = createStyle({ page: { fitWidthPt: COLUMN } });
  const fitted = fit('full-sample.json');
  const swarPt = styled.fontSize.swar * fitted.scale * PX_TO_PT;
  assert.ok(swarPt > 9, `24px swars land at ${swarPt.toFixed(1)}pt once fitted; 9pt is the floor`);
});

/* ---------------- transparent background */

test('SVG: a transparent background emits no white rect over the document', () => {
  const opts = { style: { background: 'transparent' } } as const;
  const svg = new Factory({ fonts, ...opts }).renderBandish(
    JSON.stringify({ metadata: { title: 'x' }, sections: [] }),
  ).svg;
  assert.equal(svg.includes('<rect width="100%" height="100%"'), false);
  const white = render('bhoop-swarmalika.json').svg;
  assert.equal(white.includes('<rect width="100%" height="100%" fill="#ffffff"/>'), true);
});

/* ---------------- PNG resolution metadata: the Word/Google Docs placement bug */

/** minimal but valid 1x1 PNG, enough to exercise the chunk splicing */
function tinyPng(): Uint8Array {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Uint8Array) => {
    let c = 0xffffffff;
    for (const byte of b) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    view.setUint32(8 + data.length, crc(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  new DataView(ihdr.buffer).setUint32(0, 1);
  new DataView(ihdr.buffer).setUint32(4, 1);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8 bit, RGBA
  const raw = new Uint8Array([0, 0, 0, 0, 0]);
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ];
  return new Uint8Array(parts.flatMap((p) => [...p]));
}

/** density, rounded, asserting the chunk is actually there */
function densityOf(png: Uint8Array): number {
  const dpi = getPngDensity(png);
  if (dpi === undefined) throw new Error('expected a pHYs chunk');
  return Math.round(dpi);
}

test('setPngDensity: writes pixels-per-metre before IDAT so readers get the real size', () => {
  const png = tinyPng();
  assert.equal(getPngDensity(png), undefined, 'resvg output carries no resolution');
  const tagged = setPngDensity(png, 300);
  assert.equal(densityOf(tagged), 300);
  assert.ok(tagged.length > png.length);
  const text = Buffer.from(tagged).toString('latin1');
  assert.ok(text.indexOf('pHYs') < text.indexOf('IDAT'), 'pHYs must precede the image data');
  assert.ok(text.indexOf('IDAT') < text.indexOf('IEND'), 'chunk order kept');
});

test('setPngDensity: tagging twice replaces the chunk instead of stacking it', () => {
  const once = setPngDensity(tinyPng(), 300);
  const twice = setPngDensity(once, 600);
  assert.equal(densityOf(twice), 600);
  assert.equal(Buffer.from(twice).toString('latin1').split('pHYs').length - 1, 1);
});

test('setPngDensity: rejects junk instead of corrupting it', () => {
  assert.throws(() => setPngDensity(new Uint8Array([1, 2, 3]), 300), TypeError);
  assert.throws(() => setPngDensity(tinyPng(), 0), RangeError);
  assert.throws(() => setPngDensity(tinyPng(), Number.NaN), RangeError);
  assert.throws(() => getPngDensity(new Uint8Array([1, 2, 3])), TypeError);
});
