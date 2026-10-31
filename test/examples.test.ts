import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, count } from './helpers';

test('every example renders without errors and the SVG is well formed', () => {
  for (const f of [
    'bhoop-swarmalika.json',
    'bhimpalasi-geet.json',
    'khamaj-dhrupad-chautaal.json',
    'alhaiya-bilawal-dhamar.json',
    'bihag-geet4-jhaptaal.json',
    'kan-nesting-demo.json',
  ]) {
    const r = render(f);
    assert.deepEqual(
      r.diagnostics.filter((d) => d.level === 'error'),
      [],
      f,
    );
    assert.match(r.svg, /^<svg[^>]+xmlns/);
    assert.ok(!/NaN|undefined/.test(r.svg), f);
  }
});

/* ---------------- Label Studio round trip: annotations -> bandish JSON -> render -> same label counts */

test('swartaal XML made from the Bhairav export renders the same SVG as the export itself', () => {
  assert.equal(
    render('raag-bhairav-geet3.xml', { lyricCurves: false }).svg,
    render('labelstudio/raag-bhairav-geet3-raw-export.json', { lyricCurves: false }).svg,
  );
});

test('full sample: the JSON and the XML give the same SVG, and every feature is drawn', () => {
  const j = render('full-sample.json'),
    x = render('full-sample.xml');
  assert.equal(x.svg, j.svg);
  const c = count(j.labels);
  const expected = {
    volta_bracket: 2,
    repeat_bar: 2,
    tihai_bracket: 1,
    meend: 2,
    khatka_bracket: 2,
    kan_swar: 3,
    komal_mark: 5,
    tivra_mark: 8,
    octave_dot: 6,
    section_heading: 4,
  };
  for (const [k, v] of Object.entries(expected))
    assert.equal(c[k], v, `${k}: rendered ${c[k]}, expected ${v}`);
  assert.deepEqual(
    j.diagnostics.filter((d) => d.level !== 'info'),
    [],
    'the sample has no warnings or errors',
  );
});
