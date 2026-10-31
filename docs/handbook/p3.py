from hb import *

# one illustrative Teentaal row: (swar events, lyric events, extras)
X0, W_, G_ = 38.0, 7.6, 2.8
SWAR_Y, LYR_Y, MARK_Y, KAN_Y = 22.0, 31.8, 40.6, 12.0
# matra -> (swars, lyrics); a swar is (text, flags) with flags in {k,t,u,d,p}  (k komal, t tivra, u taar dot, d mandra dot, p khatka)
ROW = [
    ([("सा", "")], ["का"]),
    ([("रे", ""), ("ग", "k")], ["सु", "न"]),
    ([("म", "t")], ["रे"]),
    ([("-", "")], ["ऽ"]),
    ([("प", "kan")], ["धी"]),
    ([("ध", "d")], ["र"]),
    ([("नी", "")], ["ना"]),
    ([("सा", "u")], ["ऽ"]),
    ([("प", "p")], ["सु"]),
    ([("म", ""), ("ग", "")], ["न", "म"]),
    ([("रे", "")], ["जा"]),
    ([("सा", "")], ["ऽ"]),
    ([("-", "")], ["ऽ"]),
    ([("ध", ""), ("प", "")], ["का", "र"]),
    ([("म", "")], ["ना"]),
    ([("ग", "")], ["ऽ"]),
]
MARK = {0: "×", 4: "२", 8: "०", 12: "३"}


def colx(c):
    return X0 + c * W_ + (c // 4) * G_


def fig_row():
    s = []
    # lane names
    for y, t in ((KAN_Y - 0.2, "KAN LINE"), (SWAR_Y, "SWAR LINE"), (LYR_Y, "LYRIC LINE"), (MARK_Y, "MARKER LINE")):
        s.append(T(33.2, y, t, "lbl-s", "end"))
    # bars: none at the start (ghost), before cols 4, 8, 12, heavy end bar
    s.append(f'<line class="hid" x1="{X0 - 0.4}" y1="14.5" x2="{X0 - 0.4}" y2="36"/>')
    for c in (4, 8, 12):
        bx = colx(c) - G_ / 2
        s.append(f'<line class="w" x1="{bx}" y1="14.5" x2="{bx}" y2="36"/>')
    endx = colx(15) + W_ + G_ / 2
    s.append(f'<line class="o" x1="{endx}" y1="14.5" x2="{endx}" y2="36"/>')
    for c, (sw, ly) in enumerate(ROW):
        cx = colx(c) + W_ / 2
        n = len(sw)
        pitch = 3.5
        xs = [round(cx + (i - (n - 1) / 2) * pitch, 2) for i in range(n)]
        for (t, fl), x in zip(sw, xs):
            if t == "-":
                s.append(f'<line class="w" x1="{round(x - 1.3, 2)}" y1="{SWAR_Y - 2.0}" x2="{round(x + 1.3, 2)}" y2="{SWAR_Y - 2.0}" style="stroke-width:0.45"/>')
                continue
            tx = f"({t})" if fl == "p" else t
            s.append(DV(x, SWAR_Y, tx, 5.2))
            if fl == "k":
                s.append(f'<line class="w" x1="{x - 1.2}" y1="{SWAR_Y + 1.8}" x2="{x + 1.2}" y2="{SWAR_Y + 1.8}"/>')
            if fl == "t":
                s.append(f'<line class="w" x1="{x}" y1="{SWAR_Y - 8.6}" x2="{x}" y2="{SWAR_Y - 6.4}"/>')
            if fl == "u":
                s.append(DOT(x, SWAR_Y - 8.0, 0.55))
            if fl == "d":
                s.append(DOT(x, SWAR_Y + 2.2, 0.55))
            if fl == "kan":
                s.append(DV(round(x - 1.0, 2), KAN_Y, "म", 3.0))
        if n >= 2:
            x0, x1 = xs[0] - 1.4, xs[-1] + 1.4
            s.append(f'<path class="w" d="M{x0},{SWAR_Y + 3.0} Q{(x0 + x1) / 2},{SWAR_Y + 5.2} {x1},{SWAR_Y + 3.0}"/>')
        ln = len(ly)
        lxs = [round(cx + (i - (ln - 1) / 2) * 3.5, 2) for i in range(ln)]
        for t, x in zip(ly, lxs):
            s.append(DV(x, LYR_Y, t, 4.3))
        if ln >= 2:
            x0, x1 = lxs[0] - 1.4, lxs[-1] + 1.4
            s.append(f'<path class="w" d="M{x0},{LYR_Y + 2.6} Q{(x0 + x1) / 2},{LYR_Y + 4.6} {x1},{LYR_Y + 2.6}"/>')
    for c, t in MARK.items():
        s.append(DV(colx(c) + 0.2, MARK_Y, t, 4.2, "start"))
    # callouts above
    s.append(T(37.4, 5.0, "NO OPENING BAR"))
    s.append(LD(38.0, 6.0, 37.7, 14.0))
    bx = colx(4) - G_ / 2
    s.append(T(bx, 5.0, "VIBHAG BAR", "lbl-s", "middle"))
    s.append(LD(bx, 6.0, bx, 14.0))
    s.append(T(endx, 5.0, "LINE END BAR", "lbl-s", "middle"))
    s.append(LD(endx, 6.0, endx, 14.0))
    hx = colx(12) + W_ / 2
    s.append(T(hx, 9.8, "HELD SWAR: DASH", "lbl-s", "middle"))
    s.append(LD(hx, 10.8, hx, 18.0))
    # callouts below
    mx = colx(4)
    s.append(T(mx, 46.4, "MARKER UNDER FIRST MATRA OF VIBHAG", "lbl-s", "middle"))
    s.append(LD(mx + 1.0, 44.2, mx + 1.0, 42.0))
    ax = colx(12) + W_ / 2 + 1.4
    s.append(T(131.0, 46.4, "PROLONGED SYLLABLE: AVAGRAHA", "lbl-s", "start"))
    s.append(LD(ax + 1.2, 44.4, ax + 1.2, 33.6))
    # equal-width dimension at column 5
    xl, xr = colx(9), colx(9) + W_
    s.append(TL(xl, 36.6, xl, 49.6))
    s.append(TL(xr, 36.6, xr, 49.6))
    s.append(f'<line class="dim" x1="{xl}" y1="48.6" x2="{round((xl + xr) / 2 - 0.4, 2)}" y2="48.6"/>')
    s.append(f'<line class="dim" x1="{xr}" y1="48.6" x2="{round((xl + xr) / 2 + 0.4, 2)}" y2="48.6"/>')
    s.append(T(round((xl + xr) / 2, 2), 53.6, "W", "lbl", "middle"))
    s.append(T(round(xr + 2.0, 2), 53.6, "= SAME FOR EVERY MATRA", "lbl-s"))
    # whole-cycle dimension
    yd = 59.4
    s.append(TL(X0, 52.4, X0, yd + 1.2))
    s.append(TL(endx, 43.0, endx, yd + 1.2))
    mid = (X0 + endx) / 2
    s.append(f'<line class="dim" x1="{X0}" y1="{yd}" x2="{round(mid - 23, 2)}" y2="{yd}"/>')
    s.append(f'<line class="dim" x1="{round(endx, 2)}" y1="{yd}" x2="{round(mid + 23, 2)}" y2="{yd}"/>')
    s.append(T(round(mid, 2), yd + 0.8, "ONE TAAL CYCLE: 16 MATRAS (4+4+4+4)", "lbl", "middle"))
    return "\n".join(s)


def fig_marks():
    s = [T(2, 2.4, "SWAR MARKS AS PRINTED", "lbl-b")]
    cw = 180 / 7
    cells = [
        ("TIVRA", "STROKE ABOVE MA"), ("KOMAL", "BAR UNDER RE GA DHA NI"), ("TAAR", "DOT ABOVE"),
        ("MANDRA", "DOT BELOW"), ("KAN", "SMALL SWAR ABOVE"), ("KHATKA", "( ) AROUND, NOT MURKI"), ("HELD", "DASH, THEN AVAGRAHA"),
    ]
    base = 25.0
    for i, (t, d) in enumerate(cells):
        cx = round(cw * i + cw / 2, 2)
        if i:
            s.append(TL(round(cw * i, 2), 5.5, round(cw * i, 2), 40.5))
        if i == 0:
            s.append(DV(cx, base, "म", 9)); s.append(W(cx, base - 14.4, cx, base - 10.6))
        elif i == 1:
            s.append(DV(cx, base, "ग", 9)); s.append(W(cx - 2.2, base + 3.2, cx + 2.2, base + 3.2))
        elif i == 2:
            s.append(DV(cx, base, "सा", 9)); s.append(DOT(cx, base - 12.6, 0.75))
        elif i == 3:
            s.append(DV(cx, base, "ध", 9)); s.append(DOT(cx, base + 3.8, 0.75))
        elif i == 4:
            s.append(DV(cx, base, "ग", 9)); s.append(DV(round(cx - 1.8, 2), base - 11.6, "म", 4.6))
        elif i == 5:
            s.append(DV(cx, base, "(प)", 9))
        else:
            s.append(W(cx - 3.0, base - 3.4, cx + 3.0, base - 3.4)); s.append(DV(cx, base + 7.2, "ऽ", 7))
            s.append(T(cx + 4.4, base - 2.7, "SWAR")); s.append(T(cx + 4.4, base + 7.0, "LYRIC"))
        s.append(T(cx, 36.0, t, "lbl", "middle"))
        s.append(T(cx, 39.0, d, "lbl-s", "middle"))
    return "\n".join(s)


def build():
    b = []
    b.append(para("1.3.1", "INTRODUCTION.",
        "A printed Bhatkhande page is a table. One row is one taal cycle, every matra column has the same width, and the vibhag bars line up from row to row "
        "(<span class='nowrap'>figure 1.3-1</span>). The conventions were checked on the scanned books, not taken from memory, and the main ones are pinned by tests."))
    b.append(figure(fig_row(), 65, "BFL-301A", "1.3-1", "Printed Row Of Teentaal, Lane By Lane"))
    b.append(para("1.3.2", "FUNCTIONAL DESCRIPTION.",
        "Lines run top to bottom: kan, swar, lyric, then the taal marker under the first matra of each vibhag. A held swar is a dash in the swar line and an "
        "avagraha in the lyric line. Swars that share one matra are written close together with a curve under them. "
        "The marks are shown in <span class='nowrap'>figure 1.3-2</span>.", style="margin-top:2.2mm"))
    b.append(para("1.3.2.1", "Pickup Rows.",
        "A row that starts mid-cycle sits at its cycle position, so it is right-aligned and closed by a bar. The last row may stop short and is left as it is.",
        level=3, flush=True, bar=(0.4, 6.8)))
    b.append(figure(fig_marks(), 45, "BFL-302A", "1.3-2", "Swar Marks"))
    rows = [
        ("B1  Row", "ONE TAAL CYCLE"),
        ("B2  Line order", "KAN, SWAR, LYRIC, MARKERS"),
        ("B3  Bars", "BETWEEN VIBHAGS AND AT ROW END"),
        ("B4  Held swar", "DASH; AVAGRAHA IN LYRIC"),
        ("B5  Grouped swars", "CURVE UNDER SWAR AND LYRIC"),
        ("B6  Matra column", "SAME WIDTH ON THE PAGE"),
        ("B7  Pickup", "AT CYCLE POSITION, RIGHT-ALIGNED"),
        ("B8  Last row", "MAY STOP MID-CYCLE"),
        ("B9  Marks", "KOMAL UNDER; TIVRA, TAAR OVER"),
        ("B10 Kan", "SMALL SWAR ABOVE, LEFT EDGE"),
        ("B11 Khatka", "SWAR IN PARENTHESES"),
    ]
    left = table("1.3.3", "1.3-1", ("PERFORMANCE AND DESIGN DATA.", "Printed Conventions Verified On The Scans"), ("Convention", "Printed rule"), rows)
    right = notice("NOTE", "A swar in parentheses is a khatka, not a murki. The engine draws two khatka brackets around the swar (B11).") + \
        card("AUTHOR A ROW", "USER", [
            ("1", "TAAL - set metadata.taal.name"),
            ("2", "MATRA - one object per matra"),
            ("3", "EVENTS - swars in order"),
            ("4", "HELD - use \"-\" for a held swar"),
            ("5", "LYRIC - one syllable per swar"),
            ("", "√ MARKERS - derived from taal"),
        ])
    b.append(lower(left, right))
    return page("1.3", "NOTATION CONVENTIONS", "\n".join(b), "1.3-1")
