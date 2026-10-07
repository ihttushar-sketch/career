#!/usr/bin/env node
/**
 * Open a node — or every node — so it can receive thinking.
 *
 *   node scripts/open-node.mjs --all
 *   node scripts/open-node.mjs --world money-thinking
 *
 * Writes worlds/<id>/PLAN.md (50 slots: his signed concepts, his drafts, his captures, and
 * the questions that are still his) and makes sure inbox/<id>/ exists. No belief is created here.
 */
import { planAll, buildPlan, writePlan } from '../lib/plan.mjs';
import { loadWorlds } from '../lib/content.mjs';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : null;
};

const only = arg('world');
const worlds = only ? [only] : loadWorlds().map((w) => w.id);
if (!worlds.length || (only && !loadWorlds().some((w) => w.id === only))) {
  console.error(`unknown world: ${only}`);
  process.exit(1);
}

console.log(`${'node'.padEnd(20)} ${'signed'.padStart(6)} ${'draft'.padStart(6)} ${'capture'.padStart(8)} ${'open'.padStart(6)}   graph demand`);
for (const id of worlds) {
  const p = only ? buildPlan(id) : null;
  if (only) writePlan(id);
  const c = p ? p.counts : planAll().find((x) => x.world === id);
  console.log(
    `${id.padEnd(20)} ${String(c.approved).padStart(6)} ${String(c.drafts).padStart(6)} ${String(c.pending).padStart(8)} ${String(c.open).padStart(6)}   ${c.reserved} concept(s) point here`,
  );
}
console.log('\nplan written: thinking-universe/worlds/<node>/PLAN.md  ·  inbox open at thinking-universe/inbox/<node>/');
