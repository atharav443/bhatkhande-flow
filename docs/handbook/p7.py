from hb import *

CLASSES = ["swar", "swar_rest", "lyric", "lyric_rest", "kan_swar", "khatka_bracket", "octave_dot", "komal_mark", "tivra_mark",
           "grouping_curve", "meend", "tihai_bracket", "taal_marker", "vibhag_line", "line_end_bar", "repeat_bar", "volta_bracket",
           "section_heading", "title"]


def fig_labels():
    s = []
    chain = [
        ("ELEMENT", ["CATEGORY = CLASS NAME", "DATA-* METADATA"]),
        ("OPENGROUP", ["G CLASS = CATEGORY", "WRITES DATA-* ATTRS"]),
        ("SVGCONTEXT", ["BOX OF EACH GROUP", "TRACKED WHILE DRAWING"]),
        ("COLLECTLABELS", ["KEEPS THE 19 CLASSES", "SCALES TO OUTPUT PX"]),
        ("TOYOLO", ["CLASS CX CY W H", "NORMALISED 0 TO 1"]),
    ]
    for i, (t, ls) in enumerate(chain):
        x = round(0.5 + i * 37.5, 2)
        s.append(BOX(x, 3, 29, 14, t, ls))
        if i < 4:
            s.append(WA(round(x + 29, 2), 10, round(x + 36.6, 2), 10))
    s.append(T(2, 25.0, "THE 19 LABEL CLASSES, IN YOLO INDEX ORDER", "lbl-b"))
    for i, c in enumerate(CLASSES):
        r, k = divmod(i, 5)
        x, y = round(0.5 + k * 35.9, 2), round(28 + r * 6.4, 2)
        s.append(f'<rect class="box" x="{x}" y="{y}" width="34.4" height="5.2"/>')
        s.append(T(round(x + 1.6, 2), round(y + 3.6, 2), f"{i:02d}", "lbl-s"))
        s.append(T(round(x + 6.0, 2), round(y + 3.6, 2), c.upper(), "lbl"))
    return "\n".join(s)


def fig_hosts():
    s = [T(2, 2.4, "FONT PROVIDERS BEHIND ONE FACTORY", "lbl-b")]
    lanes = [
        (6.0, "NODE", "FONTKIT (NODE)", "SVG, OUTLINES", "box"),
        (17.0, "BROWSER", "FONTKIT (BROWSER)", "SVG, OUTLINES", "box"),
        (28.0, "BROWSER", "CANVAS METRICS", "SVG, TEXT", "gap"),
    ]
    for y, host, prov, out, cls in lanes:
        s.append(BOX(2, y, 18, 8, host))
        s.append(WA(20, y + 4, 27.6, y + 4))
        s.append(BOX(28, y, 32, 8, prov))
        s.append(WA(60, y + 4, 67.6, y + 4))
        s.append(BOX(68, y, 30, 8, out, cls=cls))
    s.append(POLY([(100.6, 10.0), (103.6, 10.0), (103.6, 21.0), (100.6, 21.0)]))
    s.append(T(105.2, 14.6, "A = B,", "lbl-s")); s.append(T(105.2, 17.3, "BYTE FOR", "lbl-s")); s.append(T(105.2, 20.0, "BYTE", "lbl-s"))
    s.append(T(2, 41.8, "OUTLINES GIVE THE EXACT SVG. CANVAS NEEDS NO FONT LIBRARY.", "lbl-s"))
    s.append(TL(117.4, -0.6, 117.4, 44.6))
    s.append(T(120, 2.4, "DETAIL A: PLAYGROUND", "lbl-b"))
    s.append(PANEL(119.6, 4.8, 59.4, 36.0, "BROWSER PAGE"))
    ctr = [("SOURCE", "JSON, XML, EXPORT"), ("ENGINE", "OUTLINES, CANVAS"), ("SCRIPT", "DEVANAGARI, LATIN"), ("OVERLAY", "LABEL BOXES")]
    for i, (t, d) in enumerate(ctr):
        s.append(BOX(122, round(9.6 + i * 7.6, 2), 28, 6.8, t, [d]))
    s.append(BOX(153, 9.6, 24.6, 19, "LIVE RENDER", ["CLICK A GLYPH:", "CLASS, ID, MATRA"]))
    s.append(BOX(153, 31.2, 24.6, 8.8, "SAVE", ["SVG PNG YOLO JSON"]))
    return "\n".join(s)


def build():
    b = []
    b.append(para("1.7.1", "INTRODUCTION.",
        "Every element opens an SVG group named after its BhatkhandeSet class and carrying its metadata. The context records the box of each group, so one render is also a "
        "labelled sample: one box per element, 19 classes, written as YOLO text and as JSON (<span class='nowrap'>figure 1.7-1</span>)."))
    b.append(figure(fig_labels(), 56, "BFL-701A", "1.7-1", "Label Export Chain And Class List"))
    b.append(para("1.7.2", "FUNCTIONAL DESCRIPTION.",
        "collectLabels() keeps the groups whose class is in the taxonomy and scales their boxes to the output size. toYOLO() normalises them. The engine runs in Node and in "
        "the browser. The outline provider shapes Devanagari with fontkit and gives the same SVG in both; the canvas provider needs no font library "
        "(<span class='nowrap'>figure 1.7-2</span>).", style="margin-top:2.2mm"))
    b.append(para("1.7.2.1", "Open Items.",
        "Meend is drawn as an arc above the swars and a silence as an empty slot, because no scanned page shows either. Paluskar notation is out of scope. "
        "Bihag geet 3 draws three tivra strokes against two annotated; some strokes on that page are faint.",
        level=3, flush=True, bar=(0.4, 10.4)))
    b.append(figure(fig_hosts(), 45, "BFL-702A", "1.7-2", "Font Providers And Playground"))
    rows = [
        ("Bihag geet 4 vs annotation", "ALL CLASS COUNTS EQUAL"),
        ("Bhimpalasi geet vs annotation", "ALL CLASS COUNTS EQUAL"),
        ("Alhaiya Bilawal dhamar", "KAN, SWAR, LYRIC, DASH, BAR"),
        ("Label Studio import, ektaal", "ANNOTATED COUNTS REPRODUCED"),
        ("Convention tests (8)", "PASS"),
        ("Browser SVG vs Node SVG", "BYTE-IDENTICAL, 5 FILES"),
        ("Every example", "RENDERS WITH BOTH ENGINES"),
        ("Browser round trip, export", "MATCHES NODE"),
        ("Playground smoke test", "PASS, HEADLESS CHROMIUM"),
        ("Bihag geet 3, tivra strokes", "3 DRAWN, 2 ANNOTATED (OPEN)"),
        ("Test suite", "18 OF 18 PASS"),
    ]
    left = table("1.7.3", "1.7-1", ("PERFORMANCE AND DESIGN DATA.", "Verification Record"), ("Check", "Result"), rows)
    right = notice("NOTE", "If port 5173 is busy, the playground server tries the next port and prints the address it opened.") + \
        card("START THE PLAYGROUND", "USER", [
            ("1", "SHELL - npm run web"),
            ("", "√ address printed (5173 or next)"),
            ("2", "BROWSER - open the address"),
            ("3", "DROP - bandish, XML or export"),
            ("4", "TOGGLE - overlay label boxes"),
            ("5", "CLICK - inspect a swar"),
            ("6", "SAVE - svg, png, yolo, json"),
        ])
    b.append(lower(left, right))
    return page("1.7", "LABELS, BROWSER AND VERIFICATION", "\n".join(b), "1.7-1")
