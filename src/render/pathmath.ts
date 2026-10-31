export type PathCommand = (string | number)[];
export interface Point {
  x: number;
  y: number;
}

/** Points along a quadratic Bezier (start, control, end), excluding the start. Used to measure a curve's ink box. */
export function quadraticPoints(p0: Point, c: Point, p1: Point, steps = 8): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const a = (1 - t) ** 2;
    const b = 2 * (1 - t) * t;
    const d = t * t;
    points.push({ x: a * p0.x + b * c.x + d * p1.x, y: a * p0.y + b * c.y + d * p1.y });
  }
  return points;
}

/** Points along a cubic Bezier (start, two controls, end), excluding the start. */
export function cubicPoints(p0: Point, c1: Point, c2: Point, p1: Point, steps = 12): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const a = (1 - t) ** 3;
    const b = 3 * (1 - t) ** 2 * t;
    const c = 3 * (1 - t) * t * t;
    const d = t ** 3;
    points.push({
      x: a * p0.x + b * c1.x + c * c2.x + d * p1.x,
      y: a * p0.y + b * c1.y + c * c2.y + d * p1.y,
    });
  }
  return points;
}

const round2 = (v: number) => String(Math.round(v * 100) / 100);

/** Path commands -> SVG path data, e.g. [['M', 1, 2], ['L', 3, 4]] -> "M1 2L3 4". */
export const pathToD = (path: PathCommand[]) =>
  path
    .map(
      (cmd) =>
        cmd[0] +
        cmd
          .slice(1)
          .map((v) => round2(v as number))
          .join(' '),
    )
    .join('');
