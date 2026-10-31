/**
 * Exact rational arithmetic for time inside a matra.
 *
 * VexFlow idea kept: time is NOT a float. VexFlow uses integer "ticks" (RESOLUTION=16384)
 * plus a Fraction class. Bhatkhande notation needs the same guarantee (1/2 + 1/3 + 1/6 === 1),
 * so we use reduced rationals directly - no resolution constant required.
 */
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export class Fraction {
  readonly n: number;
  readonly d: number;
  private constructor(n: number, d: number) {
    this.n = n;
    this.d = d;
  }

  static of(n: number, d = 1): Fraction {
    if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) throw new RangeError(`Invalid fraction ${n}/${d}`);
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d);
    return new Fraction(n / g, d / g);
  }

  /** Accepts 1, 0.5, "1/2", "0.25", "3/2". Decimals are snapped to the nearest simple rational (den <= maxDen). */
  static parse(v: number | string, maxDen = 96): Fraction {
    if (typeof v === 'string') {
      const s = v.trim();
      if (s.includes('/')) {
        const [a, b] = s.split('/');
        return Fraction.of(Number(a), Number(b));
      }
      v = Number(s);
    }
    if (!Number.isFinite(v)) throw new RangeError(`Invalid duration: ${v}`);
    if (Number.isInteger(v)) return Fraction.of(v);
    for (let den = 2; den <= maxDen; den++) {
      const num = Math.round(v * den);
      if (Math.abs(num / den - v) < 1e-6) return Fraction.of(num, den);
    }
    throw new RangeError(`Duration ${v} is not a simple rational (denominator > ${maxDen})`);
  }

  add(o: Fraction): Fraction { return Fraction.of(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o: Fraction): Fraction { return Fraction.of(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o: Fraction): Fraction { return Fraction.of(this.n * o.n, this.d * o.d); }
  div(o: Fraction): Fraction { return Fraction.of(this.n * o.d, this.d * o.n); }
  cmp(o: Fraction): number { return this.n * o.d - o.n * this.d; }
  eq(o: Fraction): boolean { return this.cmp(o) === 0; }
  lt(o: Fraction): boolean { return this.cmp(o) < 0; }
  le(o: Fraction): boolean { return this.cmp(o) <= 0; }
  gt(o: Fraction): boolean { return this.cmp(o) > 0; }
  ge(o: Fraction): boolean { return this.cmp(o) >= 0; }
  isZero(): boolean { return this.n === 0; }
  toNumber(): number { return this.n / this.d; }
  toString(): string { return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`; }
}

export const ZERO = Fraction.of(0);
export const ONE = Fraction.of(1);
