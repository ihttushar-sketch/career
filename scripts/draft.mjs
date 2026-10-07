#!/usr/bin/env node
/** Turn every pending intake entry into a Thinking Unit shell. */
import { draftPending } from '../lib/draft.mjs';

const worldIdx = process.argv.indexOf('--world');
const world = worldIdx > -1 ? process.argv[worldIdx + 1] : null;
const made = draftPending({ world, dry: process.argv.includes('--dry') });
if (!made.length) {
  console.log('nothing pending. Add a thought: npm run intake -- --add --world brand-thinking --thought "…".');
} else {
  for (const m of made) console.log(`✓ [${m.world}] ${m.file}  →  “${m.title}”`);
  console.log(`\n${made.length} shell(s) written. Next for the author: fill NEEDS_AUTHOR_INPUT in each file, add 2 cross-links, then set status: approved and run npm run check:strict`);
}
