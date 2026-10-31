from hb import *

X0, CW = 11.0, 28.0   # first matra column, matra column width


def cell(x, y, w, h, text, sub=None, cls="box"):
    s = f'<rect class="{cls}" x="{round(x, 2)}" y="{y}" width="{round(w, 2)}" height="{h}"/>'
    if sub:
        s += T(round(x + w / 2, 2), round(y + h / 2 - 0.2, 2), text, "lbl", "middle") + T(round(x + w / 2, 2), round(y + h / 2 + 2.6, 2), sub, "lbl-s", "middle")
    else:
        s += T(round(x + w / 2, 2), round(y + h / 2 + 0.85, 2), text, "lbl", "middle")
    return s


def fig_lower():
    s = []
    ya, yl, yp, h = 9.0, 29.0, 49.0, 9.6
    s.append(T(2, ya + 5.6, "AUTHORED", "lbl-s")); s.append(T(2, ya + 8.4, "EVENTS", "lbl-s"))
    s.append(T(2, yl + 5.6, "LOWERED", "lbl-s")); s.append(T(2, yl + 8.4, "SLOTS", "lbl-s"))
    s.append(T(2, yp + 5.6, "PRINTED", "lbl-s")); s.append(T(2, yp + 8.4, "ROW", "lbl-s"))
    # column headers + grid ticks
    for m in range(6):
        x = X0 + m * CW
        s.append(T(round(x + CW / 2, 2), 4.6, f"MATRA {m + 1}", "lbl-s", "middle"))
        if m:
            s.append(TL(x, 6.2, x, 59.8, "ev"))
    # authored: held S (3 beats), R G, M P D, P + rest
    s.append(cell(X0 + 0.6, ya, 3 * CW - 1.2, h, "S", "DURATION 3 BEATS"))
    s.append(cell(X0 + 3 * CW + 0.6, ya, CW / 2 - 0.6, h, "R")); s.append(cell(X0 + 3 * CW + CW / 2, ya, CW / 2 - 0.6, h, "G"))
    w3 = (CW - 1.2) / 3
    for i, t in enumerate("MPD"):
        s.append(cell(X0 + 4 * CW + 0.6 + i * w3, ya, w3 - 0.0, h, t))
    s.append(cell(X0 + 5 * CW + 0.6, ya, CW / 2 - 0.6, h, "P", "1/2")); s.append(cell(X0 + 5 * CW + CW / 2, ya, CW / 2 - 0.6, h, "REST", "1/2"))
    # lowered slots
    s.append(cell(X0 + 0.6, yl, CW - 1.2, h, "SWAR S", "1"))
    s.append(cell(X0 + CW + 0.6, yl, CW - 1.2, h, "EXTEND", "1, CARRIED", "gap"))
    s.append(cell(X0 + 2 * CW + 0.6, yl, CW - 1.2, h, "EXTEND", "1, CARRIED", "gap"))
    s.append(cell(X0 + 3 * CW + 0.6, yl, CW / 2 - 0.6, h, "R", "1/2")); s.append(cell(X0 + 3 * CW + CW / 2, yl, CW / 2 - 0.6, h, "G", "1/2"))
    for i, t in enumerate("MPD"):
        s.append(cell(X0 + 4 * CW + 0.6 + i * w3, yl, w3, h, t, "1/3"))
    s.append(cell(X0 + 5 * CW + 0.6, yl, CW / 2 - 0.6, h, "P", "1/2")); s.append(cell(X0 + 5 * CW + CW / 2, yl, CW / 2 - 0.6, h, "BLANK", "1/2", "gap"))
    # arrows authored -> lowered
    for x in (X0 + CW / 2, X0 + 3.5 * CW - 0.3, X0 + 4.5 * CW, X0 + 5.5 * CW - 0.3):
        s.append(WA(round(x, 2), ya + h + 0.4, round(x, 2), yl - 0.4))
    s.append(f'<line class="wa" x1="{X0 + 1.5 * CW}" y1="{ya + h + 0.4}" x2="{X0 + 1.5 * CW}" y2="{yl - 0.4}" style="stroke-dasharray:1 0.7"/>')
    s.append(f'<line class="wa" x1="{X0 + 2.5 * CW}" y1="{ya + h + 0.4}" x2="{X0 + 2.5 * CW}" y2="{yl - 0.4}" style="stroke-dasharray:1 0.7"/>')
    # printed row
    pr = [("सा", 0), ("-", 1), ("-", 2)]
    for t, m in pr:
        cx = X0 + m * CW + CW / 2
        if t == "-":
            s.append(W(round(cx - 2.2, 2), yp + 4.6, round(cx + 2.2, 2), yp + 4.6))
        else:
            s.append(DV(round(cx, 2), yp + 7.0, t, 6))
    s.append(DV(round(X0 + 3.5 * CW + 1.4, 2) - 1.0, yp + 7.0, "रे ग", 6))
    s.append(DV(round(X0 + 4.5 * CW, 2), yp + 7.0, "म प ध", 6))
    s.append(DV(round(X0 + 5.5 * CW - 0.3 - 3.5, 2), yp + 7.0, "प", 6))
    s.append(f'<path class="w" d="M{round(X0 + 3.5 * CW - 5.2, 2)},{yp + 8.6} Q{round(X0 + 3.5 * CW - 0.2, 2)},{yp + 10.8} {round(X0 + 3.5 * CW + 4.8, 2)},{yp + 8.6}"/>')
    s.append(f'<path class="w" d="M{round(X0 + 4.5 * CW - 7.0, 2)},{yp + 8.6} Q{round(X0 + 4.5 * CW, 2)},{yp + 10.8} {round(X0 + 4.5 * CW + 7.0, 2)},{yp + 8.6}"/>')
    for m in range(1, 6):
        pass
    # legend
    s.append(f'<rect class="gap" x="2" y="61.2" width="5" height="2.4"/>' + T(8.4, 63.1, "SLOT MADE BY LOWERING, NOT AUTHORED"))
    return "\n".join(s)


def fig_model():
    s = []
    srcs = [(8, "BANDISH JSON"), (19.4, "SWARTAAL XML"), (30.8, "LABEL STUDIO EXPORT")]
    for y, t in srcs:
        s.append(BOX(2, y, 34, 8, t))
        s.append(W(36, y + 4, 40, y + 4))
    s.append(W(40, 12, 40, 34.8)); s.append(DOT(40, 23.4)); s.append(WA(40, 23.4, 43.6, 23.4))
    s.append(BOX(44, 15.4, 24, 16, "NORMALIZE", ["CHECK SWARS", "ALIASES, SHORTHAND", "ONE MODEL"]))
    s.append(WA(68, 23.4, 76.6, 23.4))
    s.append(PANEL(77, 2.5, 102, 38.5, "BANDISHMODEL"))
    xs = [(80.4, 19, "SECTION", ["NAME", "START MATRA"]), (103.6, 17, "LINE", ["MATRAS", "REPEAT FLAGS"]),
          (125.2, 19, "MATRA", ["INDEX", "VOLTA", "REPEAT SIGNS"]), (148.4, 29, "EVENT", ["SWAR, OCTAVE", "KOMAL, TIVRA", "DURATION, LYRIC", "KAN, MEEND, KHATKA"])]
    for x, w, t, ls in xs:
        s.append(BOX(x, 8.4, w, 18, t, ls))
    for a, b in ((99.4, 103.2), (120.6, 124.8), (144.2, 148.0)):
        s.append(WA(a, 17.4, b, 17.4))
    s.append(BOX(80.4, 29.6, 40, 9.6, "METADATA", ["TITLE, RAAG, TAAL, LAYA"]))
    s.append(BOX(125.2, 29.6, 52.2, 9.6, "SPANS", ["MEEND, TIHAI, KHATKA: FROM ID TO ID"]))
    return "\n".join(s)


def build():
    b = []
    b.append(para("1.4.1", "INTRODUCTION.",
        "Input is normalised into one BandishModel, whichever form it arrives in. Lowering then turns the model into a grid the layout can use. "
        "VexFlow draws a half note as one glyph, but Bhatkhande notation writes the time out: a note held three beats becomes a swar and two dashes "
        "(<span class='nowrap'>figure 1.4-1</span>)."))
    b.append(figure(fig_lower(), 65, "BFL-401A", "1.4-1", "Lowering Of Durations Into Slots"))
    b.append(para("1.4.2", "FUNCTIONAL DESCRIPTION.",
        "lowerBandish() resolves the taal, walks every matra and builds ordered slots whose durations sum to exactly one beat. Events with no duration share "
        "the rest of the matra equally. A duration longer than the room left spills into the next matras as carried slots. Taal position, vibhag and "
        "marker come from the taal table (<span class='nowrap'>figure 1.4-2</span>).", style="margin-top:2.2mm"))
    b.append(para("1.4.2.1", "Diagnostics.",
        "A musical problem never stops the render. Each one is returned with a level, a code, a message and a path. An error marks inconsistent input; "
        "a warning marks input that was padded or ignored.", level=3, flush=True, bar=(0.4, 6.8)))
    b.append(figure(fig_model(), 45, "BFL-402A", "1.4-2", "Input Forms And The Bandish Model"))
    rows = [
        ("matra.sequence", "WARN: INDEX NOT THE EXPECTED POSITION"),
        ("matra.underfull", "WARN: SHORT OF 1 BEAT, PADDED"),
        ("duration.overfull", "ERROR: DURATIONS ALREADY FILL THE MATRA"),
        ("carry.overlap", "ERROR: HELD NOTE COVERS THE EVENTS"),
        ("carry.dangling", "WARN: SECTION ENDS WHILE HELD"),
        ("meend.unclosed", "WARN: MEEND NEVER CLOSED"),
        ("tihai.sam", "WARN: LAST NOTE MISSES SAM"),
        ("repeat.offbar", "WARN: SIGN NOT ON A VIBHAG BAR"),
        ("marker.mismatch", "WARN: MARKER DIFFERS FROM THE TAAL"),
        ("matra.overflow", "ERROR: EVENT AFTER MATRA IS FULL"),
        ("rest.blank", "INFO: SILENCE PRINTED AS EMPTY SLOT"),
    ]
    left = table("1.4.3", "1.4-1", ("PERFORMANCE AND DESIGN DATA.", "Diagnostic Codes"), ("Code", "Level and meaning"), rows)
    right = notice("CAUTION", "Bhatkhande has no printed rest sign. A silence is drawn as an empty slot and reported as rest.blank, so a reader cannot tell it from a missing note.") + \
        card("CONVERT AN ANNOTATION", "USER", [
            ("1", "CONVERT - npx tsx"),
            ("", "  cli/ls2bandish.ts out.json"),
            ("", "  \"TITLE\" page1.json page2.json"),
            ("2", "RENDER - npm run render --"),
            ("", "  out.json out/ls --png"),
            ("", "  --no-lyric-curves"),
            ("", "√ compare - render beside scan"),
        ])
    b.append(lower(left, right))
    return page("1.4", "INPUT, NORMALIZATION AND LOWERING", "\n".join(b), "1.4-1")
