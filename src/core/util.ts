export class RuntimeError extends Error {
  constructor(public code: string, message = '') { super(`[${code}] ${message}`); this.name = 'RuntimeError'; }
}
export function defined<T>(x: T | undefined | null, code = 'undefined', message = 'value is undefined'): T {
  if (x === undefined || x === null) throw new RuntimeError(code, message);
  return x;
}
export const sum = (a: number[]) => a.reduce((p, c) => p + c, 0);
