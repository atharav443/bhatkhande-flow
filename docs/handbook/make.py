#!/usr/bin/env python3
"""python3 make.py [1 2 3 ...]  -> writes p<k>.html for the requested pages (default: all that exist)."""
import importlib, sys
from pathlib import Path
here = Path(__file__).resolve().parent
sys.path.insert(0, str(here))
want = [int(a) for a in sys.argv[1:]] or range(1, 8)
for k in want:
    try:
        m = importlib.import_module(f"p{k}")
    except ModuleNotFoundError:
        continue
    (here / f"p{k}.html").write_text(m.build())
    print(f"wrote p{k}.html")
