#!/usr/bin/env python3
"""Shared furniture for the Bhatkhande-Flow handbook (NASA Apollo-style, built on the nasa-handbook skill).

The CSS, shared SVG defs and fit-check script are taken verbatim from the skill's template (_template.html);
only the body-face fallback (Gelasio, a Georgia-metric face) is added so the page fits the same on any machine.
"""
import re
from html import escape
from pathlib import Path

HERE = Path(__file__).resolve().parent
TPL = (HERE / "_template.html").read_text()

CSS = re.search(r"<style>(.*?)</style>", TPL, re.S).group(1)
CSS = '  @font-face { font-family: "Gelasio"; src: url("fonts/gelasio-latin-400-normal.woff"); font-weight: 400; }\n' \
      '  @font-face { font-family: "Gelasio"; src: url("fonts/gelasio-latin-700-normal.woff"); font-weight: 700; }\n' + CSS
CSS = CSS.replace('"Iowan Old Style", "Iowan", Georgia, serif', '"Iowan Old Style", "Iowan", "Gelasio", Georgia, serif')
CSS += """
  /* handbook additions */
  .para.tight p { margin-bottom: 0.4mm; }
  @font-face { font-family: "Tiro Devanagari Hindi"; src: url("fonts/tiro-devanagari-hindi-devanagari-400-normal.woff"); }
  svg text.dv { font-family: "Tiro Devanagari Hindi", serif; letter-spacing: 0; }
  td.c, th.c { text-align: center; }
  table.wide td { white-space: nowrap; }
  .card li.cont { color: inherit; }
"""
DEFS = re.search(r'(<svg width="0" height="0".*?</svg>)', TPL, re.S).group(1)
SCRIPT = re.search(r"(<script>.*?</script>)", TPL, re.S).group(1)

DOC = "BF2A-03-BLOCK I-(1)"
TITLE = "BHATKHANDE-FLOW OPERATIONS HANDBOOK"
BASIC = "29 October 2026"
CHANGE = "30 October 2026"
TAB = "BFL"
SUBSYSTEM = "BHATKHANDE-FLOW NOTATION RENDERING ENGINE"


def esc(s):
    return escape(str(s), quote=False)


# ---------------------------------------------------------------- svg helpers
def T(x, y, s, c="lbl-s", a=None, extra=""):
    anchor = f' text-anchor="{a}"' if a else ""
    return f'<text class="{c}" x="{x}" y="{y}"{anchor}{extra}>{esc(s)}</text>'


def DV(x, y, s, size=5.4, a="middle"):
    """Devanagari text in the engine's own swar face (Tiro Devanagari Hindi)"""
    return f'<text class="dv" x="{x}" y="{y}" text-anchor="{a}" style="font-size:{size}px">{esc(s)}</text>'


def TR(x, y, s, c="lbl-s", a="middle"):
    """text rotated -90 (reads bottom to top), anchored at (x, y)"""
    return f'<text class="{c}" transform="translate({x} {y}) rotate(-90)" text-anchor="{a}">{esc(s)}</text>'


def BOX(x, y, w, h, title, lines=(), cls="box", tc="lbl"):
    """box with a centred title and up to three detail lines"""
    n = len(lines)
    block = 2.4 + n * 2.9
    top = y + (h - block) / 2
    out = [f'<rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}"/>']
    out.append(T(x + w / 2, round(top + 2.2, 2), title, tc, "middle"))
    for i, ln in enumerate(lines):
        out.append(T(x + w / 2, round(top + 2.2 + 3.0 + i * 2.7, 2), ln, "lbl-s", "middle"))
    return "\n".join(out)


def WA(x1, y1, x2, y2):
    return f'<line class="wa" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>'


def W(x1, y1, x2, y2):
    return f'<line class="w" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>'


def POLY(pts, cls="w"):
    return f'<polyline class="{cls}" points="{" ".join(f"{a},{b}" for a, b in pts)}"/>'


def PANEL(x, y, w, h, name):
    return f'<rect class="panel" x="{x}" y="{y}" width="{w}" height="{h}"/>' + T(x + 1.9, y + 3.1, name)


def DOT(x, y, r=0.55):
    return f'<circle class="dot" cx="{x}" cy="{y}" r="{r}"/>'


def LD(x1, y1, x2, y2):
    return f'<line class="ld" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>'


def TL(x1, y1, x2, y2, c="t"):
    return f'<line class="{c}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>'


def STN(x, y, n):
    """station tag"""
    return f'<g transform="translate({x} {y})"><circle class="of" r="1.3"/><text class="lbl-s" y="0.65" text-anchor="middle" style="font-size:1.8px">{n}</text></g>'


# ---------------------------------------------------------------- page furniture
def para(num, head, text, level=2, flush=False, bar=None, style=""):
    h = f"<h{level}>{head}</h{level}>"
    cb = f'<div class="changebar" style="top:{bar[0]}mm; height:{bar[1]}mm"></div>' if bar else ""
    p = f'<p class="flush">{text}</p>' if flush else f"<p>{text}</p>"
    st = f' style="{style}"' if style else ""
    return f'<section class="para"{st}>{cb}<div class="num">{num}</div><div>{h}{p}</div></section>'


def figure(inner, h, code, no, caption, y0=0):
    return (f'<figure><svg viewBox="0 {y0} 180 {h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{esc(caption)}">\n{inner}\n'
            f'<text class="code" x="178.6" y="{round(y0 + h - 0.6, 2)}" text-anchor="end">{code}</text></svg>'
            f'<figcaption><span class="n">Figure {no}.</span>{esc(caption)}</figcaption></figure>')


def table(num, cap_no, cap, head, rows, wide=False):
    th = "".join(f"<th>{esc(h)}</th>" for h in head)
    body = "\n".join("<tr>" + "".join(f'<td{" class=v" if i == len(r) - 1 else ""}>{esc(c)}</td>' for i, c in enumerate(r)) + "</tr>" for r in rows)
    cls = ' class="wide"' if wide else ""
    return (f'<section class="para"><div class="num">{num}</div><div><h2>{cap[0]}</h2></div></section>'
            f'<div class="tcap">Table {cap_no}. {esc(cap[1])}</div>'
            f"<table{cls}><thead><tr>{th}</tr></thead><tbody>\n{body}\n</tbody></table>")


def notice(tag, text):
    return f'<div class="notice"><span class="tag">{tag}</span><p>{text}</p></div>'


def card(name, who, steps):
    """steps: list of (num, text). num '' for a verification/continuation line."""
    li = "\n".join(f'<li><span>{esc(n)}</span><span>{esc(t)}</span></li>' for n, t in steps)
    return f'<div class="card"><div class="bar"><span>{esc(name)}</span><span>{esc(who)}</span></div><ol>\n{li}\n</ol></div>'


def lower(left, right):
    return f'<div class="lower"><div>{left}</div><div>{right}</div></div>'


def page(sub_no, sub_name, body, pg, tab_top=112, opener_extra=""):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{DOC} Bhatkhande-Flow Operations Handbook, page {pg}</title>
<style>
{CSS}
</style>
</head>
<body>
{DEFS}
<div class="page">
  <header class="head">
    <div class="doc">{DOC}</div>
    <div class="title">{TITLE}</div>
    <div class="part">SYSTEMS DATA</div>
    <div class="rule"></div>
  </header>
  <div class="tab" style="top:{tab_top}mm">{TAB}</div>
  <div class="opener">
    SECTION 1 &nbsp;&nbsp;&middot;&nbsp;&nbsp; SUBSECTION {sub_no}<br>
    {sub_name}
  </div>
{body}
  <footer class="foot">
    <div class="rule"></div>
    <div class="sub">{SUBSYSTEM}</div>
    <div class="line">
      <span>Mission <span class="fill" style="width:20mm">&nbsp;</span></span>
      <span>Basic Date <span class="fill" style="width:30mm">{BASIC}</span></span>
      <span>Change Date <span class="fill" style="width:30mm">{CHANGE}</span></span>
      <span>Page <span class="fill" style="width:18mm">{pg}</span></span>
    </div>
  </footer>
</div>
{SCRIPT}
</body>
</html>
"""
