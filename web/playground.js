// Playground part 4 of 4: loading input, wiring the controls, and starting up.

// ---------------------------------------------------------------- loading input

function stripExtension(fileName) {
  for (const ext of ['.json', '.xml']) if (fileName.endsWith(ext)) return fileName.slice(0, -ext.length);
  return fileName;
}

function loadText(text, fileName) {
  byId('src').value = text;
  fileStem = stripExtension(fileName);
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
