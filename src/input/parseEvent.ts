import { splitList } from '../core/text.js';
import { canBeKomal, canBeTivra, parseOctave, parseSwarText } from '../music/swar.js';
import { parseDuration, pick, truthy } from './looseValues.js';
import type { Diagnostic, EventModel, KanNote, SwarEvent } from './types.js';

/** kan-inside-kan is supported one level deep: swar -> kan -> kan. Anything deeper is dropped with a warning. */
export const MAX_KAN_DEPTH = 2;

function parseKan(raw: unknown, diags: Diagnostic[], path: string, depth = 1): KanNote[] {
  if (raw === undefined || raw === null || raw === '') return [];
  if (depth > MAX_KAN_DEPTH) {
    diags.push({
      level: 'warn',
      code: 'kan.depth',
      message: `kan nested deeper than ${MAX_KAN_DEPTH} levels; ignored`,
      path,
    });
    return [];
  }
  const arr = Array.isArray(raw) ? raw : typeof raw === 'string' ? splitList(raw) : [raw];
  const out: KanNote[] = [];
  for (const k of arr) {
    const o: any = typeof k === 'string' ? { text: k } : k;
    const p = parseSwarText(String(pick(o, 'swar', 'text', 'degree') ?? ''));
    if (!p) {
      diags.push({
        level: 'warn',
        code: 'kan.unknown',
        message: `Unknown kan swar ${JSON.stringify(k)}`,
        path,
      });
      continue;
    }
    const nested =
      typeof o === 'object' && o.kan !== undefined ? parseKan(o.kan, diags, path, depth + 1) : [];
    out.push({
      degree: p.degree,
      octave: parseOctave(o.octave) ?? p.octaveHint ?? 0,
      komal: (truthy(o.komal) || !!p.komal) && canBeKomal(p.degree),
      tivra: (truthy(o.tivra) || !!p.tivra) && canBeTivra(p.degree),
      ...(nested.length ? { kan: nested } : {}),
    });
  }
  return out;
}

export function parseEvent(raw: any, diags: Diagnostic[], path: string): EventModel | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === 'string') {
    const s = raw.trim();
    // Bhatkhande: a dash in the swar line means the previous swar is held through this (part of a) matra
    if (s === '-' || s === '–' || s === '—' || s === 'ऽ' || s === '_' || s === '~') return { type: 'extend' };
    if (s === 'rest' || s === '0' || s === ',') return { type: 'rest' };
    raw = { swar: s };
  }
  const type = raw.type ?? (pick(raw, 'swar', 'text', 'degree', 'name') !== undefined ? 'swar' : undefined);
  const duration = parseDuration(raw.duration, diags, path);
  const lyric =
    raw.lyric === undefined || raw.lyric === null
      ? undefined
      : String(typeof raw.lyric === 'object' ? (raw.lyric.text ?? '') : raw.lyric);
  const id = raw.id !== undefined ? String(raw.id) : undefined;
  if (type === 'rest') return { type: 'rest', id, duration, lyric };
  if (type === 'extend') return { type: 'extend', id, duration, lyric };
  if (type !== 'swar') {
    diags.push({ level: 'error', code: 'event.type', message: `Unknown event ${JSON.stringify(raw)}`, path });
    return undefined;
  }

  const text = String(pick(raw, 'swar', 'text', 'degree', 'name') ?? '');
  const p = parseSwarText(text);
  if (!p) {
    diags.push({
      level: 'error',
      code: 'swar.unknown',
      message: `Unrecognised swar "${text}" - rendered as a rest`,
      path,
    });
    return { type: 'rest', id, duration, lyric };
  }
  let komal = truthy(raw.komal) || !!p.komal;
  let tivra = truthy(raw.tivra) || !!p.tivra;
  if (komal && !canBeKomal(p.degree)) {
    diags.push({
      level: 'warn',
      code: 'swar.komal',
      message: `${p.degree} cannot be komal; flag ignored`,
      path,
    });
    komal = false;
  }
  if (tivra && !canBeTivra(p.degree)) {
    diags.push({
      level: 'warn',
      code: 'swar.tivra',
      message: `${p.degree} cannot be tivra; flag ignored`,
      path,
    });
    tivra = false;
  }
  const meend =
    raw.meend === 'start' || raw.meend === 'end' || raw.meend === 'both'
      ? raw.meend
      : raw['meend-start'] && raw['meend-end']
        ? 'both'
        : truthy(raw['meend-start'])
          ? 'start'
          : truthy(raw['meend-end'])
            ? 'end'
            : undefined;
  const ev: SwarEvent = {
    type: 'swar',
    id,
    degree: p.degree,
    octave: parseOctave(raw.octave) ?? p.octaveHint ?? 0,
    komal,
    tivra,
    duration,
    lyric,
    kan: parseKan(raw.kan, diags, path),
    meend,
    khatka: truthy(raw.khatka) || truthy(raw.murki) || undefined,
  };
  return ev;
}
