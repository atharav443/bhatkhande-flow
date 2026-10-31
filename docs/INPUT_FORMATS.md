# Input formats

The engine accepts three kinds of input. All three are turned into one internal model (`BandishModel`, `src/input/types.ts`) before anything is drawn, so the same bandish gives the same picture whichever way you write it.

| You have                                           | Use                                 | Detected by                                         | Convert with                                                               |
| -------------------------------------------------- | ----------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| A bandish you are typing or generating             | **Bandish JSON** (section 1)        | any JSON that is not a Label Studio export          | n/a                                                                        |
| A file from the swartaal tool, or you prefer tags  | **Swartaal XML** (section 2)        | text starts with `<`                                | `npx tsx cli/bandish2xml.ts in.json out.xml`                               |
| Annotations of a scanned page made in Label Studio | **Label Studio export** (section 3) | JSON with `data` and `annotations` or `predictions` | `npx tsx cli/ls2bandish.ts out.json "<title>" page1.json [page2.json ...]` |

Render any of them the same way. The format is detected from the content, not the file name:

```bash
npm run render -- <file> out --png
```

**Full examples: `examples/full-sample.json` and `examples/full-sample.xml`.** One synthetic bandish (a sample, not a real raag) that uses every feature the engine draws, written once in each format. The XML has a comment above each feature. They render to the identical SVG (a test checks this). Open both side by side to see how a JSON field maps to an XML tag or attribute. What each part shows:

| Part of the file                | Feature shown                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `metadata`                      | title, raag, taal, laya, thaat, composer, label, tempo, and `text` (lyric lines printed under the title)                                            |
| स्थायी, `startMatra: 9`, line 1 | a pickup row (starts at matra 9, so it sits right-aligned); mandra (`octave: -1`) and taar (`octave: 1`) dots; tivra ma; two events sharing a matra |
| स्थायी, line 2, matras 1–2      | a swar held for 2 matras (`duration: 2`) and the empty matra it carries into                                                                        |
| स्थायी, line 2, matras 3–5      | explicit durations (`1/2`), an `extend` (dash), and three events sharing a matra (1/3 each)                                                         |
| स्थायी, line 2, matras 6–8      | `kan`; kan inside kan; `khatka`                                                                                                                     |
| स्थायी, line 2, matras 9–12     | komal re, dha, ni, ga                                                                                                                               |
| स्थायी, line 2, matras 13–16    | `meend: start` and `meend: end`; a rest                                                                                                             |
| `spans` (last)                  | a meend made from two event `id`s, instead of `start` and `end` on the swars                                                                        |
| अन्तरा                          | `repeatStart` on the line; alternate endings (`volta` 1 and 2); `repeatAfter` on the last matra of ending 1; swar text `सां` (taar)                 |
| तिहाई                           | a `tihai` (phrase, repeat 3, `landsOn: sam`, label); it runs from matra 9 and its last note lands on sam                                            |
| स्वरमालिका                      | string shorthand (`"N."`, `"S'"`, `"m"`, `"-"`, `","`) in a section with no lyrics                                                                  |

If you change one of the two files, change the other the same way: the test fails when they stop matching. Real pages: `examples/*.json` (transcribed from the Raag Bodh Praveshika scans) and `examples/labelstudio/*.json` (real Label Studio exports).

Where each format comes from:

- **Bandish JSON** is this project's own authoring format. Its structure (metadata, sections, lines, matras, events) follows the swartaal layout. The normalizer in `src/input/fromJSON.ts` is the source of truth and accepts several aliases (listed below).
- **Swartaal XML** is the `<hindustani-composition>` schema of the swartaal tool. It is not a public standard such as MusicXML. `src/input/fromXML.ts` is the source of truth. It adds a few optional extensions the engine needs: `<rest/>`, `<extend/>`, `kan`, `meend`, `khatka`, `<tihai>` and `<span>`.
- **Label Studio export** is the JSON export of tasks from the BhatkhandeSet annotation project, using its `from_name` fields (section 3). `src/input/fromLabelStudio.ts` is the source of truth.

---

## 1. Bandish JSON

Shape: `metadata` → `sections[]` → `lines[]` → `matras[]` → `events[]`.

```json
{
  "metadata": { "title": "राग भैरव", "raag": "Bhairav", "taal": "teentaal" },
  "sections": [
    {
      "name": "स्थायी",
      "startMatra": 1,
      "lines": [
        {
          "matras": [
            { "events": [{ "swar": "सा", "lyric": "प्र" }] },
            { "events": [{ "swar": "रे", "komal": true, "lyric": "भु" }] },
            {
              "events": [
                { "swar": "ग", "lyric": "दा" },
                { "swar": "म", "lyric": "ऽ" }
              ]
            },
            { "events": [{ "swar": "प", "octave": 1, "lyric": "ता" }] }
          ]
        }
      ]
    }
  ]
}
```

### metadata

| Field                                                                               | Meaning                                                                                        |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `title`                                                                             | Page title. If missing, `राग <raag>` is used.                                                  |
| `raag` (or `raga`)                                                                  | Raag name.                                                                                     |
| `taal` (or `tala`)                                                                  | A taal name such as `"teentaal"`, or an object (see below). The page subtitle is `ताल-<name>`. |
| `laya`, `thaat`, `composer` (or `bandishkar`), `label` (or `geet`), `tempo`, `text` | Optional. Kept in the model.                                                                   |

Taal names are not case sensitive and ignore spaces, dashes and underscores. Built in:

| Taal       | Accepted names                             | Vibhags | Markers     |
| ---------- | ------------------------------------------ | ------- | ----------- |
| Teentaal   | teentaal, tintal, teental, tritaal, तीनताल | 4+4+4+4 | X 2 0 3     |
| Jhaptaal   | jhaptaal, jhaptal, jhap, झपताल             | 2+3+2+3 | X 2 0 3     |
| Ektaal     | ektaal, ektal, एकताल                       | 2×6     | X 0 2 0 3 4 |
| Chautaal   | chautaal, chautal, चौताल                   | 2×6     | X 0 2 0 3 4 |
| Rupak      | rupak, roopak, रूपक                        | 3+2+2   | 0 2 3       |
| Dadra      | dadra, दादरा                               | 3+3     | X 0         |
| Keherwa    | keherwa, kaharwa, कहरवा                    | 4+4     | X 0         |
| Dhamar     | dhamar, धमार                               | 5+2+3+4 | X 2 0 3     |
| Jhoomra    | jhoomra, jhumra, झूमरा                     | 3+4+3+4 | X 2 0 3     |
| Deepchandi | deepchandi, dipchandi, दीपचंदी             | 3+4+3+4 | X 2 0 3     |
| Tilwada    | tilwada, tilvada, तिलवाड़ा                 | 4+4+4+4 | X 2 0 3     |

A taal that is not in the table: give an object, `"taal": { "name": "mytaal", "vibhags": [3, 3, 2], "markers": ["X", "2", "0"] }`. `markers` must have one entry per vibhag.

### sections, lines, matras

| Where   | Field                                       | Meaning                                                                                                                                              |
| ------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| section | `name`                                      | Heading, for example `स्थायी`, `अन्तरा`.                                                                                                             |
| section | `startMatra`                                | Cycle position (1 to the taal length) where its first matra falls. A bandish that starts at matra 9 uses `9`.                                        |
| line    | `matras`                                    | The matras of one line, in order. A line is cut into rows at the cycle edge.                                                                         |
| line    | `repeatStart`, `repeatEnd`                  | Repeat signs at the line edges.                                                                                                                      |
| matra   | `events`                                    | What is sung or played in this matra.                                                                                                                |
| matra   | `index`                                     | Optional cycle position (1 to the taal length). If given and different from the expected position, a `matra.sequence` warning is reported.           |
| matra   | `volta`                                     | Alternate ending, `1` or `"1."`, `2`, ... See "Volta and repeats" in the README.                                                                     |
| matra   | `repeatBefore`, `repeatAfter`               | Repeat sign before or after the matra. It must sit on a vibhag bar or a row edge.                                                                    |
| line    | `{ "tihai": {...} }` as an item in `matras` | A tihai. Fields: `phrase`, `unit`, `repeat` (default 3), `gap`, `gapKind` (`rest` or `extend`), `landsOn` (`sam`, `any` or a matra number), `label`. |

Also accepted: `lines[].khands[].matras[]` in place of `lines[].matras[]`, and `matras[].pairs`, `matras[].swars` in place of `events`.

### events

An event is a string or an object.

**Strings**

| Write                             | Meaning                                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `"सा"`, `"Sa"`, `"S"`             | A swar. Devanagari, Latin names (Sa Re Ga Ma Pa Dha Ni) and single letters (S R G M P D N) all work. |
| `"r"`, `"g"`, `"d"`, `"n"`, `"m"` | Komal re, ga, dha, ni, and tivra ma.                                                                 |
| `"सा'"`, `"सां"`, `"S'"`          | Taar saptak (doubled for ati-taar).                                                                  |
| `"ध."`, `"ध़"`, `"D."`            | Mandra saptak (doubled for ati-mandra).                                                              |
| `"-"` (also `"ऽ"`, `"_"`)         | The previous swar is held: printed as a dash.                                                        |
| `"rest"`, `","`, `"0"`            | A rest. Bhatkhande notation has no printed rest sign, so it is drawn as an empty slot.               |

**Objects**

| Field            | Meaning                                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `swar`           | As above. (`text`, `degree` and `name` also work.)                                                                                                 |
| `type`           | `"swar"` (default when `swar` is present), `"rest"` or `"extend"`.                                                                                 |
| `komal`, `tivra` | `true`. The engine ignores a flag on a swar that cannot take it (only re, ga, dha, ni can be komal; only ma can be tivra) and reports a warning.   |
| `octave`         | `-2` ati-mandra, `-1` mandra, `0` madhya (default), `1` taar, `2` ati-taar. The names `mandra`, `taar` and so on also work.                        |
| `duration`       | In matras: `1`, `"1/2"`, `"1/3"`, `2`. If left out, the events of a matra share it equally. A duration over 1 holds the swar into the next matras. |
| `lyric`          | Syllable. `"ऽ"` means a prolonged syllable (avagraha). If a section has lyrics, a swar without one gets `ऽ`.                                       |
| `kan`            | Grace notes, as a list of strings or objects (`swar`, `octave`, `komal`, `tivra`). A kan can carry its own `kan` (kan inside kan, two levels).     |
| `khatka`         | `true`: the swar is printed in parentheses.                                                                                                        |
| `meend`          | `"start"`, `"end"` or `"both"`.                                                                                                                    |

### spans (optional, top level)

`"spans": [ { "type": "meend", "from": "<event id>", "to": "<event id>" } ]`. `type` can be `meend`, `khatka` or `tihai`. Events get ids from their `id` field.

---

## 2. Swartaal XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<hindustani-composition version="1">
  <metadata>
    <title>राग भैरव</title>
    <raag>Bhairav</raag>
    <taal name="teentaal"/>
  </metadata>
  <section name="स्थायी" start-matra="1">
    <line number="1">
      <matra index="1"><swar>सा</swar><lyric>प्र</lyric></matra>
      <matra index="2"><swar komal="true">रे</swar><lyric>भु</lyric></matra>
      <matra index="3">
        <swar duration="1/2">ग</swar><lyric>दा</lyric>
        <swar duration="1/2">म</swar><lyric>ऽ</lyric>
      </matra>
      <matra index="4"><swar octave="1">प</swar><lyric>ता</lyric></matra>
    </line>
  </section>
</hindustani-composition>
```

It is the same model as the JSON, written as tags and attributes. Mapping:

| XML                                                                                                                      | JSON equivalent                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `<metadata>` children (`title`, `raag`, `laya`, ...)                                                                     | `metadata.<name>`                                                                                                                     |
| `<taal name="teentaal"/>`                                                                                                | `metadata.taal`. For a taal not in the table add `vibhags="3,3,2"` and `markers="X,2,0"`. A taal name is written as `name`, not `id`. |
| `<section name=".." start-matra="..">`                                                                                   | section                                                                                                                               |
| `<line number=".." repeat-start="true" repeat-end="true">`                                                               | line                                                                                                                                  |
| `<matra index=".." volta=".." repeat-before=".." repeat-after="..">`                                                     | matra                                                                                                                                 |
| `<khand>` wrapping `<matra>` elements                                                                                    | allowed; matras are read in document order                                                                                            |
| `<swar komal=".." tivra=".." octave=".." duration=".." khatka=".." meend=".." meend-start=".." meend-end="..">सा</swar>` | swar event. Attribute values are text: `"true"`, `"1/2"`, `"1"`.                                                                      |
| `<kan octave=".." komal="..">नी</kan>` inside `<swar>`                                                                   | kan. A `<kan>` inside a `<kan>` nests.                                                                                                |
| `<rest duration=".."/>`, `<extend duration=".."/>`                                                                       | rest and held swar                                                                                                                    |
| `<lyric>प्र</lyric>` right after an event                                                                                | that event's lyric. A lyric written before its swar also attaches to it.                                                              |
| `<tala-marker>`, `<taal-marker>` inside `<matra>`                                                                        | authored taal marker. Normally leave it out: it is derived from the taal and checked.                                                 |
| `<tihai repeat="3" gap="1/2" unit="1/2" lands-on="sam" label="..">` with `<swar>` children, directly inside `<line>`     | tihai                                                                                                                                 |
| `<span type="meend" from=".." to=".."/>` at the top or inside `<section>`                                                | span                                                                                                                                  |

Make XML from JSON or from a Label Studio export: `npx tsx cli/bandish2xml.ts examples/labelstudio/raag-bhairav-geet3-raw-export.json out.xml`. The converter writes metadata, sections, lines, matras, volta and repeat signs, swars (komal, tivra, octave, khatka, duration), kan, rests, held swars and lyrics. It does not write meend, tihai or spans, so a JSON that uses them loses them in the XML.

---

## 3. Label Studio export

**What to export:** in Label Studio, `Export` → `JSON` (the full format with `result` lists, not `JSON-MIN` or CSV, which are flattened and not read). Either a single task or the list of tasks works. The engine reads `annotations[0].result` if the task has an annotation, otherwise `predictions[0].result`. An embedded image (`data.image`) is not needed and can be removed.

**Task `data` fields used:** `taal` (a taal name such as `teentaal`), `raag`. `source_file` is recorded in the output metadata. The other fields (`title`, `book`, `pdf_page_number_1based`, ...) are not used. The page title comes from the raag, or from the title you pass to `ls2bandish.ts`.

**Regions.** Each annotated box is a `rectanglelabels` result plus one result per attribute, all sharing the same `id`. The importer joins them by `id`.

| Box label             | Used for                                      |
| --------------------- | --------------------------------------------- |
| `swar`, `swar_rest`   | The notes. `swar_rest` is a held swar (dash). |
| `lyric`, `lyric_rest` | Syllables (`lyric_rest` is the `ऽ`).          |
| `kan_swar`            | Grace notes.                                  |
| `khatka_bracket`      | Marks the swar it names as khatka.            |

Other boxes (`vibhag_line`, `line_end_bar`, `taal_marker`, `komal_mark`, `octave_dot`, `grouping_curve`, ...) are read by nothing: the engine redraws them from the taal and the swar attributes, and the page's own annotations of them are only for comparison.

**Attributes read from each box (the `from_name` of the result):**

| `from_name`                                  | On                       | Meaning                                                                                                   |
| -------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `swar_id`                                    | swar                     | Reading order on the page. Events are sorted by it.                                                       |
| `swar_type`                                  | swar                     | `Sa`, `Re`, `Ga`, `Ma`, `Pa`, `Dha` or `Ni`.                                                              |
| `variant`                                    | swar                     | `shuddha`, `komal` or `tivra`.                                                                            |
| `octave`                                     | swar                     | `ati-mandra`, `mandra`, `madhya`, `taar` or `ati-taar`.                                                   |
| `bandish_part_swar`                          | swar                     | `Sthayi`, `Antara`, `Sanchari` or `Abhog`. This starts a new section when it changes.                     |
| `line_number`                                | swar                     | Line within the part. A new number starts a new line.                                                     |
| `matra_number`                               | swar                     | Cycle position (1 to the taal length) of the matra. A matra of the taal's cycle, **not** a running count. |
| `matra_fraction`                             | swar                     | `1`, `1/2`, `1/3` ... the swar's duration.                                                                |
| `sequence_in_matra`                          | swar                     | 1, 2, 3 for swars sharing a matra.                                                                        |
| `lyric_id_for_swar`                          | swar                     | The id of the lyric that goes under this swar.                                                            |
| `lyric_applies_to_swar_id`                   | lyric                    | The `swar_id` this lyric belongs to.                                                                      |
| `lyric_text`                                 | lyric                    | The syllable.                                                                                             |
| `kan_swar_type`, `kan_octave`, `kan_variant` | kan_swar                 | The grace note, in the same terms as the swar.                                                            |
| `modifies_swar_id`                           | kan_swar, khatka_bracket | The swar the grace note or bracket belongs to.                                                            |

**What it does not read:** volta, repeats, tihai and meend. If your page has them, convert once with `ls2bandish.ts`, then add them to the JSON by hand.

**Converting for inspection.** `npx tsx cli/ls2bandish.ts out.json "<title>" page1.json page2.json` writes the bandish JSON the engine builds from the export, and joins several pages of one bandish in the order given. The browser playground can also download this JSON.

**Known limit:** when a section has no full-cycle line (for example an Antara of eight matras), its row is placed on the grid of the section before it. This matches the printed pages seen so far, but it is a rule, not something the annotation states.

---

## Diagnostics

A problem in the input never stops the render. Each one is printed as `[level] code: message (path)`. Codes include `model.empty` (no sections), `taal.unknown`, `swar.unknown`, `matra.sequence`, `matra.underfull`, `duration.invalid`, `repeat.offbar`, `tihai.sam`. The full list is in `src/input/lower.ts` and `src/input/fromJSON.ts` (search for `code:`).

If you see `model.empty` and `taal.unknown` together, the file was not recognised as any of the three formats. Check that a Label Studio export still has its `data` and `annotations` or `predictions`, and that bandish JSON has a top-level `sections` array.
