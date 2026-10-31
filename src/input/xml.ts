/** Tiny dependency-free XML reader (elements, attributes, text, comments, CDATA, entities). Enough for bandish files. */
export interface XNode {
  name: string;
  attrs: Record<string, string>;
  children: XNode[];
  text: string;
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, e: string) => {
    if (e[0] === '#')
      return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e] ?? m;
  });

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
    const m = /^\s*([^\s/>]+)/.exec(inner);
    if (!m) throw new Error('Malformed tag');
    const node: XNode = { name: m[1], attrs: {}, children: [], text: '' };
    const re = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let a: RegExpExecArray | null;
    while ((a = re.exec(inner.slice(m[0].length)))) node.attrs[a[1]] = decode(a[2] ?? a[3] ?? '');
    top.children.push(node);
    if (!selfClose) stack.push(node);
  }
  if (stack.length !== 1) throw new Error(`XML: unclosed <${stack[stack.length - 1].name}>`);
  const el = root.children[0];
  if (!el) throw new Error('XML: no root element');
  return el;
}
