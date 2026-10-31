from hb import *


def fig_pipeline():
    s = []
    s.append(PANEL(1.5, 2.5, 46.5, 56.5, "INPUT (ONE PER RUN)"))
    ins = [(9.5, "BANDISH JSON", ["NORMALIZEBANDISH"]), (25.5, "SWARTAAL XML", ["FROMXML"]), (41.5, "LABEL STUDIO EXPORT", ["LABELSTUDIOTOBANDISH"])]
    for y, t, ls in ins:
        s.append(BOX(5.5, y, 36, 12, t, ls))
        s.append(W(41.5, y + 6, 44.4, y + 6))
    s.append(W(44.4, 15.5, 44.4, 47.5))
    s.append(DOT(44.4, 31.5))
    s.append(POLY([(44.4, 31.5), (44.4, 19.5)], "w"))
    s.append(WA(44.4, 19.5, 53.6, 19.5))
    s.append(PANEL(49.5, 2.5, 129, 56.5, "FACTORY.RENDERBANDISH()"))
    top = [
        (53.8, "NORMALIZE", ["JSON, XML, LS", "VALIDATE SWARS", "BANDISH MODEL"]),
        (86.8, "LOWER", ["TAAL POSITIONS", "RATIONAL SLOTS", "HELD NOTES SPILL"]),
        (119.8, "BUILD PAGE", ["ROWS = TAAL CYCLES", "VOICES, MODIFIERS", "SPANNERS"]),
        (152.8, "FORMAT", ["ONE MATRA WIDTH", "COLUMN GRID (X)", "LANES (Y)"]),
    ]
    for x, t, ls in top:
        s.append(BOX(x, 9.5, 24.4, 17, t, ls))
    for x in (78.2, 111.2, 144.2):
        s.append(WA(x, 18, x + 8.4, 18))
    bot = [
        (152.8, "DRAW", ["SVGCONTEXT", "GROUP PER ELEMENT", "SCALE TO 1000 PX"]),
        (119.8, "SVG", ["OUTLINES OR TEXT", "VIEWBOX = PAGE"]),
        (86.8, "LABELS", ["COLLECTLABELS", "BBOX PER GROUP", "19 CLASSES"]),
        (53.8, "YOLO + JSON", ["TOYOLO", "NORMALISED BOXES"]),
    ]
    for x, t, ls in bot:
        s.append(BOX(x, 36, 24.4, 17, t, ls))
    s.append(WA(165, 26.5, 165, 35.6))
    s.append(T(166.2, 31.6, "PAGE"))
    for x in (152.8, 119.8, 86.8):
        s.append(WA(x, 44.5, x - 6.0, 44.5))
    s.append(T(114, 56.6, "RESULT = SVG, WIDTH, HEIGHT, SCALE, LABELS, DIAGNOSTICS", "lbl-s", "middle"))
    return "\n".join(s)


def fig_modules():
    s = []
    data = [("INPUT", 675), ("STAVE", 425), ("ENTRY + BUILD", 323), ("CORE", 304), ("MODIFIERS", 282), ("NOTES", 281),
            ("RENDER", 169), ("MUSIC", 153), ("FORMATTING", 124), ("FONT", 116), ("SPANNERS", 88)]
    x0, k, y0, dy = 29, 0.0955, 6.2, 3.2
    s.append(T(2, 2.2, "SOURCE LINES BY MODULE (SRC/)", "lbl-b"))
    s.append(POLY([(x0, 4.6), (x0, y0 + dy * len(data) - 1.2), (x0 + 600 * k + 2, y0 + dy * len(data) - 1.2)]))
    for i, (n, v) in enumerate(data):
        y = y0 + i * dy
        s.append(T(x0 - 1.6, y + 1.9, n, "lbl-s", "end"))
        s.append(f'<rect class="aud" x="{x0}" y="{y}" width="{round(v * k, 2)}" height="2.5"/>')
        s.append(T(round(x0 + v * k + 1.2, 2), y + 1.9, f"{v}"))
    yb = y0 + dy * len(data) - 1.2
    for t in (0, 200, 400, 600):
        x = x0 + t * k
        s.append(TL(x, yb, x, yb + 1.1))
        s.append(T(round(x, 2), yb + 3.3, t, "lbl-s", "middle"))
    s.append(TL(113.4, -0.6, 113.4, 46.6))
    s.append(T(116, 2.2, "DETAIL A: ENTRY POINTS", "lbl-b"))
    s.append(BOX(117, 8, 24, 8.6, "CLI", ["RENDER.TS"]))
    s.append(BOX(117, 20, 24, 8.6, "NODE", ["FONTKIT FONTS"]))
    s.append(BOX(117, 32, 24, 8.6, "BROWSER", ["ESBUILD BUNDLE"]))
    s.append(W(141, 12.3, 146, 12.3))
    s.append(W(141, 24.3, 146, 24.3))
    s.append(W(141, 36.3, 146, 36.3))
    s.append(W(146, 12.3, 146, 36.3))
    s.append(DOT(146, 24.3))
    s.append(WA(146, 24.3, 150.6, 24.3))
    s.append(BOX(151, 17, 26, 14.6, "FACTORY", ["RENDERBANDISH"]))
    s.append(T(147, 44.3, "ONE FACTORY, THREE HOSTS", "lbl-s", "middle"))
    return "\n".join(s)


def build():
    b = []
    b.append(para("1.1.1", "INTRODUCTION.",
        "Bhatkhande-Flow is a rendering engine for Bhatkhande notation. It reads a bandish as JSON, swartaal XML or a Label Studio export "
        "and draws the printed page as SVG. Every drawn element carries a BhatkhandeSet class name, so one run also yields training labels "
        "(<span class='nowrap'>figure 1.1-1</span>). The pipeline is VexFlow&rsquo;s: measure first, place second, draw through an abstract context."))
    b.append(figure(fig_pipeline(), 63, "BFL-101A", "1.1-1", "Rendering Pipeline Functional Diagram"))
    b.append(para("1.1.2", "FUNCTIONAL DESCRIPTION.",
        "Factory.renderBandish() sets the style and fonts, parses the input, lowers it to rational slots, builds one row per taal cycle "
        "and formats the whole page. Page.draw() then draws the header, the rows and the spanners into an SVGContext, which records a bounding box "
        "for every element group. Source size by module is shown in <span class='nowrap'>figure 1.1-2</span>.", style="margin-top:2.2mm"))
    b.append(para("1.1.2.1", "One Page, One Width.",
        "Every row is measured first. The page then takes one matra width: the widest packed matra, or 1.25 times the swar size if larger, "
        "plus 7 px of padding each side. A page wider than 1000 px is scaled down as a whole. Rows never wrap.", level=3, flush=True, bar=(0.4, 6.8)))
    b.append(figure(fig_modules(), 45, "BFL-102A", "1.1-2", "Source Modules And Entry Points"))
    rows = [
        ("Source files (TypeScript)", "53 FILES, 2,940 LINES"),
        ("Test suite", "18 TESTS, ALL PASS"),
        ("Taal definitions", "11"),
        ("Label classes", "19"),
        ("Example bandish", "7 JSON, 7 LABEL STUDIO"),
        ("Page width limit", "1000 PX, THEN SCALED"),
        ("Swar / lyric font size", "24 / 21 PX"),
        ("Output per render", "SVG, LABELS, YOLO (+ PNG)"),
    ]
    left = table("1.1.3", "1.1-1", ("PERFORMANCE AND DESIGN DATA.", "Engine Data"), ("Parameter", "Value"), rows)
    right = notice("CAUTION", "Run <i>npm install</i> on the machine that runs the code. A node_modules folder built on Linux carries the "
                   "wrong esbuild binary,.") + \
        card("RENDER A BANDISH", "USER", [
            ("1", "SHELL - cd bhatkhande-flow"),
            ("2", "SHELL - npm install"),
            ("3", "SHELL - npm test"),
            ("", "√ tests - 18 pass"),
            ("4", "SHELL - npm run render --"),
            ("", "  examples/bhimpalasi-geet.json"),
            ("", "  out --png"),
            ("", "√ out - svg, labels, yolo, png"),
        ])
    b.append(lower(left, right))
    return page("1.1", "BHATKHANDE-FLOW RENDERING ENGINE", "\n".join(b), "1.1-1")
