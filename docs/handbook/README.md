# Bhatkhande-Flow Operations Handbook

Apollo-style handbook (NASA handbook skill), 7 pages, one subsection per page.

- `Bhatkhande_Flow_NASA_Handbook.pdf` – the merged handbook
- `pK.pdf / pK.png` – single pages
- `pK.py` – page source (text, figures, tables); `hb.py` – shared furniture; `make.py` – builds `pK.html`

Rebuild one page:

    python3 make.py 5
    CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" sh render.sh p5.html
    python3 check.py p5.pdf

Note: `render.sh` has --no-sandbox added (needed when running as root in a container; harmless on a Mac).
Pages were rendered on Linux with Gelasio standing in for Iowan Old Style; a Mac render will use Iowan Old Style.
