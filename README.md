# bhatkhande-flow

A rendering engine for **Bhatkhande notation**, built on VexFlow's architecture. Input is a bandish as JSON, swartaal XML or a Label Studio export. Output is an SVG plus dataset labels (the BhatkhandeSet class names), written as YOLO and JSON.

```bash
npm install
npm test                                   # 20 tests: grid, conventions, label counts vs the hand annotations
npm run render -- examples/bhimpalasi-geet.json out --png
```

## What can I give it?

Three input formats, all turned into one model before drawing. `npm run render -- <file> out --png` detects the format from the content.

| You have | Format | Minimal example |
|---|---|---|
| A bandish you type or generate | **Bandish JSON**: `metadata` → `sections` → `lines` → `matras` → `events` | `examples/minimal-teentaal.json` |
| A swartaal file, or you prefer tags | **Swartaal XML**: `<hindustani-composition>` with `<section>`, `<line>`, `<matra>`, `<swar>`, `<lyric>` | `examples/minimal-teentaal.xml` |
| Annotations of a scanned page from Label Studio | **Label Studio export**: `Export` → `JSON` (full format), one task or a list of tasks | `examples/labelstudio/raag-bhairav-geet3-raw-export.json` |

The two minimal examples hold the same four matras and render to identical SVG. For every feature at once (kan, khatka, meend, volta and repeats, tihai, pickup, shorthand), open **`examples/full-sample.json`** and **`examples/full-sample.xml`**: one bandish, written in both formats, with a comment on each feature in the XML. Every field, attribute and accepted spelling is in **[`docs/INPUT_FORMATS.md`](docs/INPUT_FORMATS.md)**, including the taal names, the swar spellings, the XML tags, and the Label Studio attributes the engine reads (`swar_type`, `variant`, `octave`, `matra_number`, `matra_fraction`, `lyric_applies_to_swar_id`, `modifies_swar_id`, ...).

Convert between them:

```bash
npx tsx cli/bandish2xml.ts in.json out.xml          # bandish JSON or Label Studio export -> swartaal XML
npx tsx cli/ls2bandish.ts out.json "<title>" page1.json page2.json   # Label Studio export(s) -> bandish JSON
```

- `docs/ARCHITECTURE.md` covers the design: what is taken from VexFlow, and what follows the printed books.
- `out/compare/*.compare.png` shows each scanned book page next to the render of the same bandish.

## In the browser

```bash
npm run web          # builds web/bhatkhande-flow.js and serves the playground at http://localhost:5173
```

You can paste or drop a **bandish JSON, a swartaal XML or a Label Studio export**. The page:
- renders it live, with either engine (outlines, which are byte-identical to the Node output, or browser text);
- can overlay the label boxes;
- lets you click a swar to see its matra, fraction and class;
- downloads SVG, PNG, YOLO labels, or the bandish JSON converted from Label Studio.

Library use: `<script src="bhatkhande-flow.js">` gives you `BhatkhandeFlow.Factory`, `createBrowserFontProvider(urls)`, `createCanvasFontProvider()` and `toBandishInput(text)`. To run the browser test, install Chromium once (`npx playwright install chromium`), then run `npm run test:browser [labelstudio.json]`.

## Volta and repeats

Mark alternate endings with `"volta": 1` / `"volta": 2` on matras and add `"repeatAfter": true` on the last matra of the first ending. A line can also take `"repeatStart"` / `"repeatEnd"`. The second ending rewinds to the first ending's taal positions and is drawn on its own row under it. Brackets work like VexFlow's `Volta`: one piece per row, typed BEGIN, MID, END or BEGIN_END. Every ending except the last is closed; the last is left open. See `examples/volta-demo.json`.

## Pipeline (VexFlow's, with Bhatkhande content)

```
JSON / XML ─► normalize + lower (Builder) ─► per row: swar Voice + lyric Voice, modifiers attached
          ─► Formatter: ModifierContext per onset (ordered format), TickContext per onset, MatraContext per matra
          ─► Page (= System): one matra width for the whole page → rows aligned as a table
          ─► TaalStave: lanes  kan · SWAR · curve · LYRIC · curve · MARKER ; vibhag bars ; taal markers
          ─► spanners: grouping curve, meend (partial across rows), tihai bracket
          ─► RenderContext (SVG) – every element opens a group named after its dataset class
```

## Input shorthand (JSON)

- Each matra is `{"events": [...]}`. An event is a string or an object.
- Strings:
  - `"सा"`, `"S"`
  - `"सा'"` or `"सां"` = taar
  - `"ध."` or `"ध़"` = mandra
  - `"-"` = held swar (printed as a dash)
- Object fields: `komal`, `tivra`, `octave`, `duration`, `lyric`, `khatka`, `meend`, and `kan` (nested `kan` = kan-inside-kan).
- A lyric of `"ऽ"` is a prolonged syllable. If a section has lyrics, any swar slot without one gets `ऽ` automatically.
- A tihai is written as a `{"tihai": {...}}` item inside a line.

See `examples/` for five pages transcribed from the Raag Bodh Praveshika scans.

## From Label Studio annotations

A raw export renders directly: `npm run render -- export.json out --png`. The converter below is only needed to inspect or edit the bandish JSON the engine builds from it, or to join several pages. Attribute reference: [`docs/INPUT_FORMATS.md`](docs/INPUT_FORMATS.md#3-label-studio-export).

```bash
npx tsx cli/ls2bandish.ts examples/labelstudio/bhairav-geet1.json "राग भैरव — गीत १" p05_…_labelstudio.json p06_…_labelstudio.json
npm run render -- examples/labelstudio/bhairav-geet1.json out/labelstudio --png --no-lyric-curves
```

The converter reads your BhatkhandeSet schema: swar_type, variant, octave, matra_number, matra_fraction, sequence_in_matra, lyric_applies_to_swar_id, kan_swar + modifies_swar_id, and khatka_bracket. Pass several pages of one bandish to join them. `out/labelstudio/compare/` puts each annotated scan next to the render made from its annotations.
