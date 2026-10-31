// Playground part 3 of 4: saving the result as SVG, PNG, YOLO labels or bandish JSON.

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
