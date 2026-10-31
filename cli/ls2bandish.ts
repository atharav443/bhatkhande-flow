// Convert Label Studio exports into one bandish JSON file.
//
// Usage:
//   npx tsx cli/ls2bandish.ts <out.json> "<title>" <page1.json> [page2.json ...]
//
// Each page file is a Label Studio export: one task, or a list of tasks. Pages are joined in the
// order given, so a bandish spread over two scanned pages becomes one file.
//
// You only need this to inspect or edit the bandish the engine builds. `npm run render` reads a
// Label Studio export directly.

import { readFileSync, writeFileSync } from 'node:fs';
import { labelStudioToBandish } from '../src/input/fromLabelStudio';

const USAGE = 'usage: npx tsx cli/ls2bandish.ts <out.json> "<title>" <page1.json> [page2.json ...]';

const [outFile, title, ...pageFiles] = process.argv.slice(2);
if (!outFile || pageFiles.length === 0) {
  console.error(USAGE);
  process.exit(1);
}

/** All tasks from one export file (an export is a single task or a list of tasks). */
function readTasks(file: string): unknown[] {
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  return Array.isArray(parsed) ? parsed : [parsed];
}

const tasks = pageFiles.flatMap(readTasks);
const bandish = labelStudioToBandish(tasks, { title });

writeFileSync(outFile, JSON.stringify(bandish, null, 1));
console.log(`${outFile}: ${tasks.length} page(s)`);
