from hb import *

ROWS = [
    ("ELEMENT, REGISTRY, BOUNDINGBOX", "ELEMENT, REGISTRY, BOUNDINGBOX", "k", "COPIED. CATEGORY = DATASET CLASS NAME"),
    ("FRACTION, TICKS", "FRACTION (NO RESOLUTION)", "k", "EXACT RATIONALS; ONE MATRA = 1"),
    ("TICKABLE, NOTE", "TICKABLE, NOTE", "k", "TICKS, WIDTH, MODIFIER CONTEXT"),
    ("STAVENOTE", "SWARNOTE, SWARREST", "c", "GLYPH IS SHAPED DEVANAGARI OR LATIN"),
    ("TEXTNOTE (LYRICS)", "LYRICNOTE, LYRICREST", "c", "LYRICS ARE A SECOND VOICE, SAME TICKS"),
    ("VOICE", "VOICE (STRICT, SOFT)", "k", "OVER-FULL VOICE IS AN ERROR"),
    ("MODIFIERCONTEXT", "MODIFIERCONTEXT", "k", "FIXED ORDER, ONE SHARED STATE"),
    ("GRACENOTEGROUP", "KANGROUP", "c", "KAN LANE ABOVE SWAR; NESTS 2 LEVELS"),
    ("TICKCONTEXT", "TICKCONTEXT + MATRACONTEXT", "n", "MATRA PACKS EVENTS TIGHT, CENTRED"),
    ("FORMATTER", "FORMATTER (NO SOFTMAX, NO TUNE)", "c", "EQUAL COLUMNS, NOT PROPORTIONAL"),
    ("STAVE, SYSTEM", "TAALSTAVE, PAGE", "c", "ROW = TAAL CYCLE; PAGE = ONE GRID"),
    ("CURVE, TUPLET", "GROUPINGCURVE, MEEND, TIHAI", "c", "MEEND IS PARTIAL AT A ROW END"),
    ("VOLTA, BARLINE", "VOLTA, REPEATBAR, VIBHAGLINE", "c", "BARS COME FROM THE TAAL TABLE"),
    ("SVGCONTEXT", "SVGCONTEXT (GROUP BBOX)", "c", "RECORDS A BOX FOR EACH GROUP"),
]


def fig_map():
    s = []
    x1, w1, x2, w2, xr = 1.5, 50, 63, 52, 119
    s.append(T(x1, 3.6, "VEXFLOW 4.2.6", "lbl-b"))
    s.append(T(x2, 3.6, "BHATKHANDE-FLOW", "lbl-b"))
    s.append(T(xr, 3.6, "REASON", "lbl-b"))
    y0, dy, h = 6.2, 4.15, 3.3
    for i, (a, b, st, why) in enumerate(ROWS):
        y = round(y0 + i * dy, 2)
        s.append(f'<rect class="box" x="{x1}" y="{y}" width="{w1}" height="{h}"/>')
        s.append(T(x1 + 1.6, round(y + 2.35, 2), a))
        if st == "n":
            s.append(f'<rect class="gap" x="{x2}" y="{y}" width="{w2}" height="{h}"/>')
        else:
            s.append(f'<rect class="box" x="{x2}" y="{y}" width="{w2}" height="{h}"/>')
        if st == "c":
            s.append(f'<rect class="vid" x="{x2 + w2 - 2.6}" y="{y}" width="2.6" height="{h}"/>')
        s.append(T(x2 + 1.6, round(y + 2.35, 2), b))
        s.append(WA(x1 + w1, round(y + h / 2, 2), x2 - 0.4, round(y + h / 2, 2)))
        s.append(T(xr, round(y + 2.35, 2), why))
    yl = y0 + dy * len(ROWS) + 1.2
    s.append(f'<rect class="box" x="{x1}" y="{yl}" width="5" height="2.4"/>' + T(x1 + 6.4, yl + 1.9, "KEPT"))
    s.append(f'<rect class="box" x="22" y="{yl}" width="5" height="2.4"/><rect class="vid" x="24.4" y="{yl}" width="2.6" height="2.4"/>' + T(28.4, yl + 1.9, "CHANGED: SAME MECHANISM, BHATKHANDE CONTENT"))
    s.append(f'<rect class="gap" x="96" y="{yl}" width="5" height="2.4"/>' + T(102.4, yl + 1.9, "NEW: NO VEXFLOW EQUIVALENT"))
    return "\n".join(s)


def fig_stack():
    s = []
    boxes = [("KHATKA", ["BRACKET", "LEFT, RIGHT"]), ("KOMAL", ["MARK", "BELOW"]), ("TIVRA", ["MARK", "ABOVE"]),
             ("OCTAVE", ["DOT", "ABOVE, BELOW"]), ("KAN", ["GROUP", "OWN LANE ABOVE"])]
    s.append(T(2, 2.2, "MODIFIERCONTEXT.PREFORMAT() ORDER", "lbl-b"))
    for i, (t, ls) in enumerate(boxes):
        x = round(2 + i * 20.4, 2)
        s.append(BOX(x, 9.5, 18, 12, t, ls))
        s.append(f'<g transform="translate({x + 3.2} 6.6)"><circle class="of" r="1.3"/><text class="lbl-s" y="0.65" text-anchor="middle" style="font-size:1.8px">{i + 1}</text></g>')
        if i < 4:
            s.append(WA(x + 18, 15.5, x + 20.0, 15.5))
        s.append(WA(x + 9, 21.5, x + 9, 28.6))
    s.append(f'<rect class="box" x="2" y="29" width="99.6" height="8"/>')
    s.append(T(51.8, 32.6, "SHARED STATE", "lbl", "middle"))
    s.append(T(51.8, 35.4, "LEFT_SHIFT   RIGHT_SHIFT   TOP_PX   BOTTOM_PX", "lbl-s", "middle"))
    s.append(T(51.8, 42.4, "EACH CLASS STACKS OUTSIDE THE ONE BEFORE IT", "lbl-s", "middle"))
    s.append(TL(108.4, -0.6, 108.4, 44.6))
    # detail A: above
    s.append(T(111, 2.2, "DETAIL A: ABOVE", "lbl-b"))
    s.append(T(120, 30.2, "M", "lbl-b", "middle", ' style="font-size:9px"'))
    s.append(W(120, 20.6, 120, 23.4))
    s.append(f'<circle class="dot" cx="120" cy="16.6" r="0.7"/>')
    s.append(T(120, 11.4, "R", "lbl-b", "middle", ' style="font-size:4.4px"'))
    s.append(T(126.4, 11.1, "KAN SWAR"))
    s.append(LD(126, 10.6, 122.8, 10.4))
    s.append(T(126.4, 17.4, "TAAR DOT"))
    s.append(LD(126, 16.8, 121.0, 16.7))
    s.append(T(126.4, 22.8, "TIVRA STROKE"))
    s.append(LD(126, 22.2, 120.9, 22.0))
    s.append(TL(144.4, -0.6, 144.4, 44.6))
    # detail B: below
    s.append(T(147, 2.2, "DETAIL B: BELOW", "lbl-b"))
    s.append(T(156, 24.6, "G", "lbl-b", "middle", ' style="font-size:9px"'))
    s.append(W(153.2, 27.6, 158.8, 27.6))
    s.append(f'<circle class="dot" cx="156" cy="31.4" r="0.7"/>')
    s.append(T(162.4, 28.2, "KOMAL BAR"))
    s.append(LD(162, 27.5, 159.5, 27.6))
    s.append(T(162.4, 33.0, "MANDRA DOT"))
    s.append(LD(162, 32.3, 157, 31.5))
    s.append(T(147, 39.6, "NEARER THE GLYPH FIRST", "lbl-s"))
    return "\n".join(s)


def build():
    b = []
    b.append(para("1.2.1", "INTRODUCTION.",
        "The engine copies VexFlow&rsquo;s mechanism wherever the problem is the same, and follows the printed Bhatkhande books wherever it differs. "
        "Four ideas carry over: elements report their widths before any x is assigned; contexts resolve collisions; the formatter owns x and the stave owns y; "
        "spanners are drawn last, from final positions (<span class='nowrap'>figure 1.2-1</span>)."))
    b.append(figure(fig_map(), 68, "BFL-201A", "1.2-1", "VexFlow Class Mapping"))
    b.append(para("1.2.2", "FUNCTIONAL DESCRIPTION.",
        "Notes and modifiers join one ModifierContext per onset, then one TickContext per onset across the swar and lyric voices. A MatraContext groups the "
        "TickContexts of one matra, packs them tightly and centres the cluster in its column. TaalStave stacks the lanes; Page gives every column its x from one grid "
        "(<span class='nowrap'>figure 1.2-2</span>).", style="margin-top:2.2mm"))
    b.append(para("1.2.2.1", "Stacking Order.",
        "preFormat() calls each modifier class once, inner to outer. All five share one state, so a class stacks outside what came before it: "
        "komal bar below the glyph, then mandra dots; tivra stroke above, then taar dots, then the kan lane.", level=3, flush=True, bar=(0.4, 6.8)))
    b.append(figure(fig_stack(), 45, "BFL-202A", "1.2-2", "Modifier Stacking Order And Detail"))
    rows = [
        ("Taal markers above the swars", "BELOW THE LYRICS"),
        ("Held swar written as avagraha", "DASH IN SWAR LINE"),
        ("Bar at the start of a row", "NO OPENING BAR"),
        ("Rows broken by page width", "ROW = ONE TAAL CYCLE"),
        ("Sub-beats spread apart", "PACKED, CURVE UNDER"),
        ("Matra width varies by row", "ONE WIDTH PER PAGE"),
        ("Kan as a small superscript", "OWN LANE ABOVE SWAR"),
        ("Parentheses read as murki", "KHATKA BRACKETS"),
        ("Grouping drawn as a bracket", "CURVE UNDER SWARS"),
    ]
    left = table("1.2.3", "1.2-1", ("PERFORMANCE AND DESIGN DATA.", "Corrections To The First Engine"), ("Defect in v0.x", "Rule in v1"), rows)
    right = notice("NOTE", "Copy the mechanism when the problem is the same. When Bhatkhande differs, the scanned page decides, not Western habit.") + \
        card("ADD A MODIFIER", "DEVELOPER", [
            ("1", "src/modifiers - new class"),
            ("2", "CATEGORY - dataset class name"),
            ("3", "static format(members, state)"),
            ("4", "ModifierContext - call in order"),
            ("5", "builder.decorate - attach it"),
            ("6", "labels.ts - add to classes"),
            ("7", "test - add a case"),
        ])
    b.append(lower(left, right))
    return page("1.2", "VEXFLOW ANALYSIS AND CLASS MAPPING", "\n".join(b), "1.2-1")
