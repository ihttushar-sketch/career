#!/usr/bin/env node
/**
 * Turn every pending capture into its artefact:
 *   thinking shelf → Thinking Unit shell in worlds/<node>/
 *   case shelf     → case card in research/cases/
 *   business shelf → business-area card in business/
 *   note shelf     → stays put until you confirm where it belongs
 */
import { draftPending } from '../lib/draft.mjs';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : null;
};
const res = draftPending({ world: arg('world'), lane: arg('lane'), dry: process.argv.includes('--dry') });
const { made, skipped } = res;

if (!made.length) {
  console.log('nothing pending. Add a thought any time:  npm run intake -- --add --thought "…"');
} else {
  for (const m of made) {
    console.log(`✓ [${m.lane}${m.world ? ` · ${m.world}` : ''}] ${m.file}`);
  }
  console.log(`\n${made.length} artefact(s) written.`);
  console.log('Next for the author: fill NEEDS_AUTHOR_INPUT, add cross-links, then set status: approved and run npm run check:strict');
}
for (const s of skipped) console.log(`· skipped ${s.entry}: ${s.reason}`);
