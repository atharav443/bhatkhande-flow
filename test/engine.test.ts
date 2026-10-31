import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Factory, createFontkitProvider, ColumnGrid, resolveTaal, Fraction, Voice, VoiceMode, SwarNote, Tables, createStyle, type Label } from '../src/node';

const fonts = createFontkitProvider();
const render = (file: string, build = {}) => new Factory({ fonts, build }).renderBandish(readFileSync(new URL(`../examples/${file}`, import.meta.url), 'utf8'));
const count = (ls: Label[]) => ls.reduce<Record<string, number>>((a, l) => ((a[l.cls] = (a[l.cls] ?? 0) + 1), a), {});
const of = (ls: Label[], c: string) => ls.filter((l) => l.cls === c);
const cy = (l: Label) => (l.bbox[1] + l.bbox[3]) / 2;
const cx = (l: Label) => (l.bbox[0] + l.bbox[2]) / 2;

/* ---------------- the page grid (B1, B6, B7) */
test('column grid: equal matra columns, bars only between vibhags, never before column 0', () => {
  const g = new ColumnGrid(resolveTaal({ name: 'jhaptaal' }, []), 1, 40, 16, 0);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => g.barBefore(c)), [false, false, true, false, false, true, false, true, false, false]);
  assert.equal(g.x(1) - g.x(0), 40);
  assert.equal(g.x(2) - g.x(1), 56, 'a vibhag bar adds its gap');
  const k = new ColumnGrid(resolveTaal({ name: 'teentaal' }, []), 9, 40, 16, 0);
  assert.equal(k.colOf(9), 0); assert.equal(k.colOf(1), 8); assert.equal(k.posOf(15), 8);
});

/* ---------------- label counts against the hand annotations of the scanned pages */
test('Bihag geet 4 (Purna p15): every class count equals the Label Studio annotation', () => {
  const c = count(render('bihag-geet4-jhaptaal.json', { lyricCurves: false }).labels);
  const expected = { swar: 26, lyric: 23, line_end_bar: 4, swar_rest: 7, lyric_rest: 10, taal_marker: 12, vibhag_line: 9, octave_dot: 4, khatka_bracket: 2, kan_swar: 3, grouping_curve: 1 };
  for (const [k, v] of Object.entries(expected)) assert.equal(c[k], v, `${k}: rendered ${c[k]}, annotated ${v}`);
});

test('Bhimpalasi geet (Pratham p21): counts equal the annotation (swar, lyric, dash, ऽ, komal, dots, curves, markers, bars)', () => {
  const c = count(render('bhimpalasi-geet.json').labels);
  const expected = { swar: 61, lyric: 42, taal_marker: 16, swar_rest: 9, lyric_rest: 28, octave_dot: 12, grouping_curve: 12, komal_mark: 21 };
  for (const [k, v] of Object.entries(expected)) assert.equal(c[k], v, `${k}: rendered ${c[k]}, annotated ${v}`);
  assert.equal((c.vibhag_line ?? 0) + (c.line_end_bar ?? 0), 16, 'annotated vibhag_bar = vibhag lines + row-end bars');
});

test('Alhaiya Bilawal dhamar (Purna p04): kan, swar, lyric, dash and bar counts match', () => {
  const c = count(render('alhaiya-bilawal-dhamar.json', { lyricCurves: false }).labels);
  const expected = { swar: 59, swar_rest: 4, lyric: 43, lyric_rest: 20, taal_marker: 16, vibhag_line: 12, line_end_bar: 4, kan_swar: 9, komal_mark: 2, grouping_curve: 7 };
  for (const [k, v] of Object.entries(expected)) assert.equal(c[k], v, `${k}: rendered ${c[k]}, annotated ${v}`);
});

/* ---------------- printed conventions */
test('B2: line order is swar, lyric, then taal markers below the lyrics', () => {
  const ls = render('bhimpalasi-geet.json').labels;
  const firstRow = (c: string) => Math.min(...of(ls, c).map(cy));
  assert.ok(firstRow('swar') < firstRow('lyric') && firstRow('lyric') < firstRow('taal_marker'));
});

test('B3: no bar at the start of a row; bars span swar and lyric lines but not the markers', () => {
  const ls = render('bhimpalasi-geet.json').labels;
  const minSwarX = Math.min(...of(ls, 'swar').map((l) => l.bbox[0]));
  for (const b of [...of(ls, 'vibhag_line'), ...of(ls, 'line_end_bar')]) assert.ok(b.bbox[0] > minSwarX, 'a bar left of the first swar');
  const marker = Math.min(...of(ls, 'taal_marker').map((l) => l.bbox[1]));
  const bar = of(ls, 'vibhag_line')[0];
  assert.ok(bar.bbox[3] <= marker + 1, 'bars must stop above the marker line');
});

test('B4: held swar is a dash in the swar line; ऽ appears only in the lyric line', () => {
  const r = render('bhimpalasi-geet.json');
  assert.ok(of(r.labels, 'swar_rest').length > 0);
  assert.ok(!/class="swar[^_"]*"[^>]*data-text="ऽ"/.test(r.svg));
  const swarY = Math.min(...of(r.labels, 'swar').map(cy)), restY = Math.min(...of(r.labels, 'swar_rest').map(cy));
  const lyricY = Math.min(...of(r.labels, 'lyric').map(cy));
  assert.ok(Math.abs(restY - swarY) < Math.abs(restY - lyricY), 'dash sits on the swar line');
});

test('B6: vibhag bars line up vertically across all rows of a section', () => {
  const ls = render('khamaj-dhrupad-chautaal.json').labels;
  const xs = [...new Set(of(ls, 'vibhag_line').map((l) => Math.round(cx(l))))];
  assert.equal(xs.length, 5, `chautaal has 5 inner bars per row, all aligned (got x = ${xs.join(',')})`);
});

test('B7: a pickup row is right-aligned and closed by a bar; full rows start at sam', () => {
  const ls = render('bihag-geet4-jhaptaal.json').labels;
  const ends = of(ls, 'line_end_bar').map((l) => Math.round(cx(l)));
  assert.equal(new Set(ends).size, 1, 'pickup end bar aligns with the full rows');
  const pickupSwars = of(ls, 'swar').sort((a, b) => a.bbox[1] - b.bbox[1]).slice(0, 2);
  const fullRowFirst = Math.min(...of(ls, 'swar').map((l) => l.bbox[0]));
  assert.ok(Math.min(...pickupSwars.map((l) => l.bbox[0])) > fullRowFirst + 200, 'pickup sits at the right');
});

test('B9: komal bar under, tivra stroke above, taar dot above, mandra dot below the swar', () => {
  const ls = render('kan-nesting-demo.json').labels;
  const swars = of(ls, 'swar');
  const near = (l: Label) => swars.reduce((b, s) => (Math.abs(cx(s) - cx(l)) + Math.abs(cy(s) - cy(l)) < Math.abs(cx(b) - cx(l)) + Math.abs(cy(b) - cy(l)) ? s : b));
  const mainKomal = of(render('bhimpalasi-geet.json').labels, 'komal_mark');
  const bsw = of(render('bhimpalasi-geet.json').labels, 'swar');
  for (const k of mainKomal) {
    const s = bsw.reduce((b, x) => (Math.abs(cx(x) - cx(k)) + Math.abs(cy(x) - cy(k)) < Math.abs(cx(b) - cx(k)) + Math.abs(cy(b) - cy(k)) ? x : b));
    assert.ok(k.bbox[1] >= s.bbox[3] - 1, 'komal below');
  }
  for (const t of of(ls, 'tivra_mark')) assert.ok(t.bbox[3] <= near(t).bbox[1] + 1, 'tivra above');
  const b = render('bhimpalasi-geet.json').labels;
  const dots = of(b, 'octave_dot');
  assert.ok(dots.length && dots.every((d) => d.data.octave_dot_position === 'above'));
});

test('B10: kan sits above its swar, starting at its left edge; nested kan sits above the kan', () => {
  const ls = render('kan-nesting-demo.json').labels;
  const kans = of(ls, 'kan_swar').sort((a, b) => a.bbox[0] - b.bbox[0] || a.bbox[1] - b.bbox[1]);
  const swar = of(ls, 'swar').sort((a, b) => a.bbox[0] - b.bbox[0])[0];
  const [outer, inner] = kans.filter((k) => Math.abs(k.bbox[0] - swar.bbox[0]) < 3).sort((a, b) => b.bbox[1] - a.bbox[1]);
  assert.ok(outer && inner, 'kan and nested kan start at the swar left edge');
  assert.ok(outer.bbox[3] < swar.bbox[1], 'kan above the swar');
  assert.ok(inner.bbox[3] < outer.bbox[1] + 1, 'nested kan above the kan');
});

test('B11: (प) renders as two khatka brackets around the swar', () => {
  const ls = render('bihag-geet4-jhaptaal.json').labels;
  const br = of(ls, 'khatka_bracket').sort((a, b) => a.bbox[0] - b.bbox[0]);
  assert.equal(br.length, 2);
  const inside = of(ls, 'swar').find((s) => s.bbox[0] > br[0].bbox[2] - 1 && s.bbox[2] < br[1].bbox[0] + 1);
  assert.ok(inside, 'a swar between the brackets');
});

/* ---------------- VexFlow mechanics */
test('Voice: STRICT voice rejects too many matras', () => {
  Tables.setStyle(createStyle()); Tables.setFonts(fonts);
  const v = new Voice(Fraction.of(2), VoiceMode.STRICT);
  v.addTickable(new SwarNote({ degree: 'S', ticks: Fraction.of(1) })).addTickable(new SwarNote({ degree: 'R', ticks: Fraction.of(1) }));
  assert.throws(() => v.addTickable(new SwarNote({ degree: 'G', ticks: Fraction.of(1, 2) })));
  assert.equal(v.isComplete(), true);
});

test('ModifierContext stacking: komal bar is nearer the glyph than the mandra dot', () => {
  const r = new Factory({ fonts }).renderBandish({ metadata: { taal: 'teentaal' }, sections: [{ name: '', lines: [{ matras: [{ events: [{ swar: 'नी', komal: true, octave: -1 }] }] }] }] });
  const k = of(r.labels, 'komal_mark')[0], d = of(r.labels, 'octave_dot')[0];
  assert.ok(d.bbox[1] >= k.bbox[3], 'dot below the komal bar');
});

test('packed matra: events of one matra are tight, not spread over the column', () => {
  const ls = render('bhimpalasi-geet.json').labels;
  const pairs = of(ls, 'grouping_curve').filter((c) => c.data.curve_scope === 'swar');
  assert.ok(pairs.length >= 6);
  for (const c of pairs) assert.ok(c.bbox[2] - c.bbox[0] < 60, 'grouped swars stay within a tight cluster');
});

test('every example renders without errors and the SVG is well formed', () => {
  for (const f of ['bhoop-swarmalika.json', 'bhimpalasi-geet.json', 'khamaj-dhrupad-chautaal.json', 'alhaiya-bilawal-dhamar.json', 'bihag-geet4-jhaptaal.json', 'kan-nesting-demo.json']) {
    const r = render(f);
    assert.deepEqual(r.diagnostics.filter((d) => d.level === 'error'), [], f);
    assert.match(r.svg, /^<svg[^>]+xmlns/);
    assert.ok(!/NaN|undefined/.test(r.svg), f);
  }
});

/* ---------------- Label Studio round trip: annotations -> bandish JSON -> render -> same label counts */
test('Label Studio import: Bhairav geet 2 (ektaal) re-renders with the annotated class counts', () => {
  const c = count(render('labelstudio/bhairav-geet2-ektaal.json', { lyricCurves: false }).labels);
  const expected = { swar: 65, swar_rest: 13, lyric: 44, lyric_rest: 34, taal_marker: 36, vibhag_line: 30, line_end_bar: 6, komal_mark: 16, grouping_curve: 6, kan_swar: 3 };
  for (const [k, v] of Object.entries(expected)) assert.equal(c[k], v, `${k}: rendered ${c[k]}, annotated ${v}`);
});

test('Label Studio: a raw task export renders directly, and a short antara row sits under its own cycle positions', () => {
  const r = render('labelstudio/raag-bhairav-geet3-raw-export.json', { lyricCurves: false });
  const c = count(r.labels);
  // komal_mark is 9, not the 8 annotated: the kan dha carries kan_variant komal and the scan prints its bar
  const expected = { swar: 28, swar_rest: 15, lyric: 23, lyric_rest: 20, taal_marker: 10, vibhag_line: 7, line_end_bar: 3, komal_mark: 9, kan_swar: 5, octave_dot: 4, grouping_curve: 3 };
  for (const [k, v] of Object.entries(expected)) assert.equal(c[k], v, `${k}: rendered ${c[k]}, annotated ${v}`);
  const rows = [...new Set(of(r.labels, 'swar').map((l) => Math.round(cy(l))))].sort((a, b) => a - b);
  const last = of(r.labels, 'swar').filter((l) => Math.round(cy(l)) === rows[rows.length - 1]);
  assert.ok(Math.min(...last.map(cx)) > r.width / 2, 'antara (matras 9 to 16) starts in the right half, like the printed page');
});

test('swartaal XML made from the Bhairav export renders the same SVG as the export itself', () => {
  assert.equal(render('raag-bhairav-geet3.xml', { lyricCurves: false }).svg, render('labelstudio/raag-bhairav-geet3-raw-export.json', { lyricCurves: false }).svg);
});

test('full sample: the JSON and the XML give the same SVG, and every feature is drawn', () => {
  const j = render('full-sample.json'), x = render('full-sample.xml');
  assert.equal(x.svg, j.svg);
  const c = count(j.labels);
  const expected = { volta_bracket: 2, repeat_bar: 2, tihai_bracket: 1, meend: 2, khatka_bracket: 2, kan_swar: 3, komal_mark: 5, tivra_mark: 8, octave_dot: 6, section_heading: 4 };
  for (const [k, v] of Object.entries(expected)) assert.equal(c[k], v, `${k}: rendered ${c[k]}, expected ${v}`);
  assert.deepEqual(j.diagnostics.filter((d) => d.level !== 'info'), [], 'the sample has no warnings or errors');
});

test('taar dot: over the stem of the ा on सा (right of centre, inside the glyph); centred on every other swar', () => {
  let sa = 0, other = 0;
  for (const file of ['labelstudio/raag-bhairav-geet3-raw-export.json', 'bhimpalasi-geet.json', 'full-sample.json']) {
    const ls = render(file).labels, swars = of(ls, 'swar');
    for (const d of of(ls, 'octave_dot')) {
      const x = cx(d);
      const s = swars.filter((w) => x >= w.bbox[0] - 1 && x <= w.bbox[2] + 1).reduce((b, w) => (Math.abs(cy(w) - cy(d)) < Math.abs(cy(b) - cy(d)) ? w : b));
      const width = s.bbox[2] - s.bbox[0];
      if (d.data.octave_dot_position === 'above' && s.data.degree === 'S') {
        sa++;
        assert.ok(x - cx(s) > 0.2 * width && x <= s.bbox[2], `taar sa dot at ${x}, glyph ${s.bbox[0]}..${s.bbox[2]}`);
      } else { other++; assert.ok(Math.abs(x - cx(s)) <= 1, `dot of ${s.data.degree} (${d.data.octave_dot_position}) is off centre by ${x - cx(s)}`); }
    }
  }
  assert.ok(sa >= 4 && other >= 1, `checked ${sa} taar sa dots and ${other} other dots`);
});

/* ---------------- volta + repeat (VexFlow Volta / Barline repeat types) */
test('volta: first ending closed (BEGIN_END) with :‖, second ending open (BEGIN) on its own row under the first', () => {
  const r = render('volta-demo.json');
  const v = of(r.labels, 'volta_bracket').sort((a, b) => a.bbox[1] - b.bbox[1]);
  assert.deepEqual(v.map((x) => [x.data.label, x.data.volta_type]), [['1.', 'BEGIN_END'], ['2.', 'BEGIN']]);
  assert.ok(Math.abs(v[0].bbox[0] - v[1].bbox[0]) < 1, 'endings share the same columns');
  const reps = of(r.labels, 'repeat_bar').map((x) => x.data.repeat).sort();
  assert.deepEqual(reps, ['begin', 'end']);
  const swar = of(r.labels, 'swar');
  assert.ok(v.every((b) => swar.some((s) => s.bbox[1] > b.bbox[3] && s.bbox[0] >= b.bbox[0] - 1 && s.bbox[2] <= b.bbox[2] + 1)), 'each bracket sits above its swars');
});
