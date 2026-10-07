#!/usr/bin/env node
/**
 * Content gate for the Thinking Universe. Fails the build when a Thinking Unit
 * breaks the schema contract. Run with --strict to require publication depth everywhere.
 */
import { loadUnits, validateUnits, stats } from '../lib/content.mjs';

const strict = process.argv.includes('--strict');
const units = loadUnits();
const gate = validateUnits(units, { strict });
const s = stats();

for (const r of gate.report) {
  console.log(`${r.level === 'error' ? '✗' : '·'} ${r.id}\n    ${r.issues.join('\n    ')}`);
}
console.log(
  `\n${units.length} units · ${s.words.toLocaleString()} words · ${s.edges} links (${s.crossEdges} cross-world) · ${gate.errors.length} error(s) · ${gate.warns.length} warning(s)`,
);
if (!gate.ok) {
  console.error(`\ncontent contract failed${strict ? ' (strict)' : ''}`);
  process.exit(1);
}
console.log('content contract satisfied');
