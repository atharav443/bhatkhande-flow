import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, count, of, cy, cx } from './helpers';

test('Bihag geet 4 (Purna p15): every class count equals the Label Studio annotation', () => {
  const c = count(render('bihag-geet4-jhaptaal.json', { lyricCurves: false }).labels);
  const expected = {
    swar: 26,
    lyric: 23,
    line_end_bar: 4,
    swar_rest: 7,
    lyric_rest: 10,
    taal_marker: 12,
    vibhag_line: 9,
    octave_dot: 4,
    khatka_bracket: 2,
    kan_swar: 3,
    grouping_curve: 1,
  };
  for (const [k, v] of Object.entries(expected))
    assert.equal(c[k], v, `${k}: rendered ${c[k]}, annotated ${v}`);
});

test('Bhimpalasi geet (Pratham p21): counts equal the annotation (swar, lyric, dash, ऽ, komal, dots, curves, markers, bars)', () => {
  const c = count(render('bhimpalasi-geet.json').labels);
  const expected = {
    swar: 61,
    lyric: 42,
    taal_marker: 16,
    swar_rest: 9,
    lyric_rest: 28,
    octave_dot: 12,
    grouping_curve: 12,
    komal_mark: 21,
  };
  for (const [k, v] of Object.entries(expected))
    assert.equal(c[k], v, `${k}: rendered ${c[k]}, annotated ${v}`);
  assert.equal(
    (c.vibhag_line ?? 0) + (c.line_end_bar ?? 0),
    16,
    'annotated vibhag_bar = vibhag lines + row-end bars',
  );
});

test('Alhaiya Bilawal dhamar (Purna p04): kan, swar, lyric, dash and bar counts match', () => {
  const c = count(render('alhaiya-bilawal-dhamar.json', { lyricCurves: false }).labels);
  const expected = {
    swar: 59,
    swar_rest: 4,
    lyric: 43,
    lyric_rest: 20,
    taal_marker: 16,
    vibhag_line: 12,
    line_end_bar: 4,
    kan_swar: 9,
    komal_mark: 2,
    grouping_curve: 7,
  };
  for (const [k, v] of Object.entries(expected))
    assert.equal(c[k], v, `${k}: rendered ${c[k]}, annotated ${v}`);
});

/* ---------------- printed conventions */

test('Label Studio import: Bhairav geet 2 (ektaal) re-renders with the annotated class counts', () => {
  const c = count(render('labelstudio/bhairav-geet2-ektaal.json', { lyricCurves: false }).labels);
  const expected = {
    swar: 65,
    swar_rest: 13,
    lyric: 44,
    lyric_rest: 34,
    taal_marker: 36,
    vibhag_line: 30,
    line_end_bar: 6,
    komal_mark: 16,
    grouping_curve: 6,
    kan_swar: 3,
  };
  for (const [k, v] of Object.entries(expected))
    assert.equal(c[k], v, `${k}: rendered ${c[k]}, annotated ${v}`);
});

test('Label Studio: a raw task export renders directly, and a short antara row sits under its own cycle positions', () => {
  const r = render('labelstudio/raag-bhairav-geet3-raw-export.json', { lyricCurves: false });
  const c = count(r.labels);
  // komal_mark is 9, not the 8 annotated: the kan dha carries kan_variant komal and the scan prints its bar
  const expected = {
    swar: 28,
    swar_rest: 15,
    lyric: 23,
    lyric_rest: 20,
    taal_marker: 10,
    vibhag_line: 7,
    line_end_bar: 3,
    komal_mark: 9,
    kan_swar: 5,
    octave_dot: 4,
    grouping_curve: 3,
  };
  for (const [k, v] of Object.entries(expected))
    assert.equal(c[k], v, `${k}: rendered ${c[k]}, annotated ${v}`);
  const rows = [...new Set(of(r.labels, 'swar').map((l) => Math.round(cy(l))))].sort((a, b) => a - b);
  const last = of(r.labels, 'swar').filter((l) => Math.round(cy(l)) === rows[rows.length - 1]);
  assert.ok(
    Math.min(...last.map(cx)) > r.width / 2,
    'antara (matras 9 to 16) starts in the right half, like the printed page',
  );
});
