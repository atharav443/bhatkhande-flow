/**
 * Label Studio (BhatkhandeSet annotation schema) -> bandish JSON.
 * Reads the per-region attributes the annotators fill in (swar_type, variant, octave, bandish_part_swar,
 * line_number, matra_number = beat in the cycle, matra_fraction, sequence_in_matra, swar_id; lyric_text +
 * lyric_applies_to_swar_id; kan_swar_type/octave/variant + modifies_swar_id; khatka_bracket + modifies_swar_id)
 * and rebuilds the sections / lines / matras / events the renderer takes. Several pages (tasks) of one
 * bandish are concatenated in the order given.
 */
export interface LSRegionAttrs { label: string; x: number; y: number; [attr: string]: unknown }

const SWAR: Record<string, string> = { Sa: 'सा', Re: 'रे', Ga: 'ग', Ma: 'म', Pa: 'प', Dha: 'ध', Ni: 'नी' };
const OCT: Record<string, number> = { 'ati-mandra': -2, mandra: -1, madhya: 0, taar: 1, 'ati-taar': 2 };
const PART: Record<string, string> = { Sthayi: 'स्थायी', Antara: 'अन्तरा', Sanchari: 'संचारी', Abhog: 'आभोग' };

/** flatten one task's results into regions with their attributes */
export function regionsOfTask(task: any): LSRegionAttrs[] {
  const res = (task.annotations?.[0] ?? task.predictions?.[0])?.result ?? [];
  const by = new Map<string, LSRegionAttrs>();
  for (const r of res) {
    const reg = by.get(r.id) ?? ({ label: '', x: 0, y: 0 } as LSRegionAttrs);
    const v = r.value ?? {};
    if (v.rectanglelabels) { reg.label = v.rectanglelabels[0]; reg.x = v.x; reg.y = v.y; }
    else if (r.from_name) {
      const val = v.choices ?? v.number ?? v.text;
      reg[r.from_name] = Array.isArray(val) ? val[0] : val;
    }
    by.set(r.id, reg);
  }
  return [...by.values()].filter((r) => r.label);
}

export function labelStudioToBandish(tasks: any[], meta: { title?: string; raag?: string; taal?: string; label?: string } = {}): any {
  const first = tasks[0]?.data ?? {};
  const taal = meta.taal ?? first.taal;
  type Ev = { page: number; part: string; line: number; beat: number; seq: number; frac?: string; ev: any; y: number; x: number; id: number };
  const evs: Ev[] = [];
  tasks.forEach((task, page) => {
    const regs = regionsOfTask(task);
    const lyricOf = new Map<number, string>();
    for (const r of regs) if ((r.label === 'lyric' || r.label === 'lyric_rest') && r.lyric_applies_to_swar_id !== undefined) lyricOf.set(Number(r.lyric_applies_to_swar_id), String(r.lyric_text ?? 'ऽ'));
    const kanOf = new Map<number, LSRegionAttrs[]>();
    for (const r of regs) if (r.label === 'kan_swar' && r.modifies_swar_id !== undefined) {
      const k = Number(r.modifies_swar_id); (kanOf.get(k) ?? kanOf.set(k, []).get(k)!).push(r);
    }
    const khatka = new Set(regs.filter((r) => r.label === 'khatka_bracket').map((r) => Number(r.modifies_swar_id)));
    for (const r of regs) {
      if (r.label !== 'swar' && r.label !== 'swar_rest') continue;
      const id = Number(r.swar_id);
      let ev: any;
      if (r.label === 'swar_rest') ev = { type: 'extend' };
      else {
        ev = { swar: SWAR[String(r.swar_type)] ?? String(r.swar_type) };
        if (r.variant === 'komal') ev.komal = true;
        if (r.variant === 'tivra') ev.tivra = true;
        const o = OCT[String(r.octave ?? 'madhya')]; if (o) ev.octave = o;
        if (khatka.has(id)) ev.khatka = true;
        const kans = (kanOf.get(id) ?? []).sort((a, b) => a.x - b.x);
        if (kans.length) ev.kan = kans.map((k) => ({ swar: SWAR[String(k.kan_swar_type)], octave: OCT[String(k.kan_octave ?? 'madhya')] ?? 0, komal: k.kan_variant === 'komal', tivra: k.kan_variant === 'tivra' }));
      }
      const ly = lyricOf.get(Number(r.lyric_id_for_swar ?? id)) ?? lyricOf.get(id);
      if (ly !== undefined) ev.lyric = ly;
      const frac = r.matra_fraction ? String(r.matra_fraction) : undefined;
      if (frac) ev.duration = frac;
      evs.push({ page, part: String(r.bandish_part_swar ?? 'Sthayi'), line: Number(r.line_number ?? 1), beat: Number(r.matra_number), seq: Number(r.sequence_in_matra ?? 1), frac, ev, y: r.y, x: r.x, id });
    }
  });
  // reading order: page, then annotators' swar_id (reading order per page)
  evs.sort((a, b) => a.page - b.page || a.id - b.id);

  const sections: any[] = [];
  let sec: any, line: any, matra: any, lastKey = '', lastBeat = -1;
  for (const e of evs) {
    const partName = PART[e.part] ?? e.part;
    if (!sec || sec.name !== partName) { sec = { name: partName, startMatra: e.beat, lines: [] }; sections.push(sec); lastKey = ''; }
    const key = `${e.page}|${e.part}|${e.line}`;
    if (key !== lastKey) { line = { matras: [] }; sec.lines.push(line); lastKey = key; lastBeat = -1; }
    if (e.beat !== lastBeat || e.seq === 1) { matra = { index: e.beat, events: [] }; line.matras.push(matra); lastBeat = e.beat; }
    matra.events.push(e.ev);
  }
  return { metadata: { title: meta.title, raag: meta.raag ?? first.raag, taal, label: meta.label, source: tasks.map((t) => t.data?.source_file).filter(Boolean) }, sections };
}

/** True for a Label Studio task or list of tasks (each has `data` and `annotations` or `predictions`). */
export function isLabelStudio(j: any): boolean {
  const tasks = Array.isArray(j) ? j : [j];
  return tasks.length > 0 && tasks.every((x) => x && typeof x === 'object' && (x.predictions || x.annotations) && x.data);
}
