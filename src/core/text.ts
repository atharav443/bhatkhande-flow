/** Small text helpers shared by the input readers and renderers. */

const isSpace = (c: string) => c.trim() === '';
const isDigit = (c: string) => c >= '0' && c <= '9';

/** Splits on every character for which `isSeparator` is true and drops empty pieces. */
export function splitOn(text: string, isSeparator: (c: string) => boolean): string[] {
  const parts: string[] = [];
  let current = '';
  for (const c of text) {
    if (isSeparator(c)) {
      if (current) parts.push(current);
      current = '';
    } else current += c;
  }
  if (current) parts.push(current);
  return parts;
}

/** "a b  c" -> ["a", "b", "c"] */
export const splitWords = (text: string) => splitOn(text, isSpace);

/** "a, b c" -> ["a", "b", "c"] (commas and/or whitespace) */
export const splitList = (text: string) => splitOn(text, (c) => isSpace(c) || c === ',');

/** One entry per non-empty line. */
export const splitLines = (text: string) => splitOn(text, (c) => c === '\n');

/** True for "12", false for "", "1.5" and "1a". */
export const isWholeNumber = (text: string) => text !== '' && [...text].every(isDigit);

/** Escapes & < > and " so the text can sit inside XML / SVG content or an attribute. */
export function escapeXml(value: string): string {
  const replacements: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  return [...value].map((c) => replacements[c] ?? c).join('');
}

/** Pulls every number (optional minus, digits, optional .digits) out of text such as an SVG path "M10 -2.5L3 4". */
export function numbersIn(text: string): number[] {
  const numbers: number[] = [];
  let i = 0;
  while (i < text.length) {
    const start = i;
    if (text[i] === '-') i++;
    const digitsStart = i;
    while (i < text.length && isDigit(text[i])) i++;
    if (i === digitsStart) {
      i = Math.max(i, start + 1); // no digits here: move on
      continue;
    }
    if (text[i] === '.' && isDigit(text[i + 1] ?? '')) {
      i++;
      while (i < text.length && isDigit(text[i])) i++;
    }
    numbers.push(Number(text.slice(start, i)));
  }
  return numbers;
}

/** Combining marks (matras, nukta, virama, ...) that must stay attached to the letter before them. */
export function isCombiningMark(cp: number): boolean {
  const inRange = (lo: number, hi: number) => cp >= lo && cp <= hi;
  return (
    inRange(0x0300, 0x036f) || // combining diacritics
    inRange(0x0900, 0x0903) || // Devanagari candrabindu, anusvara, visarga
    inRange(0x093a, 0x093c) || // Devanagari vowel signs, nukta
    inRange(0x093e, 0x094f) || // Devanagari matras, virama
    inRange(0x0951, 0x0957) || // Devanagari stress signs
    inRange(0x0962, 0x0963) || // Devanagari vocalic signs
    cp === 0x200c || // zero width non-joiner
    cp === 0x200d // zero width joiner
  );
}
