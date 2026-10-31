import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Factory,
  ColumnGrid,
  resolveTaal,
  Fraction,
  Voice,
  VoiceMode,
  SwarNote,
  Tables,
  createStyle,
  type Label,
} from '../src/node';
import { fonts, render, of, cy, cx } from './helpers';

/* ---------------- the page grid (B1, B6, B7) */
test('column grid: equal matra columns, bars only between vibhags, never before column 0', () => {
  const g = new ColumnGrid(resolveTaal({ name: 'jhaptaal' }, []), 1, 40, 16, 0);
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => g.barBefore(c)),
    [false, false, true, false, false, true, false, true, false, false],
  );
  assert.equal(g.x(1) - g.x(0), 40);
  assert.equal(g.x(2) - g.x(1), 56, 'a vibhag bar adds its gap');
  const k = new ColumnGrid(resolveTaal({ name: 'teentaal' }, []), 9, 40, 16, 0);
  assert.equal(k.colOf(9), 0);
  assert.equal(k.colOf(1), 8);
  assert.equal(k.posOf(15), 8);
});

/* ---------------- label counts against the hand annotations of the scanned pages */

test('B2: line order is swar, lyric, then taal markers below the lyrics', () => {
  const ls = render('bhimpalasi-geet.json').labels;
  const firstRow = (c: string) => Math.min(...of(ls, c).map(cy));
  assert.ok(firstRow('swar') < firstRow('lyric') && firstRow('lyric') < firstRow('taal_marker'));
});

test('B3: no bar at the start of a row; bars span swar and lyric lines but not the markers', () => {
  const ls = render('bhimpalasi-geet.json').labels;
  const minSwarX = Math.min(...of(ls, 'swar').map((l) => l.bbox[0]));
  for (const b of [...of(ls, 'vibhag_line'), ...of(ls, 'line_end_bar')])
    assert.ok(b.bbox[0] > minSwarX, 'a bar left of the first swar');
  const marker = Math.min(...of(ls, 'taal_marker').map((l) => l.bbox[1]));
  const bar = of(ls, 'vibhag_line')[0];
  assert.ok(bar.bbox[3] <= marker + 1, 'bars must stop above the marker line');
});

test('B4: held swar is a dash in the swar line; ऽ appears only in the lyric line', () => {
  const r = render('bhimpalasi-geet.json');
  assert.ok(of(r.labels, 'swar_rest').length > 0);
  assert.ok(!/class="swar[^_"]*"[^>]*data-text="ऽ"/.test(r.svg));
  const swarY = Math.min(...of(r.labels, 'swar').map(cy)),
    restY = Math.min(...of(r.labels, 'swar_rest').map(cy));
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
  const pickupSwars = of(ls, 'swar')
    .sort((a, b) => a.bbox[1] - b.bbox[1])
    .slice(0, 2);
  const fullRowFirst = Math.min(...of(ls, 'swar').map((l) => l.bbox[0]));
  assert.ok(Math.min(...pickupSwars.map((l) => l.bbox[0])) > fullRowFirst + 200, 'pickup sits at the right');
});

test('B9: komal bar under, tivra stroke above, taar dot above, mandra dot below the swar', () => {
  const ls = render('kan-nesting-demo.json').labels;
  const swars = of(ls, 'swar');
  const near = (l: Label) =>
    swars.reduce((b, s) =>
      Math.abs(cx(s) - cx(l)) + Math.abs(cy(s) - cy(l)) < Math.abs(cx(b) - cx(l)) + Math.abs(cy(b) - cy(l))
        ? s
        : b,
    );
  const mainKomal = of(render('bhimpalasi-geet.json').labels, 'komal_mark');
  const bsw = of(render('bhimpalasi-geet.json').labels, 'swar');
  for (const k of mainKomal) {
    const s = bsw.reduce((b, x) =>
      Math.abs(cx(x) - cx(k)) + Math.abs(cy(x) - cy(k)) < Math.abs(cx(b) - cx(k)) + Math.abs(cy(b) - cy(k))
        ? x
        : b,
    );
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
  const [outer, inner] = kans
    .filter((k) => Math.abs(k.bbox[0] - swar.bbox[0]) < 3)
    .sort((a, b) => b.bbox[1] - a.bbox[1]);
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
  Tables.setStyle(createStyle());
  Tables.setFonts(fonts);
  const v = new Voice(Fraction.of(2), VoiceMode.STRICT);
  v.addTickable(new SwarNote({ degree: 'S', ticks: Fraction.of(1) })).addTickable(
    new SwarNote({ degree: 'R', ticks: Fraction.of(1) }),
  );
  assert.throws(() => v.addTickable(new SwarNote({ degree: 'G', ticks: Fraction.of(1, 2) })));
  assert.equal(v.isComplete(), true);
});

test('ModifierContext stacking: komal bar is nearer the glyph than the mandra dot', () => {
  const r = new Factory({ fonts }).renderBandish({
    metadata: { taal: 'teentaal' },
    sections: [{ name: '', lines: [{ matras: [{ events: [{ swar: 'नी', komal: true, octave: -1 }] }] }] }],
  });
  const k = of(r.labels, 'komal_mark')[0],
    d = of(r.labels, 'octave_dot')[0];
  assert.ok(d.bbox[1] >= k.bbox[3], 'dot below the komal bar');
});

test('packed matra: events of one matra are tight, not spread over the column', () => {
  const ls = render('bhimpalasi-geet.json').labels;
  const pairs = of(ls, 'grouping_curve').filter((c) => c.data.curve_scope === 'swar');
  assert.ok(pairs.length >= 6);
  for (const c of pairs) assert.ok(c.bbox[2] - c.bbox[0] < 60, 'grouped swars stay within a tight cluster');
});
