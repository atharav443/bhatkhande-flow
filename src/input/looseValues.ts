import { Fraction } from '../core/fraction.js';
import type { Diagnostic } from './types.js';

/** Helpers for reading loose, user-written input. */
export const truthy = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1';
export const pick = (o: any, ...keys: string[]) => {
  for (const k of keys) if (o && o[k] !== undefined) return o[k];
  return undefined;
};

export function parseDuration(v: unknown, diags: Diagnostic[], path: string): Fraction | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  try {
    const f = Fraction.parse(v as any);
    if (f.le(Fraction.of(0))) throw new RangeError('duration must be > 0');
    return f;
  } catch (e) {
    diags.push({ level: 'error', code: 'duration.invalid', message: String((e as Error).message), path });
    return undefined;
  }
}
