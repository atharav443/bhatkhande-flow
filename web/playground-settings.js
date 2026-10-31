// Bhatkhande Flow playground, part 1 of 4: settings and shared state.
// The playground files are plain scripts loaded in this order by index.html (they share top-level names):
//   playground-settings.js, playground-render.js, playground-downloads.js, playground.js
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
