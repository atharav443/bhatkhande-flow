// Bhatkhande Flow playground: what the page in index.html does.
//
// Flow:  input text  →  BhatkhandeFlow.toBandishInput()  →  Factory.renderBandish()  →  SVG on the page
//
// `BhatkhandeFlow` is the engine bundle loaded by index.html (built from src/browser.ts).

const engine = window.BhatkhandeFlow;
const byId = (id) => document.getElementById(id);

// ---------------------------------------------------------------- settings

/** Font files, copied next to this page by `npm run build:web`. */
const FONT_URLS = {
  tiroDeva: 'fonts/tiro-devanagari-hindi-devanagari-400-normal.woff',
  tiroLatin: 'fonts/tiro-devanagari-hindi-latin-400-normal.woff',
  notoReg: 'fonts/noto-serif-devanagari-devanagari-400-normal.woff',
  notoBold: 'fonts/noto-serif-devanagari-devanagari-700-normal.woff',
};

/** Outline colour of each label class when "show label boxes" is on. */
const BOX_COLORS = {
  swar: '#dc2638',
  swar_rest: '#0e7490',
  lyric: '#245ddd',
  lyric_rest: '#13833f',
  kan_swar: '#8c3bba',
  khatka_bracket: '#b45309',
  octave_dot: '#d82b9c',
  komal_mark: '#007567',
  tivra_mark: '#007567',
  grouping_curve: '#aa8000',
  meend: '#aa8000',
  tihai_bracket: '#555',
  taal_marker: '#f07a0a',
  vibhag_line: '#81532b',
  line_end_bar: '#81532b',
  repeat_bar: '#81532b',
  volta_bracket: '#6d28d9',
  section_heading: '#999',
  title: '#999',
};

const DEFAULT_EXAMPLE = 'bhimpalasi-geet.json';
const TYPING_DELAY_MS = 300; // re-render this long after the last key press

// ---------------------------------------------------------------- state

let lastResult = null; // what renderBandish() returned last time
let lastInput = null; // the bandish it was given (after Label Studio conversion)
let fileStem = 'bandish'; // name used for downloads

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

// ---------------------------------------------------------------- downloads

function download(blob, fileName) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
}

function downloadSvg() {
  if (!lastResult) return;
  download(new Blob([lastResult.svg], { type: 'image/svg+xml' }), `${fileStem}.svg`);
}

/** PNG at 2× size: draw the SVG into a canvas, then save the canvas. */
function downloadPng() {
  if (!lastResult) return;
  const SCALE = 2;
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = lastResult.width * SCALE;
    canvas.height = lastResult.height * SCALE;
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => download(blob, `${fileStem}.png`));
  };
  image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(lastResult.svg);
}

function downloadYolo() {
  if (!lastResult) return;
  const lines = engine.toYOLO(lastResult.labels, lastResult.width, lastResult.height);
  const text = lines + '\n# classes: ' + engine.LABEL_CLASSES.join(',');
  download(new Blob([text], { type: 'text/plain' }), `${fileStem}.yolo.txt`);
}

/** The bandish JSON the engine rendered: for a Label Studio export, this is the converted bandish. */
function downloadBandishJson() {
  if (!lastInput) return;
  const text = typeof lastInput === 'string' ? lastInput : JSON.stringify(lastInput, null, 1);
  download(new Blob([text], { type: 'application/json' }), `${fileStem}.bandish.json`);
}

// ---------------------------------------------------------------- loading input

function loadText(text, fileName) {
  byId('src').value = text;
  fileStem = fileName.replace(/\.(json|xml)$/, '');
  render();
}

async function loadExample(fileName) {
  const response = await fetch('examples/' + fileName);
  loadText(await response.text(), fileName);
}

async function loadFile(file) {
  if (file) loadText(await file.text(), file.name);
}

/** Fills the Example list from examples/index.json (served by scripts/serve.mjs). */
async function fillExampleList() {
  const names = await (await fetch('examples/index.json')).json();
  const select = byId('example');
  for (const name of names) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
  select.value = names.includes(DEFAULT_EXAMPLE) ? DEFAULT_EXAMPLE : names[0];
}

/** Clicking a swar or syllable shows its class and data-* attributes (matra, fraction, …). */
function showClickedElement(event) {
  const group = event.target.closest('g[class]');
  if (!group || !lastResult) return;
  const data = Object.entries(group.dataset)
    .map(([key, value]) => `${key}=${value}`)
    .join('  ');
  byId('pick').textContent = `${group.getAttribute('class')}  ${data}`;
}

// ---------------------------------------------------------------- wiring

function connectControls() {
  // re-render shortly after typing stops
  let typingTimer;
  byId('src').addEventListener('input', () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(render, TYPING_DELAY_MS);
  });

  for (const id of ['engine', 'script', 'lyricCurves', 'boxes']) {
    byId(id).addEventListener('change', render);
  }

  byId('example').addEventListener('change', () => loadExample(byId('example').value));
  byId('file').addEventListener('change', (event) => loadFile(event.target.files[0]));

  const dropZone = byId('drop');
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('over');
    loadFile(event.dataTransfer.files[0]);
  });

  byId('dlSvg').addEventListener('click', downloadSvg);
  byId('dlPng').addEventListener('click', downloadPng);
  byId('dlYolo').addEventListener('click', downloadYolo);
  byId('dlJson').addEventListener('click', downloadBandishJson);
  byId('stage').addEventListener('click', showClickedElement);
}

async function start() {
  connectControls();
  await fillExampleList();
  await loadExample(byId('example').value);
}

start();
