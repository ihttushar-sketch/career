#!/usr/bin/env node
/**
 * Terminal door into any node — the author never has to touch JS to add perception.
 *
 *   node scripts/intake.mjs --list
 *   node scripts/intake.mjs --new --world brand-thinking          # prints a template to edit
 *   node scripts/intake.mjs --add --world brand-thinking \
 *        --thought "মানুষ Product কেনে না, সমাধান কেনে।" \
 *        --angle "FEATURE → FUNCTION → FEELING → IDENTITY"
 *   npm run draft                                                 # pending → Thinking Unit shells
 */
import fs from 'node:fs';
import path from 'node:path';
import { addEntry, listInbox, intakeStats, inboxDir, template } from '../lib/intake.mjs';
import { draftPending } from '../lib/draft.mjs';

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const flag = (name) => process.argv.includes(`--${name}`);

const world = arg('world', 'brand-thinking');

if (flag('new')) {
  console.log(`# paste into ${path.relative(process.cwd(), path.join(inboxDir(world), '<date>-<slug>.md'))}\n`);
  console.log(template(world));
} else if (flag('add')) {
  const fields = {
    observation: arg('observe'),
    angle: arg('angle'),
    wrong: arg('wrong'),
    why: arg('why'),
    example: arg('example'),
  };
  const { file, entry } = addEntry({ world, thought: arg('thought'), fields, title: arg('title'), hook: arg('hook') });
  console.log(`✓ saved ${path.relative(process.cwd(), file)}`);
  console.log(`  next: npm run draft   (creates the unit shell, then you fill NEEDS_AUTHOR_INPUT)`);
  void entry;
} else if (flag('draft')) {
  const made = draftPending({ world: flag('all') ? null : world, dry: flag('dry') });
  if (!made.length) console.log('nothing pending — inbox is empty for this world');
  for (const m of made) console.log(`✓ [${m.world}] ${m.file}\n    “${m.title}” — shell written, NEEDS_AUTHOR_INPUT marks your homework`);
} else {
  const s = intakeStats();
  console.log(`inbox: ${s.pending} pending · ${s.drafted} drafted · ${s.total} total\n`);
  for (const w of s.byWorld) {
    if (!w.pending && !w.drafted && !w.live) continue;
    console.log(`${w.id.padEnd(20)} units ${String(w.units).padStart(2)}/${w.target}  pending ${w.pending}  drafted ${w.drafted}${w.live ? '' : '  (node not opened yet)'}`);
  }
  const entries = listInbox({ status: 'pending' });
  if (entries.length) {
    console.log('\npending thoughts:');
    for (const e of entries) console.log(`  · [${e.world}] ${e.id}\n      ${(e.fields.thought || '').replace(/\s+/g, ' ').slice(0, 90)}`);
  }
  void flag;
}
