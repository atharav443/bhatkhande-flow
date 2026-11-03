/**
 * PNG resolution metadata.
 *
 * Word and Google Docs place an image at its *intrinsic* size, which for a PNG is pixels divided by
 * the resolution in its `pHYs` chunk. Nothing writes that chunk for us (resvg does not), so the
 * reader falls back to 96 dpi and a 3125 px page lands in the document 32 inches wide.
 * `setPngDensity` writes the chunk in place, which makes the image insert at its real size.
 *
 * Zero dependencies by design: this is spliced into an existing PNG byte stream, no re-encode.
 */

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const TYPE_PHYS = 0x70485973; // 'pHYs'
const TYPE_IDAT = 0x49444154; // 'IDAT'
/** PNG stores resolution as pixels per METRE */
const METRES_PER_INCH = 0.0254;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function isPng(png: Uint8Array): boolean {
  return png.length >= 8 && SIGNATURE.every((b, i) => png[i] === b);
}

interface ChunkSpan {
  type: number;
  start: number;
  end: number;
}

function* chunks(png: Uint8Array): Generator<ChunkSpan> {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let offset = 8;
  while (offset + 8 <= png.byteLength) {
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    if (end > png.byteLength) throw new Error('PNG: truncated chunk');
    yield { type: view.getUint32(offset + 4), start: offset, end };
    offset = end;
  }
}

function buildChunk(type: number, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  view.setUint32(4, type);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** The `pHYs` payload: x and y pixels per metre, then unit 1 = metre. */
function physData(dpi: number): Uint8Array {
  const ppm = Math.round(dpi / METRES_PER_INCH);
  const data = new Uint8Array(9);
  const view = new DataView(data.buffer);
  view.setUint32(0, ppm);
  view.setUint32(4, ppm);
  data[8] = 1;
  return data;
}

/**
 * Return the PNG with its resolution set to `dpi`, replacing an existing `pHYs` chunk if there is one
 * and otherwise inserting it before the image data (the spec requires it to precede `IDAT`).
 */
export function setPngDensity(png: Uint8Array, dpi: number): Uint8Array {
  if (!Number.isFinite(dpi) || dpi <= 0) throw new RangeError(`dpi must be > 0 (got ${dpi})`);
  if (!isPng(png)) throw new TypeError('setPngDensity: not a PNG (bad signature)');
  const phys = buildChunk(TYPE_PHYS, physData(dpi));

  let existing: ChunkSpan | undefined;
  let firstImageData: ChunkSpan | undefined;
  for (const c of chunks(png)) {
    if (c.type === TYPE_PHYS) existing = c;
    else if (c.type === TYPE_IDAT) {
      firstImageData = c;
      break;
    }
  }
  if (existing) {
    const out = new Uint8Array(png.length - (existing.end - existing.start) + phys.length);
    out.set(png.subarray(0, existing.start), 0);
    out.set(phys, existing.start);
    out.set(png.subarray(existing.end), existing.start + phys.length);
    return out;
  }
  if (!firstImageData) throw new Error('PNG: no IDAT chunk');
  const at = firstImageData.start;
  const out = new Uint8Array(png.length + phys.length);
  out.set(png.subarray(0, at), 0);
  out.set(phys, at);
  out.set(png.subarray(at), at + phys.length);
  return out;
}

/** Resolution stored in the PNG, in dpi, or `undefined` when it carries no `pHYs` chunk. */
export function getPngDensity(png: Uint8Array): number | undefined {
  if (!isPng(png)) throw new TypeError('getPngDensity: not a PNG (bad signature)');
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  for (const c of chunks(png)) {
    if (c.type !== TYPE_PHYS) continue;
    const ppm = view.getUint32(c.start + 8);
    const unit = png[c.start + 16];
    if (unit === 1) return ppm * METRES_PER_INCH;
    return ppm === 2835 ? 72 : undefined; // the spec's "unknown unit" is defined as the 72 dpi default
  }
  return undefined;
}
