import { readFileSync, writeFileSync } from 'node:fs';
import { labelStudioToBandish } from '../src/input/fromLabelStudio';

/** usage: tsx cli/ls2bandish.ts out.json "<title>" page1_labelstudio.json [page2 ...] */
const [out, title, ...pages] = process.argv.slice(2);
const tasks = pages.flatMap((p) => { const d = JSON.parse(readFileSync(p, 'utf8')); return Array.isArray(d) ? d : [d]; });
writeFileSync(out, JSON.stringify(labelStudioToBandish(tasks, { title }), null, 1));
console.log(`${out}: ${tasks.length} page(s)`);
