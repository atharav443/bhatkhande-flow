/** Tiny dependency-free XML reader (elements, attributes, text, comments, CDATA, entities). Enough for bandish files. */
export interface XNode {
  name: string;
  attrs: Record<string, string>;
  children: XNode[];
  text: string;
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** The character for an entity name (without & and ;): "amp", "#65" or "#x41". Undefined if it is not one. */
function decodeEntity(name: string): string | undefined {
  if (name[0] !== '#') return Object.prototype.hasOwnProperty.call(ENT, name) ? ENT[name] : undefined;
  const hex = name[1] === 'x';
  const digits = name.slice(hex ? 2 : 1);
  const isValid = (c: string) =>
    (c >= '0' && c <= '9') || (hex && c.toLowerCase() >= 'a' && c.toLowerCase() <= 'f');
  if (!digits || ![...digits].every(isValid)) return undefined;
  return String.fromCodePoint(parseInt(digits, hex ? 16 : 10));
}

/** Replaces &amp; &#65; &#x41; style entities; anything unrecognised is left as written. */
function decode(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const amp = s.indexOf('&', i);
    if (amp < 0) break;
    const semi = s.indexOf(';', amp);
    const decoded = semi < 0 ? undefined : decodeEntity(s.slice(amp + 1, semi));
    if (decoded === undefined) {
      out += s.slice(i, amp + 1);
      i = amp + 1;
    } else {
      out += s.slice(i, amp) + decoded;
      i = semi + 1;
    }
  }
  return out + s.slice(i);
}

const isSpace = (c: string | undefined) => c !== undefined && c.trim() === '';

/** Reads the tag name at the start of `inner` (`<name attr="x">`); returns it and the rest of the text. */
function readTagName(inner: string): { name: string; rest: string } | undefined {
  let start = 0;
  while (isSpace(inner[start])) start++;
  let end = start;
  while (end < inner.length && !isSpace(inner[end]) && inner[end] !== '/' && inner[end] !== '>') end++;
  return end > start ? { name: inner.slice(start, end), rest: inner.slice(end) } : undefined;
}

/** Reads name="value" / name='value' pairs; junk between them is skipped. */
function readAttributes(text: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let i = 0;
  while (i < text.length) {
    while (i < text.length && (isSpace(text[i]) || text[i] === '=')) i++;
    const nameStart = i;
    while (i < text.length && !isSpace(text[i]) && text[i] !== '=') i++;
    const name = text.slice(nameStart, i);
    while (isSpace(text[i])) i++;
    if (!name || text[i] !== '=') continue;
    i++;
    while (isSpace(text[i])) i++;
    const quote = text[i];
    const close = quote === '"' || quote === "'" ? text.indexOf(quote, i + 1) : -1;
    if (close < 0) continue;
    attrs[name] = decode(text.slice(i + 1, close));
    i = close + 1;
  }
  return attrs;
}

export function parseXML(src: string): XNode {
  const root: XNode = { name: '#root', attrs: {}, children: [], text: '' };
  const stack: XNode[] = [root];
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    const top = stack[stack.length - 1];
    if (lt < 0) {
      top.text += decode(src.slice(i));
      break;
    }
    if (lt > i) top.text += decode(src.slice(i, lt));
    if (src.startsWith('<!--', lt)) {
      const e = src.indexOf('-->', lt);
      if (e < 0) throw new Error('Unterminated XML comment');
      i = e + 3;
      continue;
    }
    if (src.startsWith('<![CDATA[', lt)) {
      const e = src.indexOf(']]>', lt);
      if (e < 0) throw new Error('Unterminated CDATA');
      top.text += src.slice(lt + 9, e);
      i = e + 3;
      continue;
    }
    if (src.startsWith('<?', lt) || src.startsWith('<!', lt)) {
      const e = src.indexOf('>', lt);
      if (e < 0) throw new Error('Unterminated declaration');
      i = e + 1;
      continue;
    }
    const gt = src.indexOf('>', lt);
    if (gt < 0) throw new Error('Unterminated tag');
    const body = src.slice(lt + 1, gt);
    i = gt + 1;
    if (body[0] === '/') {
      const nm = body.slice(1).trim();
      const cur = stack.pop();
      if (!cur || cur.name !== nm) throw new Error(`XML mismatch: </${nm}> closes <${cur?.name}>`);
      continue;
    }
    const selfClose = body.endsWith('/');
    const inner = selfClose ? body.slice(0, -1) : body;
    const tag = readTagName(inner);
    if (!tag) throw new Error('Malformed tag');
    const node: XNode = { name: tag.name, attrs: readAttributes(tag.rest), children: [], text: '' };
    top.children.push(node);
    if (!selfClose) stack.push(node);
  }
  if (stack.length !== 1) throw new Error(`XML: unclosed <${stack[stack.length - 1].name}>`);
  const el = root.children[0];
  if (!el) throw new Error('XML: no root element');
  return el;
}
