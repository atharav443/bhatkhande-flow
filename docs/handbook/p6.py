from hb import *

XL, W_, G_ = 16.0, 8.8, 2.6


def colx(c):
    return XL + c * W_ + (c // 4) * G_


def fig_volta():
    s = []
    r1 = ["सा", "रे", "ग", "म", "प", "ध", "नी", "सां", "नी", "ध", "प", "म", "ग", "रे", "सा", "-"]
    r2 = {12: "ग", 13: "म", 14: "प", 15: "सां"}
    y1, y2 = 22.0, 49.0
    marks = {0: "×", 4: "२", 8: "०", 12: "३"}

    def swar(c, t, y):
        cx = round(colx(c) + W_ / 2, 2)
        if t == "-":
            return W(round(cx - 1.5, 2), y - 2.0, round(cx + 1.5, 2), y - 2.0)
        return DV(cx, y, t, 5.4)
    for c, t in enumerate(r1):
        s.append(swar(c, t, y1))
    for c, t in r2.items():
        s.append(swar(c, t, y2))
    for c, t in marks.items():
        s.append(DV(round(colx(c) + 0.6, 2), 31.0, t, 3.6, "start"))
    s.append(DV(round(colx(12) + 0.6, 2), 58.0, "३", 3.6, "start"))
    # bars row 1 (+ repeat signs)
    for c in (4, 8, 12):
        bx = round(colx(c) - G_ / 2, 2)
        s.append(f'<line class="w" x1="{bx}" y1="15.4" x2="{bx}" y2="26"/>')
    endx = round(colx(15) + W_ + G_ / 2 + 0.6, 2)
    # repeat begin at the row start
    bx0 = round(XL - 3.2, 2)
    s.append(f'<line class="o" x1="{bx0}" y1="15.4" x2="{bx0}" y2="26"/><line class="w" x1="{round(bx0 + 1.2, 2)}" y1="15.4" x2="{round(bx0 + 1.2, 2)}" y2="26"/>')
    s.append(DOT(round(bx0 + 2.5, 2), 19.6, 0.5)); s.append(DOT(round(bx0 + 2.5, 2), 22.0, 0.5))
    # repeat end after the first ending
    s.append(DOT(round(endx - 3.0, 2), 19.6, 0.5)); s.append(DOT(round(endx - 3.0, 2), 22.0, 0.5))
    s.append(f'<line class="w" x1="{round(endx - 1.4, 2)}" y1="15.4" x2="{round(endx - 1.4, 2)}" y2="26"/><line class="o" x1="{endx}" y1="15.4" x2="{endx}" y2="26"/>')
    # row 2 closing bar and left bar for ending 2
    bx2 = round(colx(12) - G_ / 2, 2)
    s.append(f'<line class="w" x1="{bx2}" y1="42.4" x2="{bx2}" y2="53"/>')
    s.append(f'<line class="w" x1="{endx}" y1="42.4" x2="{endx}" y2="53"/>')
    # brackets
    xa, xb = round(colx(12) - G_ / 2 + 1, 2), round(colx(15) + W_ + G_ / 2 - 1, 2)
    s.append(POLY([(xa, 14.4), (xa, 10.8), (xb, 10.8), (xb, 14.4)]))
    s.append(DV(round(xa + 1.4, 2), 15.4, "1.", 3.2, "start") if False else T(round(xa + 1.4, 2), 13.8, "1.", "lbl-s"))
    s.append(POLY([(xa, 41.4), (xa, 37.8), (xb, 37.8)]))
    s.append(T(round(xa + 1.4, 2), 40.8, "2.", "lbl-s"))
    # callouts
    xm = round((xa + xb) / 2, 2)
    s.append(T(xm, 6.0, "FIRST ENDING: CLOSED (BEGIN_END)", "lbl-s", "middle"))
    s.append(LD(xm, 6.9, xm, 10.2))
    s.append(T(bx0 - 0.4, 6.0, "REPEAT BEGIN", "lbl-s", "start"))
    s.append(LD(round(bx0 + 3.0, 2), 6.9, round(bx0 + 1.6, 2), 15.0))
    s.append(T(endx + 0.2, 31.8, "REPEAT END", "lbl-s", "end") if False else "")
    s.append(T(178.6, 18.6, "REPEAT", "lbl-s", "end")); s.append(T(178.6, 21.2, "END", "lbl-s", "end"))
    s.append(LD(round(endx + 6.0, 2) if False else 170.4, 18.2, round(endx + 0.8, 2), 19.4))
    s.append(T(xm, 35.0, "SECOND ENDING: OPEN (BEGIN)", "lbl-s", "middle"))
    s.append(LD(xm, 36.0, xm, 37.3))
    # rewind marker: dashed connector between the two row starts
    cx = round(colx(12) - G_ / 2, 2)
    s.append(f'<line class="ev" x1="{cx}" y1="27" x2="{cx}" y2="41"/>')
    s.append(T(round(cx - 1.6, 2), 33.6, "SAME POSITION 13", "lbl-s", "end"))
    s.append(T(16, 47.0, "WHEN THE ENDING LABEL CHANGES FROM 1. TO 2.,", "lbl-s"))
    s.append(T(16, 49.8, "THE CYCLE POSITION REWINDS TO WHERE THE", "lbl-s"))
    s.append(T(16, 52.6, "FIRST ENDING BEGAN. ENDING 2 SITS UNDER", "lbl-s"))
    s.append(T(16, 55.4, "ENDING 1, IN THE SAME COLUMNS.", "lbl-s"))
    return "\n".join(s)


def fig_tihai():
    s = [T(2, 2.4, "TIHAI: PHRASE REPEATED THREE TIMES", "lbl-b")]
    x = 4.0
    y = 16.0
    n_start = None
    last_x = 0
    for r in range(3):
        for k in range(3):
            s.append(f'<rect class="vid" x="{x}" y="{y}" width="7.4" height="3.2"/>')
            last_x = x
            x += 8.0
        if r < 2:
            s.append(f'<rect class="gap" x="{x}" y="{y}" width="3.4" height="3.2"/>')
            x += 4.0
    xe = x - 0.6
    s.append(POLY([(4, 14.4), (4, 11.0), (round(xe, 2), 11.0), (round(xe, 2), 14.4)]))
    s.append(T(round((4 + xe) / 2, 2), 9.6, "TIHAI BRACKET", "lbl-s", "middle"))
    s.append(f'<path class="dot" d="M{last_x + 2.8},{y + 4.6} L{last_x + 4.6},{y + 4.6} L{last_x + 3.7},{y + 6.0} Z"/>')
    s.append(T(round(last_x + 3.7, 2), y + 9.4, "SAM", "lbl-s", "middle"))
    s.append(T(round(last_x - 4, 2), y + 12.6, "LAST NOTE LANDS HERE", "lbl-s", "middle"))
    s.append(f'<rect class="vid" x="2" y="38.6" width="5" height="2.4"/>' + T(8.2, 40.4, "PHRASE NOTE"))
    s.append(f'<rect class="gap" x="40" y="38.6" width="5" height="2.4"/>' + T(46.2, 40.4, "GAP (REST OR HOLD)"))
    s.append(TL(92.4, -0.6, 92.4, 44.6))
    s.append(T(95, 2.4, "DETAIL A: MEEND ACROSS A ROW BREAK", "lbl-b"))
    s.append(f'<rect class="box" x="100" y="14" width="76" height="8"/><rect class="box" x="100" y="31" width="76" height="8"/>')
    s.append(T(98.4, 19.4, "ROW 1", "lbl-s", "end")); s.append(T(98.4, 36.4, "ROW 2", "lbl-s", "end"))
    s.append(f'<path class="w" d="M142,14 Q159,6 176,14"/>')
    s.append(f'<path class="w" d="M100,31 Q116,23.6 132,31"/>')
    s.append(DOT(142, 18.0, 0.7)); s.append(DOT(132, 35.0, 0.7))
    s.append(T(142, 23.8, "MEEND START", "lbl-s", "middle")) if False else s.append(T(133.5, 8.2, "START", "lbl-s", "middle"))
    s.append(LD(135.0, 8.8, 141.4, 13.0))
    s.append(T(135.0, 29.6, "END", "lbl-s", "start"))
    s.append(T(138, 41.0, "EACH PIECE IS OPEN AT THE ROW EDGE", "lbl-s", "middle"))
    return "\n".join(s)


def build():
    b = []
    b.append(para("1.6.1", "INTRODUCTION.",
        "Spanners join several notes and are drawn after the notes, from their final positions. Volta brackets, repeat signs, tihai brackets and meends follow "
        "VexFlow&rsquo;s Volta, Barline, Tuplet and Curve, and a spanner that crosses a row break is drawn as one piece per row (<span class='nowrap'>figure 1.6-1</span>)."))
    b.append(figure(fig_volta(), 63, "BFL-601A", "1.6-1", "Alternate Endings And Repeat Signs"))
    b.append(para("1.6.2", "FUNCTIONAL DESCRIPTION.",
        "A volta label on a matra gives its row a bracket lane. Consecutive matras with one label share a bracket, typed BEGIN, MID, END or BEGIN_END as in VexFlow. "
        "Every ending but the last is closed. A tihai item expands in place into ordinary matras and its bracket runs from the first to the last note "
        "(<span class='nowrap'>figure 1.6-2</span>).", style="margin-top:2.2mm"))
    b.append(para("1.6.2.1", "Tihai Check.",
        "A tihai is a phrase repeated N times with an optional gap. Its last note must land on sam, or on the matra the author names. Otherwise lowering reports tihai.sam.",
        level=3, flush=True, bar=(0.4, 6.8)))
    b.append(figure(fig_tihai(), 45, "BFL-602A", "1.6-2", "Tihai Bracket And Partial Meend"))
    rows = [
        ("grouping_curve", "UNDER SWAR OR LYRIC CLUSTER"),
        ("meend", "ARC, MEEND LANE (12 PX)"),
        ("tihai_bracket", "TIHAI LANE (20 PX)"),
        ("volta_bracket", "VOLTA LANE (22 PX)"),
        ("repeat_bar", "VIBHAG BAR OR ROW EDGE"),
        ("vibhag_line", "BETWEEN VIBHAGS"),
        ("line_end_bar", "END OF A FULL CYCLE"),
        ("khatka_bracket", "BESIDE THE SWAR"),
        ("taal_marker", "MARKER LINE, UNDER A VIBHAG START"),
        ("kan_swar", "KAN LANE, ABOVE ITS SWAR"),
        ("octave_dot", "ABOVE (TAAR) OR BELOW (MANDRA)"),
        ("section_heading", "CENTRED ABOVE ITS ROWS"),
    ]
    left = table("1.6.3", "1.6-1", ("PERFORMANCE AND DESIGN DATA.", "Element Classes And Where They Sit"), ("Class", "Where it is drawn"), rows)
    right = notice("NOTE", "A repeat sign sits only on a vibhag bar or at a row edge. Anywhere else it is ignored and repeat.offbar is reported.") + \
        card("WRITE A SECOND ENDING", "USER", [
            ("1", "LINE - repeatStart: true"),
            ("2", "MATRAS - volta: 1 on ending 1"),
            ("3", "LAST - repeatAfter: true"),
            ("4", "MATRAS - volta: 2 on ending 2"),
            ("", "√ render - 2. sits under 1."),
        ])
    b.append(lower(left, right))
    return page("1.6", "SPANNERS, ENDINGS AND REPEATS", "\n".join(b), "1.6-1")
