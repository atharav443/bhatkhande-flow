// Playground part 2 of 4: choosing a font provider and drawing the result.

// ---------------------------------------------------------------- fonts

/**
 * Two ways to measure and draw text:
 *  - 'fontkit': shapes the font outlines itself, so the SVG is identical to the Node output;
 *  - 'canvas':  lets the browser draw text, which needs no font library.
 * Each provider is created once and reused.
 */
const fontProviders = {};

async function getFontProvider(kind) {
  if (!fontProviders[kind]) {
    if (kind === 'fontkit') {
      fontProviders[kind] = await engine.createBrowserFontProvider(FONT_URLS);
    } else {
      await engine.ensureFontsLoaded();
      fontProviders[kind] = engine.createCanvasFontProvider();
    }
  }
  return fontProviders[kind];
}

// ---------------------------------------------------------------- render

async function render() {
  const fontKind = byId('engine').value;
  byId('status').textContent = 'rendering…';

  try {
    const fonts = await getFontProvider(fontKind);
    const input = engine.toBandishInput(byId('src').value);
    lastInput = input;

    const startedAt = performance.now();
    const factory = new engine.Factory({
      fonts,
      style: {
        script: byId('script').value,
        textMode: fontKind === 'canvas' ? 'text' : 'path',
      },
      build: { lyricCurves: byId('lyricCurves').checked },
    });
    const result = factory.renderBandish(input);
    const elapsedMs = performance.now() - startedAt;
    lastResult = result;

    byId('stage').innerHTML = result.svg;
    if (byId('boxes').checked) drawLabelBoxes(result);

    // the browser smoke test waits for "px ·" in this text
    byId('status').textContent =
      `${Math.round(result.width)}×${Math.round(result.height)} px · ${elapsedMs.toFixed(0)} ms`;
    showLabelCounts(result.labels);
    showDiagnostics(result.diagnostics);
  } catch (error) {
    byId('status').textContent = 'error';
    showDiagnostics([{ level: 'error', code: 'exception', message: String(error?.message ?? error) }]);
  }
}

/** "swar 28 · lyric 23 · …" under the render. */
function showLabelCounts(labels) {
  const counts = {};
  for (const label of labels) counts[label.cls] = (counts[label.cls] ?? 0) + 1;
  byId('counts').textContent = Object.entries(counts)
    .map(([cls, n]) => `${cls} ${n}`)
    .join(' · ');
}

/** Warnings and errors from the engine, one line each, coloured by level. */
function showDiagnostics(diagnostics) {
  const list = byId('diag');
  list.innerHTML = '';

  if (diagnostics.length === 0) {
    addListItem(list, 'ok', 'no diagnostics');
    return;
  }
  for (const d of diagnostics) {
    const text = d.code === 'exception' ? d.message : `${d.level} ${d.code}: ${d.message}`;
    addListItem(list, d.level, text);
  }
}

function addListItem(list, className, text) {
  const item = document.createElement('li');
  item.className = className;
  item.textContent = text;
  list.appendChild(item);
}

/** Draws each label's box over the SVG (boxes are stored in output pixels, so divide by the scale). */
function drawLabelBoxes(result) {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svg = byId('stage').querySelector('svg');
  const group = document.createElementNS(SVG_NS, 'g');

  for (const label of result.labels) {
    const [x0, y0, x1, y1] = label.bbox.map((v) => v / result.scale);
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', x0);
    rect.setAttribute('y', y0);
    rect.setAttribute('width', x1 - x0);
    rect.setAttribute('height', y1 - y0);
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', BOX_COLORS[label.cls] ?? '#000');
    rect.setAttribute('stroke-width', '0.8');
    group.appendChild(rect);
  }
  svg.appendChild(group);
}
