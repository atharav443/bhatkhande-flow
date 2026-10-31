# swarlipi-engine v1 — architecture (for approval)

This is the plan for rebuilding the renderer. It is based on two things:

1. A read through VexFlow's source, in your clone at `software/vexflow-dev/vexflow` (4.2.6, about 26k lines in `src/`).
2. The printed Bhatkhande pages in `Scanned_classical_books`: Raag Bodh Praveshika Pratham and Purna (Bhoop, Bhimpalasi, Vrindavani Sarang, Khamaj chautaal, Alhaiya Bilawal dhamar, Bihag jhaptaal). Their Label Studio annotations were also used.

The rule for every decision: **copy VexFlow's mechanism wherever the problem is the same. Where Bhatkhande differs, follow the printed books, not Western habits.**

---

## 1. What VexFlow actually does

### 1.1 Repository layout

| Layer                | Files                                                                                                                                      | Role                                                                                                                                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry / API          | `entry/*.ts`, `flow.ts`, `factory.ts`, `easyscore.ts`, `parser.ts`                                                                         | `Factory` creates every element and queues it in a `renderQ`. `factory.draw()` then formats and draws everything in a fixed order. `EasyScore` is a grammar (`Parser` + `Builder`) that turns text into notes.                                                                                                         |
| Base object          | `element.ts`, `registry.ts`, `boundingbox.ts`, `typeguard.ts`                                                                              | `Element` holds an id, a `CATEGORY`, CSS-like classes, a style, a render context and a bounding box. `Registry` indexes elements by id, type and class.                                                                                                                                                                |
| Time                 | `fraction.ts`, `tickable.ts`, `voice.ts`, `tuplet.ts`, `tables.ts` (`RESOLUTION = 16384`)                                                  | A `Tickable` has rational `ticks`. A `Voice` is a sequence of tickables checked against a time signature (STRICT, SOFT or FULL mode).                                                                                                                                                                                  |
| Things in time       | `note.ts` → `stemmablenote.ts` → `stavenote.ts`, `gracenote.ts`, `textnote.ts`, `barnote.ts`, `ghostnote.ts`                               | Each note has a glyph, a width, `ys`, modifiers and metrics (`notePx`, `modLeftPx`, `modRightPx`, displaced-head px). Lyrics are `TextNote`s in their own voice.                                                                                                                                                       |
| Things on a note     | `modifier.ts` plus about 20 subclasses (`dot`, `accidental`, `annotation`, `articulation`, `ornament`, `parenthesis`, `gracenotegroup`, …) | A `Modifier` has a position (LEFT, RIGHT, ABOVE, BELOW), a `text_line` and x/y shifts.                                                                                                                                                                                                                                 |
| Collision / stacking | `modifiercontext.ts`                                                                                                                       | All modifiers that share one tick go into a `ModifierContext`. Its `preFormat()` calls each modifier class's **static `format(members, state)` in a fixed order**. They all grow one shared state: `{left_shift, right_shift, text_line, top_text_line}`.                                                              |
| Columns              | `tickcontext.ts`                                                                                                                           | Every tickable that starts at the same tick, across all voices, joins one `TickContext`. It records max `notePx`, `totalLeftPx`, `totalRightPx` and its own `x`.                                                                                                                                                       |
| Spacing              | `formatter.ts`                                                                                                                             | `joinVoices` creates ModifierContexts. `createTickContexts` builds the integer-tick grid across voices. `preFormat` pass 1 lays out minimum widths. Justification places contexts at softmax-of-duration ideal distances. `evaluate` / `tune` reduce the loss (variance of space per duration). `postFormat` finishes. |
| Containers           | `stave.ts`, `stavemodifier.ts` (`Barline`, `Volta`, `Repetition`, `StaveSection`, `StaveText`, …), `system.ts`, `staveconnector.ts`        | A `Stave` owns its y-lines (`getYForLine`, `getYForTopText`, `getYForBottomText`), begin/end modifiers and `noteStartX` / `noteEndX`. A `System` stacks staves and **runs one Formatter over all their voices**, so the columns line up vertically.                                                                    |
| Spanners             | `beam.ts`, `curve.ts`, `stavetie.ts`, `tuplet.ts`, `textbracket.ts`                                                                        | These connect two or more notes and are drawn after the notes. `Curve` supports **partial curves**: a missing `from` or `to` is clamped to the stave edge. That is how a slur crosses a line break.                                                                                                                    |
| Output               | `rendercontext.ts` (abstract canvas-like API), `svgcontext.ts`, `canvascontext.ts`, `renderer.ts`                                          | Drawing code only calls the abstract API. `openGroup(cls, id)` gives every SVG group a class and an id.                                                                                                                                                                                                                |
| Glyphs / fonts       | `glyph.ts`, `font.ts`, `fonts/*`                                                                                                           | Glyph outlines and metrics come from the font tables, so layout uses real ink boxes.                                                                                                                                                                                                                                   |

### 1.2 The pipeline: input to pixels

```
EasyScore text ──Parser/Builder──► StaveNotes + Modifiers ──► Voice(s)
                                                                │
   Formatter.joinVoices ──► ModifierContext per tick ── static format() per modifier class (ordered)
   Formatter.format     ──► TickContext per tick ── preFormat (min widths) ──► x positions (justify, tune)
   System               ──► same Formatter for every stave → vertical alignment; Stave gives y-lanes
   Factory.draw         ──► staves → voices (notes → modifiers → glyphs) → beams/curves/tuplets
                             all through RenderContext (SVG/Canvas)
```

### 1.3 The four ideas worth copying

1. **Measure first, place second.** Every element reports its widths (`getMetrics`) before any x is assigned.
2. **Contexts resolve conflicts.** A ModifierContext handles collisions on one note (stack outward along `text_line`). A TickContext aligns everything that sounds at one time. Elements never position themselves against their neighbours.
3. **The formatter owns x; the stave owns y.** Notes ask the stave for y-lines (`getYForLine`) and the tick context for x.
4. **Spanners are separate and partial.** Curves, beams and tuplets are drawn after the notes, from the notes' final positions. Across a line break they become two partial pieces.

---

## 2. What the printed Bhatkhande page looks like

These conventions were checked on the scans, not taken from memory. Each one names the page it was seen on.

| #   | Convention                                                                                                                                                                                                    | Seen on                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| B1  | One row = one taal **cycle** (Teentaal 16 matras, Chautaal 12, Jhaptaal 10, Dhamar 14). Rows break at cycle boundaries, not by page width.                                                                    | all pages                         |
| B2  | Line order top to bottom: **(kan line) → swar line → lyric line → taal-marker line**. Taal markers (X, 2, ०, 3 …) are printed **below the lyrics**, under the first matra of each vibhag, left-aligned to it. | Bhimpalasi, Khamaj, Bihag         |
| B3  | Vertical bars at vibhag boundaries and at the end of the row. **There is no bar at the start of a row.** Bars span the swar and lyric lines only, not the marker line.                                        | all                               |
| B4  | A held swar is a **dash "–"** in the swar line. A prolonged syllable is **"ऽ"** in the lyric line. Each takes a full matra (or a fraction of one).                                                            | Bhoop, Bhimpalasi, Bihag          |
| B5  | Several swars in one matra are written **tightly together** (`गम`, `पनी`) with a **curve ⌣ underneath**. When there are lyrics, a matching curve is drawn under the lyric group (`ऽऽ`).                       | Bhimpalasi, Khamaj, Sarang        |
| B6  | Every matra column has the **same width** across the page, whatever the vibhag size, so bars line up from row to row.                                                                                         | Khamaj, Bihag                     |
| B7  | A row that starts mid-cycle (a pickup or anacrusis) is placed **at its cycle position**. A short pickup line is right-aligned, with a bar after it and no marker line.                                        | Bihag p15 `प नी │`, Sarang p17    |
| B8  | The last row may stop mid-cycle and is left as it is.                                                                                                                                                         | Sarang                            |
| B9  | Komal: short **underline** under the swar (just that letter when it sits in a group). Tivra: short **vertical stroke above** म. Taar: **dot above**. Mandra: **dot below**.                                   | Bhimpalasi, Khamaj, Bihag         |
| B10 | Kan swar: a **small swar written above** the main swar (raised, starting at its left edge), on its own line above the swar line.                                                                              | Dhamar p04, Bihag p15             |
| B11 | `(प)` with parentheses = **khatka**, not murki.                                                                                                                                                               | Bihag p15 (your annotation notes) |
| B12 | Page header: `गीत-४` at the left, `राग …` centred, `ताल-…` centred below it or at the right. The song text is a block. **`स्थायी` / `अन्तरा` are plain centred headings**, with no rule.                      | all                               |

Your Label Studio taxonomy already names exactly these objects: `swar`, `swar_rest` (dash), `lyric`, `lyric_rest` (ऽ), `taal_marker`, `vibhag_line`, `line_end_bar`, `octave_dot`, `komal_mark`, `tivra_mark`, `grouping_curve`, `kan_swar`, `khatka_bracket`.

---

## 3. What v0.x got wrong

| v0.x                                                        | Correct (scan)                                                     | Fix in v1                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Taal markers drawn **above** the swars                      | **Below** the lyrics (B2)                                          | Marker lane at the bottom of the stave                                          |
| Held swar drawn as `ऽ` in the swar line                     | `–` in swar, `ऽ` only in lyrics (B4)                               | `SwarRest('dash')` vs `LyricRest('avagraha')`                                   |
| Bar at the start of every row                               | No starting bar (B3)                                               | Stave begin modifier = none                                                     |
| Rows broken by page width (DP line breaking)                | Rows = taal cycles; partial rows placed by cycle position (B1, B7) | `TaalStave` per cycle line, aligned by a cycle-position grid                    |
| Swars inside a matra spread out proportionally (spring/rod) | Packed tightly, curve underneath (B5)                              | Matra = packed cluster centred in an equal column                               |
| Matra widths varied per position or section                 | One width for every matra on the page (B6)                         | Global column width                                                             |
| Kan as a tiny top-left superscript                          | Kan on its own line above the swar (B10)                           | `KanGroup` modifier placed ABOVE in a kan lane                                  |
| Parentheses treated as murki                                | `( )` = khatka (B11)                                               | `KhatkaBracket` modifier                                                        |
| Chhand drawn as a bracket                                   | A curve ⌣, under the swars **and** under the lyrics (B5)           | `GroupingCurve` spanner on both lines                                           |
| Section heading left-aligned, coloured, with a rule         | Plain centred heading (B12)                                        | Header layout                                                                   |
| Scene classes invented ad hoc                               | Your BhatkhandeSet taxonomy                                        | `CATEGORY` = dataset class name, so YOLO labels come straight from the renderer |

---

## 4. v1 design: VexFlow mechanisms with Bhatkhande content

### 4.1 Class map

| VexFlow                                                           | swarlipi v1                                                                                           | Notes                                                                                                                                               |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Element`, `Registry`, `BoundingBox`                              | same three, **kept**                                                                                  | `CATEGORY` values are the dataset class names (`swar`, `swar_rest`, `komal_mark`, …).                                                               |
| `Fraction`                                                        | same, **kept** (exact rationals)                                                                      | One matra = 1. There is no RESOLUTION; tick keys are reduced fractions.                                                                             |
| `Tickable`                                                        | `Tickable`                                                                                            | `ticks`, `width`, `modifierContext`, `tickContext`, `x_shift`, pre/post-format flags                                                                |
| `StaveNote`                                                       | `SwarNote`                                                                                            | Degree, octave, komal/tivra, glyph (shaped Devanagari or Latin), `getYs`, metrics                                                                   |
| `StaveNote` rest                                                  | `SwarRest` (`–`)                                                                                      | Class `swar_rest`                                                                                                                                   |
| `TextNote` (lyric voice)                                          | `LyricNote`, `LyricRest` (`ऽ`)                                                                        | A **second voice**, aligned through the same TickContexts, exactly like VexFlow lyrics                                                              |
| `GhostNote`                                                       | `GhostNote`                                                                                           | Fills empty beats (sparse input, pickups)                                                                                                           |
| `Voice` (time sig, STRICT/SOFT)                                   | `Voice` with `TaalTime`                                                                               | Total ticks = matras in the cycle line. STRICT for full cycles, SOFT for pickup or last lines. Over-full = error.                                   |
| `Modifier` + positions                                            | `Modifier`                                                                                            | LEFT, RIGHT, ABOVE, BELOW                                                                                                                           |
| `Dot` / `Articulation` (ABOVE/BELOW stacking via `text_line`)     | `OctaveDot` (above ×1/×2, below ×1/×2), `TivraMark` (above), `KomalMark` (below)                      | Stacked outward with `top_text_line` / `text_line`                                                                                                  |
| `Parenthesis` (left/right shift)                                  | `KhatkaBracket`                                                                                       | Adds `left_shift` / `right_shift`                                                                                                                   |
| `GraceNoteGroup` (own Voice + Formatter inside a modifier)        | `KanGroup`                                                                                            | Mini-voice of small `SwarNote`s, formatted by its own Formatter, then placed **ABOVE** (B10). Nested kan becomes a group inside a group.            |
| `ModifierContext` (ordered static `format`)                       | `ModifierContext`                                                                                     | Order: `KhatkaBracket` → `KomalMark` → `TivraMark` → `OctaveDot` → `KanGroup`. Same `state` object.                                                 |
| `TickContext`                                                     | `TickContext`                                                                                         | One per onset, across the swar and lyric voices                                                                                                     |
| — (new)                                                           | `MatraContext`                                                                                        | Groups the TickContexts inside one matra. Packs them tightly (B5) and centres the cluster in its column.                                            |
| `Formatter`                                                       | `Formatter`                                                                                           | `joinVoices` → `createTickContexts` → `preFormat` (min widths) → **grid justification** (§4.3) → `postFormat`. Softmax and `tune` are dropped (§5). |
| `Stave` (lines, begin/end modifiers, noteStart/End)               | `TaalStave`                                                                                           | y-lanes: `kan`, `swar`, `lyric`, `marker`. Begin bar = none, end bar = `line_end_bar`. Owns the column grid for its cycle offset.                   |
| `StaveModifier`: `Barline`, `Volta`, `Repetition`, `StaveSection` | `VibhagLine`, `LineEndBar`, `RepeatBar`, `Volta`, `SectionHeading`                                    | Vibhag lines sit between columns, from the swar top to the lyric bottom (B3).                                                                       |
| `TextNote` / `StaveText` for markers                              | `TaalMarker`                                                                                          | Placed in the marker lane under the vibhag's first matra (B2)                                                                                       |
| `System` (shared formatter → vertical alignment)                  | `Section` / `Page`                                                                                    | All staves share one column grid, so matra columns line up page-wide (B6)                                                                           |
| `Curve` (partial across lines)                                    | `GroupingCurve` (under swar **and** lyric clusters), `Meend` (above; split into partials at row ends) | Drawn after the notes, from their final positions                                                                                                   |
| `Tuplet` bracket                                                  | `Tihai` bracket (optional)                                                                            | Same draw code: bracket plus a centred label                                                                                                        |
| `RenderContext`, `SVGContext`, `CanvasContext`                    | `RenderContext`, `SVGContext`, `CanvasContext` + **`LabelContext`**                                   | `LabelContext` records `(category, bbox)` per `openGroup`, which produces YOLO / Label Studio export for free                                       |
| `Glyph`, font metrics                                             | `GlyphProvider` (fontkit outlines; canvas fallback)                                                   | Devanagari needs real shaping, so outlines come from fontkit and not from a static glyph table                                                      |
| `Factory` + `renderQ` + `draw()` order                            | `Factory`                                                                                             | Creates elements, keeps the queue, draws in a fixed order: headers → staves → notes → modifiers → spanners → markers                                |
| `EasyScore` (grammar → Builder)                                   | `BandishBuilder` (JSON / XML → Factory calls)                                                         | Your swartaal schema is the input                                                                                                                   |

### 4.2 Data flow

```
JSON/XML ─► BandishBuilder ─► per line: swar Voice + lyric Voice (+ GhostNotes), modifiers attached
                                 │
Formatter.joinVoices      ─► ModifierContext per onset ─► ordered static format() → left/right shift, above/below lines
Formatter.createContexts  ─► TickContext per onset (both voices) ─► MatraContext per matra
Formatter.preFormat       ─► min width per matra = packed cluster width (+ modifier shifts)
Page grid                 ─► matraWidth = max over the whole page; vibhagGap fixed; column x = f(cycle position)
TaalStave                 ─► y-lanes sized from ModifierContext above/below lines; bars at vibhag boundaries
Spanners                  ─► GroupingCurve, Meend (partial at row ends), Tihai, Volta
Factory.draw              ─► RenderContext (SVG / Canvas / LabelContext)
```

### 4.3 Layout rules

**Horizontal**

- `matraWidth` = the largest packed cluster width on the page, plus padding. Every column uses it (B6).
- Column x = `staveStart + (cyclePos − rowStartPos) · matraWidth + (vibhags crossed) · vibhagGap`. Every row starts at the same cycle position (sam, or the section's start matra), so bars align vertically.
- A **pickup** (a line shorter than a cycle whose last matra is just before the row's start position) is right-aligned so that its end bar lines up with the row's right edge (B7).
- Inside a matra, the cluster is packed with fixed letter spacing and centred. Swars and lyrics share x through their TickContext. If a lyric is wider than its swar, the TickContext takes the max.

**Vertical** (lanes per stave, top to bottom)

- Meend lane.
- Kan lane.
- Swar baseline: above-lines from ModifierContext `top_text_line`; below-lines from `text_line`.
- Grouping curve.
- Lyric baseline.
- Lyric curve.
- Marker line.

### 4.4 Output classes (= your dataset taxonomy)

The renderer emits these classes, each with a box:

- `swar`, `swar_rest`
- `lyric`, `lyric_rest`
- `kan_swar`, `khatka_bracket`
- `octave_dot`, `komal_mark`, `tivra_mark`
- `grouping_curve`
- `taal_marker`
- `vibhag_line`, `line_end_bar`
- Header classes: `section_heading`, `title`

Metadata such as `matra_number`, `matra_fraction`, `sequence_in_matra` and `modifies_swar_id` is carried in `data-*` attributes and in the label export. This mirrors your Label Studio schema, so rendered pages can serve directly as synthetic training data.

---

## 5. What I am deliberately **not** taking from VexFlow

- **Softmax proportional spacing and `tune()`.** Bhatkhande is tabular: equal matras, packed sub-beats. Proportional spacing is what made v0.x look non-Bhatkhande.
- **Stems, beams, ledger lines, clefs, key and time signatures.** Not part of the notation. Beam _grouping logic_ reappears as the matra grouping curve.
- **Width-based line breaking.** Rows are cycles (B1). If a cycle is too wide for the page, the whole page scales down rather than wrapping.

---

## 6. Open questions (defaults in brackets)

1. **Meend.** None of the scanned pages shows one clearly. [Arc above the swars, as in standard Bhatkhande practice. I'll change it if you have a page that shows otherwise.]
2. **Rests (silence), as distinct from held swars.** Not visible in the scans. [Show as `ऽ`/blank? Default: blank column with ghost note, flagged.]
3. **Ati-taar / ati-mandra.** [Two dots.]
4. **Paluskar notation** (your scans include it). [Out of scope for v1. The `TaalStave` lanes and modifier set are where a Paluskar preset would plug in.]

---

## 7. Build order once approved

1. Core: `Element`, `Registry`, `Fraction`, `RenderContext` + `SVGContext` + `LabelContext`, `GlyphProvider`.
2. Time: `Tickable`, `SwarNote`, `SwarRest`, `LyricNote`, `Voice`, `TickContext`, `MatraContext`.
3. Modifiers: `ModifierContext` with ordered `format()`; `OctaveDot`, `KomalMark`, `TivraMark`, `KhatkaBracket`, `KanGroup`.
4. `Formatter` (contexts, preFormat, page grid) and `TaalStave` (lanes, bars, markers, pickup alignment).
5. Spanners: `GroupingCurve`, `Meend` (partial), `Tihai`, `Volta`.
6. `Factory` + `BandishBuilder` (swartaal JSON/XML) + page header.
7. Verification:
   - Recreate five scanned pages (Bhoop, Bhimpalasi, Khamaj chautaal, Alhaiya Bilawal dhamar, Bihag jhaptaal) from JSON and compare them side by side with the scans.
   - Compare the label export against your annotations: same classes, same counts per page.
