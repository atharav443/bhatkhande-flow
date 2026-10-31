import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Factory } from '../src/node';
import { fonts, render, of, cy, cx } from './helpers';

test('taar dot: over the stem of the ा on सा (right of centre, inside the glyph); centred on every other swar', () => {
  let sa = 0,
    other = 0;
  for (const file of [
    'labelstudio/raag-bhairav-geet3-raw-export.json',
    'bhimpalasi-geet.json',
    'full-sample.json',
  ]) {
    const ls = render(file).labels,
      swars = of(ls, 'swar');
    for (const d of of(ls, 'octave_dot')) {
      const x = cx(d);
      const s = swars
        .filter((w) => x >= w.bbox[0] - 1 && x <= w.bbox[2] + 1)
        .reduce((b, w) => (Math.abs(cy(w) - cy(d)) < Math.abs(cy(b) - cy(d)) ? w : b));
      const width = s.bbox[2] - s.bbox[0];
      if (d.data.octave_dot_position === 'above' && s.data.degree === 'S') {
        sa++;
        assert.ok(
          x - cx(s) > 0.2 * width && x <= s.bbox[2],
          `taar sa dot at ${x}, glyph ${s.bbox[0]}..${s.bbox[2]}`,
        );
      } else {
        other++;
        assert.ok(
          Math.abs(x - cx(s)) <= 1,
          `dot of ${s.data.degree} (${d.data.octave_dot_position}) is off centre by ${x - cx(s)}`,
        );
      }
    }
  }
  assert.ok(sa >= 4 && other >= 1, `checked ${sa} taar sa dots and ${other} other dots`);
});

test('matra numbering: one slip gives one matra.sequence warning, not one per later matra', () => {
  // pickup numbered 15, 16 but the next line starts at 9 (the book's pickup is 7, 8)
  const m = (index: number) => ({ index, events: ['सा'] });
  const bandish = {
    metadata: { taal: 'teentaal' },
    sections: [
      {
        startMatra: 15,
        lines: [{ matras: [m(15), m(16)] }, { matras: [9, 10, 11, 12, 13, 14, 15, 16].map(m) }],
      },
    ],
  };
  const r = new Factory({ fonts }).renderBandish(bandish);
  const seq = r.diagnostics.filter((d) => d.code === 'matra.sequence');
  assert.equal(seq.length, 1, seq.map((d) => d.message).join('\n'));
  assert.match(seq[0].message, /matra index 9 but position 1/);
});

/* ---------------- volta + repeat (VexFlow Volta / Barline repeat types) */
test('volta: first ending closed (BEGIN_END) with :‖, second ending open (BEGIN) on its own row under the first', () => {
  const r = render('volta-demo.json');
  const v = of(r.labels, 'volta_bracket').sort((a, b) => a.bbox[1] - b.bbox[1]);
  assert.deepEqual(
    v.map((x) => [x.data.label, x.data.volta_type]),
    [
      ['1.', 'BEGIN_END'],
      ['2.', 'BEGIN'],
    ],
  );
  assert.ok(Math.abs(v[0].bbox[0] - v[1].bbox[0]) < 1, 'endings share the same columns');
  const reps = of(r.labels, 'repeat_bar')
    .map((x) => x.data.repeat)
    .sort();
  assert.deepEqual(reps, ['begin', 'end']);
  const swar = of(r.labels, 'swar');
  assert.ok(
    v.every((b) =>
      swar.some((s) => s.bbox[1] > b.bbox[3] && s.bbox[0] >= b.bbox[0] - 1 && s.bbox[2] <= b.bbox[2] + 1),
    ),
    'each bracket sits above its swars',
  );
});
