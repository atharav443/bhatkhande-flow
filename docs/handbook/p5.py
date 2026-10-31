from hb import *

XL, W_, G_ = 30.0, 8.2, 2.4


def colx(c):
    return XL + c * W_ + (c // 4) * G_


def fig_grid():
    s = []
    rows = [(12.0, "ROW 1", "FULL CYCLE: COLUMNS 0 TO 15", range(16)),
            (28.0, "ROW 2", "PICKUP: COLUMNS 14, 15", (14, 15)),
            (44.0, "ROW 3", "LAST ROW: COLUMNS 0 TO 5", range(6))]
    h = 10.0
    for y, t, d, cols in rows:
        s.append(T(2, y + 4.2, t, "lbl")); s.append(T(2, y + 7.0, d.split(":")[0], "lbl-s"))
        for c in range(16):
            x = round(colx(c) + 0.5, 2)
            if c in cols:
                pos = c + 1
                s.append(f'<rect class="box" x="{x}" y="{y}" width="{W_ - 1}" height="{h}"/>')
                s.append(T(round(x + (W_ - 1) / 2, 2), y + h / 2 + 0.8, str(pos), "lbl", "middle"))
            else:
                s.append(f'<rect class="gap" x="{x}" y="{y}" width="{W_ - 1}" height="{h}" style="stroke-width:0.25"/>')
    # bars as the engine draws them
    def bar(c, y, cls="w"):
        bx = round(colx(c) - G_ / 2, 2)
        return f'<line class="{cls}" x1="{bx}" y1="{y - 1.6}" x2="{bx}" y2="{y + h + 1.6}"/>'
    endx = round(colx(15) + W_ + G_ / 2, 2)
    for c in (4, 8, 12):
        s.append(bar(c, 12.0))
    s.append(f'<line class="o" x1="{endx}" y1="10.4" x2="{endx}" y2="23.6"/>')
    s.append(f'<line class="o" x1="{endx}" y1="26.4" x2="{endx}" y2="39.6"/>')
    s.append(bar(4, 44.0))
    # column numbers under the grid
    for c in range(16):
        s.append(T(round(colx(c) + W_ / 2, 2), 58.2, str(c), "lbl-s", "middle"))
    s.append(T(2, 58.2, "COLUMN", "lbl-s"))
    # W dimension above col 9, G leader above the gap before col 4
    xl, xr = colx(9), colx(9) + W_
    s.append(TL(xl, 7.4, xl, 10.6)); s.append(TL(xr, 7.4, xr, 10.6))
    mid = round((xl + xr) / 2, 2)
    s.append(f'<line class="dim" x1="{xl}" y1="8.6" x2="{round(mid - 0.5, 2)}" y2="8.6"/>')
    s.append(f'<line class="dim" x1="{xr}" y1="8.6" x2="{round(mid + 0.5, 2)}" y2="8.6"/>')
    s.append(T(mid, 6.4, "W", "lbl", "middle"))
    s.append(T(round(xr + 2.2, 2), 6.6, "= MATRA WIDTH, ONE VALUE FOR THE PAGE"))
    gx = round(colx(4) - G_ / 2, 2)
    s.append(T(gx, 4.0, "G = VIBHAG GAP", "lbl-s", "middle"))
    s.append(LD(gx, 5.0, gx, 11.6))
    # no end bar callout
    ex = round(colx(5) + W_, 2)
    s.append(T(ex + 0.4, 62.6, "NO END BAR: THE ROW STOPS MID-CYCLE", "lbl-s", "start"))
    s.append(LD(ex, 61.2, ex, 55.2) if False else LD(ex, 59.6 + 0.2, ex, 55.0))
    return "\n".join(s)


def seg(a, b, y, txt):
    m = (a + b) / 2
    hw = round(0.55 * len(txt) + 0.9, 2)
    return (f'<line class="dim" x1="{a}" y1="{y}" x2="{round(m - hw, 2)}" y2="{y}"/><line class="dim" x1="{b}" y1="{y}" x2="{round(m + hw, 2)}" y2="{y}"/>'
            + T(round(m, 2), y + 0.8, txt, "lbl-s", "middle"))


def fig_lanes():
    s = []
    s.append(T(2, 2.4, "LANES OF ONE ROW, TOP TO BOTTOM", "lbl-b"))
    lanes = [
        ("VOLTA", 3.2, "gap", "22 PX, IF A MATRA HAS AN ENDING"),
        ("MEEND", 3.2, "gap", "12 PX, IF A MEEND TOUCHES THE ROW"),
        ("TIHAI", 3.2, "gap", "20 PX, IF A TIHAI TOUCHES THE ROW"),
        ("KAN", 3.2, "gap", "AS TALL AS THE TALLEST KAN GROUP"),
        ("SWAR", 4.6, "box", "FONT 24 PX"),
        ("CURVE", 2.4, "gap", "UNDER GROUPED SWARS"),
        ("LYRIC", 4.6, "box", "FONT 21 PX; 16 PX BELOW THE SWAR LINE"),
        ("CURVE", 2.4, "gap", "UNDER GROUPED SYLLABLES"),
        ("MARKER", 3.6, "box", "FONT 21 PX; 6 PX BELOW THE LYRICS"),
    ]
    y = 5.4
    for n, hh, cls, d in lanes:
        s.append(T(22.4, round(y + hh / 2 + 0.8, 2), n, "lbl-s", "end"))
        s.append(f'<rect class="{cls}" x="24" y="{round(y, 2)}" width="22" height="{hh}"/>')
        s.append(T(48.4, round(y + hh / 2 + 0.8, 2), d))
        y += hh + 0.5
    s.append(f'<rect class="gap" x="2" y="{round(y + 1.4, 2)}" width="5" height="2.2"/>')
    s.append(T(8.4, round(y + 3.2, 2), "LANE EXISTS ONLY WHEN THE ROW NEEDS IT"))
    s.append(TL(109.4, -0.6, 109.4, 44.6))
    s.append(T(112, 2.4, "DETAIL A: MATRA COLUMN", "lbl-b"))
    s.append(f'<rect class="panel" x="118" y="8" width="52" height="16"/>')
    s.append(DV(144, 20.4, "रे ग", 8))
    for x in (118, 136, 152, 170):
        s.append(TL(x, 25, x, 31.4))
    s.append(seg(118, 136, 30.4, "PAD 7"))
    s.append(seg(136, 152, 30.4, "CLUSTER"))
    s.append(seg(152, 170, 30.4, "PAD 7"))
    s.append(T(144, 36.4, "W = WIDEST CLUSTER ON THE PAGE + 2 PAD", "lbl-s", "middle"))
    s.append(T(144, 39.4, "EVENTS IN A CLUSTER ARE 1 PX APART", "lbl-s", "middle"))
    s.append(T(112, 43.0, "NOT TO SCALE", "lbl-s"))
    return "\n".join(s)


def build():
    b = []
    b.append(para("1.5.1", "INTRODUCTION.",
        "The page is laid out as a grid. Every row is measured first, then one matra width is chosen for the whole page, so a given cycle position sits in the same "
        "column in every row (<span class='nowrap'>figure 1.5-1</span>). A pickup row occupies the columns of its own cycle positions and so ends up right-aligned."))
    b.append(figure(fig_grid(), 66, "BFL-501A", "1.5-1", "Page Column Grid, Three Kinds Of Row"))
    b.append(para("1.5.2", "FUNCTIONAL DESCRIPTION.",
        "TaalStave.preFormat() builds the contexts of a row and reports its widest packed matra. Page.format() fixes the matra width, assigns x from the "
        "ColumnGrid, reserves meend and tihai lanes on the rows they touch, then stacks the lanes of each row top to bottom "
        "(<span class='nowrap'>figure 1.5-2</span>).", style="margin-top:2.2mm"))
    b.append(para("1.5.2.1", "Column Position.",
        "x(col) = left + col &times; W + bars &times; G, where bars counts the vibhag bars crossed. A bar stands before a column only when that column starts a vibhag and is not the first in its row.",
        level=3, flush=True, bar=(0.4, 6.8)))
    b.append(figure(fig_lanes(), 45, "BFL-502A", "1.5-2", "Row Lanes And Matra Column"))
    rows = [
        ("spacing.matraPad", "7 PX"),
        ("spacing.clusterGap", "1 PX"),
        ("spacing.vibhagGap", "16 PX"),
        ("spacing.swarToLyric", "16 PX"),
        ("spacing.lyricToMarker", "6 PX"),
        ("spacing.rowGap", "30 PX"),
        ("spacing.margin", "44 PX"),
        ("spacing.maxWidth", "1000 PX"),
        ("spacing.sectionGap", "14 PX"),
        ("fontSize.swar / lyric", "24 / 21 PX"),
        ("fontSize.kanScale", "0.6 OF SWAR"),
    ]
    left = table("1.5.3", "1.5-1", ("PERFORMANCE AND DESIGN DATA.", "Default Layout Parameters"), ("Style key", "Default"), rows)
    right = notice("NOTE", "Rows never wrap. A page wider than maxWidth is scaled down as a whole (scale = maxWidth / width), so the bars still line up.") + \
        card("TUNE THE LOOK", "DEVELOPER", [
            ("1", "FACTORY - pass options.style"),
            ("2", "spacing.vibhagGap - bar room"),
            ("3", "spacing.maxWidth - page scale"),
            ("4", "fontSize.swar - swar size"),
            ("5", "script - devanagari | latin"),
            ("6", "textMode - path | text"),
            ("", "√ render - bars still align"),
        ])
    b.append(lower(left, right))
    return page("1.5", "PAGE LAYOUT: COLUMN GRID AND LANES", "\n".join(b), "1.5-1")
