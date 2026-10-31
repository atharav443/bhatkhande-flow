# Builds examples/full-sample.json and examples/full-sample.xml from ONE spec, so they cannot drift apart.
import json, sys
from xml.sax.saxutils import escape, quoteattr

def S(swar, lyric=None, **k):
    d = {"swar": swar}; d.update(k)
    if lyric is not None: d["lyric"] = lyric
    return d
EXT = lambda lyric=None, **k: ({"type": "extend", **k} | ({"lyric": lyric} if lyric else {}))
REST = lambda **k: {"type": "rest", **k}

# (index, [events], note, extra matra fields)
def M(i, events, note=None, **extra): return {"index": i, "events": events, "_note": note, **extra}

sthayi_l1 = [
  M(9,  [S("नी", "का", octave=-1)], "octave -1 = mandra: dot below the swar"),
  M(10, [S("रे", "न्हा", id="m1")], "id: lets a span refer to this event (see the spans list at the end)"),
  M(11, [S("ग", "रे")]),
  M(12, [S("म", "तू", tivra=True)], "tivra ma: stroke above"),
  M(13, [S("प", "आ", id="m2")]),
  M(14, [S("ग", "जा")]),
  M(15, [S("रे", "मे"), S("सा", "रे")], "two events, no durations: they share the matra equally (1/2 each)"),
  M(16, [S("सा", "ऽ", octave=1)], "octave 1 = taar: dot above the swar"),
]
sthayi_l2 = [
  M(1,  [S("सा", "अं", duration=2)], "duration 2: held for two matras"),
  M(2,  [], "empty matra: the held swar is carried into it (no events allowed here)"),
  M(3,  [S("ग", "ग", duration="1/2"), S("म", "ना", tivra=True, duration="1/2")], "explicit durations"),
  M(4,  [EXT("ऽ")], "extend: held swar, printed as a dash"),
  M(5,  [S("म", "रे", tivra=True), S("ग", "ऽ"), S("रे", "ऽ")], "three events, no durations: 1/3 each, grouped by a curve"),
  M(6,  [S("ध", "सु", kan=[S("नी")])], "kan: grace note above its swar"),
  M(7,  [S("प", "न", kan=[S("ध", komal=True, kan=[S("म", tivra=True)])])], "kan inside kan (two levels is the limit)"),
  M(8,  [S("ग", "ना", khatka=True)], "khatka: swar printed in parentheses"),
  M(9,  [S("रे", "ब", komal=True)], "komal: bar under the swar"),
  M(10, [S("ध", "सो", komal=True)]),
  M(11, [S("नी", "हे", komal=True)]),
  M(12, [S("ग", "री", komal=True)]),
  M(13, [S("ग", "सु", meend="start")], "meend start"),
  M(14, [S("म", "ऽ", tivra=True)]),
  M(15, [S("प", "ऽ", meend="end")], "meend end: arc from matra 13 to here"),
  M(16, [REST()], "rest: drawn as an empty slot (no printed rest sign in Bhatkhande notation)"),
]
syll = ["ब","ज","ऽ","रे","मु","र","ली","ऽ","सु","न","ऽ","आ"]
notes = [("ग",{}),("म",{}),("प",{}),("ध",{}),("नी",{}),("सां",{}),("नी",{}),("ध",{}),("प",{}),("म",{"tivra":True}),("ग",{}),("रे",{})]
antara = [M(i+1, [S(n, syll[i], **kw)], "swar text 'सां' = taar (anusvara)" if n=="सां" else (None if i else "repeat sign before this matra: line repeatStart")) for i,(n,kw) in enumerate(notes)]
antara += [
  M(13, [S("ग","सा")], "ending 1 starts: matras with volta 1 share one bracket", volta="1"),
  M(14, [S("रे","जा")], None, volta="1"),
  M(15, [S("सा","ऽ")], None, volta="1"),
  M(16, [EXT("ऽ")], "last matra of ending 1: repeat sign after it", volta="1", repeatAfter=True),
  M(13, [S("ग","सा")], "ending 2 rewinds to matra 13 and sits under ending 1", volta="2"),
  M(14, [S("म","म")], None, volta="2"),
  M(15, [S("प","स")], None, volta="2"),
  M(16, [S("सां","ऽ")], None, volta="2"),
]
short = [
  M(1,  ["N."], "string shorthand (JSON). N. = mandra ni"),
  M(2,  ["S"]), M(3, ["R"]), M(4, ["G"]),
  M(5,  ["m"], "m = tivra ma"),
  M(6,  ["P"]), M(7, ["D"]), M(8, ["N"]),
  M(9,  ["S'"], "S' = taar sa"),
  M(10, ["N"]), M(11, ["D"]), M(12, ["P"]), M(13, ["m"]),
  M(14, ["G", "R"]),
  M(15, ["S", "-"], "'-' = held swar (extend)"),
  M(16, [","], "',' = rest"),
]
SPEC = {
  "version": 1,
  "metadata": {
    "title": "नमूना बंदिश: सभी सुविधाएँ", "raag": "Sample", "taal": "teentaal", "laya": "madhya",
    "thaat": "Kalyan", "composer": "Sample", "label": "Sample 1", "tempo": 90,
    "text": ["कान्हा रे तू आ जा मेरे अंगना रे", "बजे मुरली सुन आ"],
  },
  "sections": [
    {"name": "स्थायी", "startMatra": 9, "note": "Pickup: the first line starts at matra 9, so it sits right-aligned on the grid.",
     "lines": [{"number": 1, "matras": sthayi_l1}, {"number": 2, "matras": sthayi_l2}]},
    {"name": "अन्तरा", "startMatra": 1, "note": "Alternate endings and a repeat.",
     "lines": [{"number": 3, "repeatStart": True, "matras": antara}]},
    {"name": "तिहाई", "startMatra": 9, "note": "Tihai: a phrase three times. The last note must land on sam (matra 1).",
     "lines": [{"number": 4, "matras": [{"tihai": {"phrase": ["ग", "रे", "सा"], "unit": "1", "repeat": 3, "landsOn": "sam", "label": "तिहाई"}}]}]},
    {"name": "स्वरमालिका", "startMatra": 1, "note": "Shorthand strings, and a section without lyrics.",
     "lines": [{"number": 5, "matras": short}]},
  ],
  "spans": [{"type": "meend", "from": "m1", "to": "m2", "note": "a meend made from two event ids, instead of meend start/end on the swars"}],
}

# ---------------- JSON ----------------
def clean(o):
    if isinstance(o, dict): return {k: clean(v) for k, v in o.items() if not k.startswith("_") and k != "note"}
    if isinstance(o, list): return [clean(x) for x in o]
    return o
def dump(o): return json.dumps(clean(o), ensure_ascii=False, separators=(", ", ": "))
def to_json(spec):
    out = ["{", f'  "version": {spec["version"]},', f'  "metadata": {json.dumps(spec["metadata"], ensure_ascii=False, indent=2).replace(chr(10), chr(10)+"  ")},', '  "sections": [']
    for si, s in enumerate(spec["sections"]):
        out.append("    {")
        out.append(f'      "name": {json.dumps(s["name"], ensure_ascii=False)}, "startMatra": {s["startMatra"]},')
        out.append('      "lines": [')
        for li, l in enumerate(s["lines"]):
            head = {k: v for k, v in l.items() if k != "matras"}
            out.append("        {")
            out.append("          " + ", ".join(f'"{k}": {json.dumps(v, ensure_ascii=False)}' for k, v in head.items()) + ",")
            out.append('          "matras": [')
            ms = l["matras"]
            for mi, m in enumerate(ms):
                out.append("            " + dump(m) + ("," if mi < len(ms) - 1 else ""))
            out.append("          ]")
            out.append("        }" + ("," if li < len(s["lines"]) - 1 else ""))
        out.append("      ]")
        out.append("    }" + ("," if si < len(spec["sections"]) - 1 else ""))
    out.append("  ],")
    out.append('  "spans": ' + dump(spec["spans"]))
    out.append("}")
    return "\n".join(out) + "\n"

# ---------------- XML ----------------
def A(**k):
    return "".join(f" {n}={quoteattr(str(v))}" for n, v in k.items() if v not in (None, False))
def tf(v): return "true" if v is True else v
def kan_xml(k, pad):
    nested = k.get("kan")
    if isinstance(nested, dict): nested = [nested]
    a = A(octave=k.get("octave"), komal=tf(k.get("komal")), tivra=tf(k.get("tivra")))
    if nested:
        return [f"{pad}<kan{a}>{escape(k['swar'])}"] + sum((kan_xml(n, pad + "  ") for n in nested), []) + [f"{pad}</kan>"]
    return [f"{pad}<kan{a}>{escape(k['swar'])}</kan>"]
def ev_xml(e, pad):
    rows = []
    if isinstance(e, str):
        if e in ("-", "–", "—", "ऽ", "_", "~"): return [f"{pad}<extend/>"]
        if e in ("rest", ",", "0"): return [f"{pad}<rest/>"]
        return [f"{pad}<swar>{escape(e)}</swar>"]
    if e.get("type") in ("extend", "rest"):
        rows.append(f"{pad}<{e['type']}{A(duration=e.get('duration'))}/>")
    else:
        a = A(id=e.get("id"), octave=e.get("octave"), komal=tf(e.get("komal")), tivra=tf(e.get("tivra")), khatka=tf(e.get("khatka")), duration=e.get("duration"), meend=e.get("meend"))
        kans = e.get("kan") or []
        if kans:
            rows.append(f"{pad}<swar{a}>{escape(e['swar'])}"); [rows.extend(kan_xml(k, pad + "  ")) for k in kans]; rows.append(f"{pad}</swar>")
        else:
            rows.append(f"{pad}<swar{a}>{escape(e['swar'])}</swar>")
    if "lyric" in e: rows.append(f"{pad}<lyric>{escape(e['lyric'])}</lyric>")
    return rows
def to_xml(spec):
    md = spec["metadata"]
    x = ['<?xml version="1.0" encoding="UTF-8"?>', f'<hindustani-composition version="{spec["version"]}">', "  <metadata>"]
    for k in ("title", "raag", "laya", "thaat", "composer", "label", "tempo"):
        x.append(f"    <{k}>{escape(str(md[k]))}</{k}>")
    x.append(f'    <taal name="{md["taal"]}"/>')
    x.append("    <text>" + escape("\n".join(md["text"])) + "</text>")
    x.append("  </metadata>")
    for s in spec["sections"]:
        x.append(""); x.append(f"  <!-- {s['note']} -->")
        x.append(f'  <section name="{s["name"]}" start-matra="{s["startMatra"]}">')
        for l in s["lines"]:
            x.append(f'    <line{A(number=l["number"], **{"repeat-start": tf(l.get("repeatStart"))})}>')
            for m in l["matras"]:
                if "tihai" in m:
                    t = m["tihai"]
                    x.append(f'      <tihai{A(repeat=t["repeat"], unit=t["unit"], **{"lands-on": t["landsOn"]}, label=t["label"])}>')
                    for p in t["phrase"]: x.append(f"        <swar>{escape(p)}</swar>")
                    x.append("      </tihai>"); continue
                if m.get("_note"): x.append(f"      <!-- {m['_note']} -->")
                a = A(index=m["index"], volta=m.get("volta"), **{"repeat-after": tf(m.get("repeatAfter")), "repeat-before": tf(m.get("repeatBefore"))})
                if not m["events"]: x.append(f"      <matra{a}/>"); continue
                x.append(f"      <matra{a}>"); [x.extend(ev_xml(e, "        ")) for e in m["events"]]; x.append("      </matra>")
            x.append("    </line>")
        x.append("  </section>")
    x.append("")
    for sp in spec["spans"]:
        x.append(f"  <!-- {sp['note']} -->")
        x.append(f'  <span{A(type=sp["type"], **{"from": sp["from"]}, to=sp["to"])}/>')
    x.append("</hindustani-composition>"); x.append("")
    return "\n".join(x)

if __name__ == "__main__":
    d = sys.argv[1]
    open(f"{d}/full-sample.json", "w", encoding="utf8").write(to_json(SPEC))
    open(f"{d}/full-sample.xml", "w", encoding="utf8").write(to_xml(SPEC))
