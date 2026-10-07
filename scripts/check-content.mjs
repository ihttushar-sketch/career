#!/usr/bin/env node
/**
 * Content gate for the Thinking Universe.
 *
 * Two tiers, because the shelves hold work in progress on purpose:
 *   default  → units in `idea`/`draft` may be unfinished; anything approved must be complete
 *   --strict → every unit and every card must satisfy the full publication contract
 *
 * Cases and business areas are checked too: a card that claims a fact needs the author's
 * evidence, source and node link before it can be cited by a concept.
 */
import { loadUnits, validateUnits, stats } from '../lib/content.mjs';
import { validateLaneFiles, loadCases, loadBusinessAreas } from '../lib/lane.mjs';

const strict = process.argv.includes('--strict');
const units = loadUnits();
const gate = validateUnits(units, { strict });
const s = stats();

const cards = validateLaneFiles({ strict });
const cases = loadCases();
const biz = loadBusinessAreas();

for (const r of gate.report) {
  console.log(`${r.level === 'error' ? '✗' : '·'} ${r.id}\n    ${r.issues.join('\n    ')}`);
}
for (const c of cards) {
  console.log(`${c.published ? '✗' : '·'} ${c.kind}:${c.id}\n    ${c.issues.join('\n    ')}`);
}
const cardErrors = cards.filter((c) => c.published);

console.log(
  `\n${units.length} units · ${s.words.toLocaleString()} words · ${s.edges} links (${s.crossEdges} cross-world) · ${gate.errors.length} error(s) · ${gate.warns.length} warning(s)`,
);
console.log(
  `${cases.length} case card(s) · ${biz.length} business area(s) · ${cardErrors.length} card error(s)${strict ? ' [strict: every shelf must be publication-depth]' : ''}`,
);

if (!gate.ok || cardErrors.length) {
  console.error(`\ncontent contract failed${strict ? ' (strict)' : ''}`);
  process.exit(1);
}
console.log('content contract satisfied — units and cards');
