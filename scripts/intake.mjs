#!/usr/bin/env node
/**
 * The author's door — four shelves, one inbox, no code required.
 *
 *   npm run intake                                     # what is waiting, per shelf and per node
 *   npm run intake -- --add --thought "…"              # just think; the shelf is proposed for you
 *   npm run intake -- --add --lane case --thought "…"  # a researched case
 *   npm run intake -- --add --lane business --thought "…"
 *   npm run intake -- --add --world marketing-thinking --thought "…"   # explicit node
 *   npm run intake -- --add --from /tmp/note.txt        # dump a plain text file
 *   npm run intake -- --triage                         # pending captures + proposed shelf
 *   npm run intake -- --confirm <file> --world brand-thinking
 *   npm run intake -- --new --lane case                # printable template for any shelf
 *   npm run draft                                      # everything pending → artefacts
 */
import fs from 'node:fs';
import path from 'node:path';
import { addEntry, listInbox, intakeStats, inboxDir, template, triageQueue, confirmEntry, LANES, LANE_IDS } from '../lib/intake.mjs';
import { draftPending } from '../lib/draft.mjs';

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const flag = (name) => process.argv.includes(`--${name}`);

const world = arg('world', 'auto');
const lane = arg('lane', flag('case') ? 'case' : flag('business') ? 'business' : flag('note') ? 'note' : 'thinking');
const rel = (f) => path.relative(process.cwd(), f);

function reportDraft(res) {
  const { made, skipped } = res;
  if (!made.length) console.log('nothing pending — inbox is clear');
  for (const m of made) {
    console.log(`✓ [${m.lane}${m.world ? ` · ${m.world}` : ''}] ${m.file}`);
    console.log(`    “${m.title}” — shell written, NEEDS_AUTHOR_INPUT marks your homework`);
  }
  for (const s of skipped) console.log(`· skipped ${s.entry}: ${s.reason}`);
  if (made.length) {
    console.log(`\n${made.length} artefact(s). Your words are already in them; the gaps are questions, not content.`);
  }
}

if (flag('new')) {
  console.log(`# paste into ${rel(path.join(lane === 'thinking' ? inboxDir(world === 'auto' ? 'unfiled' : world) : path.join(path.dirname(inboxDir('thinking')), lane), '<date>-<slug>.md'))}\n`);
  console.log(template(world === 'auto' ? 'brand-thinking' : world, lane));
} else if (flag('add')) {
  const fields = {
    observation: arg('observe'),
    angle: arg('angle'),
    wrong: arg('wrong'),
    why: arg('why'),
    example: arg('example'),
    subject: arg('subject') || arg('company'),
    what: arg('what'),
    did: arg('did'),
    evidence: arg('evidence'),
    read: arg('read'),
    proves: arg('proves'),
    source: arg('source'),
    name: arg('name'),
    who: arg('who'),
    before: arg('before'),
    moves: arg('moves'),
    role: arg('role'),
    proof: arg('proof'),
    price: arg('price'),
  };
  let thought = arg('thought');
  const from = arg('from');
  if (from) {
    const raw = fs.readFileSync(from, 'utf8');
    thought = thought || raw.split('\n').filter(Boolean).slice(0, 1).join(' ');
    const labelled = {};
    let cur = null;
    for (const line of raw.split('\n')) {
      const m = /^([A-Za-z /&'-]{3,}):\s*(.*)$/.exec(line.trim());
      if (m) {
        cur = m[1].toUpperCase().replace(/\s+/g, ' ');
        const key = Object.entries({
          OBSERVATION: 'observation',
          'MY ANGLE / FRAMEWORK': 'angle',
          'WHAT OTHERS GET WRONG': 'wrong',
          'WHY IT MATTERS': 'why',
          TITLE: 'title',
          HOOK: 'hook',
          'REAL EXAMPLE': 'example',
          'WHAT HAPPENED': 'what',
          'MY READ': 'read',
          COMPANY: 'subject',
        }).find(([l]) => l === cur)?.[1];
        if (key && m[2]) labelled[key] = m[2];
      } else if (cur && line.trim() && labelled[Object.keys(labelled).slice(-1)[0]] !== undefined) {
        const last = Object.keys(labelled).slice(-1)[0];
        labelled[last] += ` ${line.trim()}`;
      }
    }
    Object.entries(labelled).forEach(([k, v]) => (fields[k] = fields[k] || v));
  }

  const out = addEntry({ world, lane, thought, fields, title: arg('title'), hook: arg('hook') });
  console.log(`✓ saved ${rel(out.file)}`);
  console.log(`  shelf: ${out.lane}   node: ${out.world || 'unfiled (confirm at triage)'}`);
  if (out.proposal) {
    console.log(`  filing proposal: ${out.proposal.lane}${out.proposal.world ? ` / ${out.proposal.world}` : ''} · confidence ${out.proposal.confidence}${out.proposal.lane_why?.length ? ` (${out.proposal.lane_why.slice(0, 2).join(', ')})` : ''}`);
    if (out.proposal.needs_confirm) console.log(`  → confirm: npm run intake -- --confirm ${rel(out.file)} --world <node> --lane <${LANE_IDS.join('|')}>`);
  }
  console.log(`  next: npm run draft`);
} else if (flag('triage')) {
  const q = triageQueue();
  if (!q.length) console.log('nothing to triage — every capture is filed.');
  else {
    console.log(`triage queue: ${q.length} capture(s) waiting\n`);
    for (const item of q) {
      console.log(`${item.file}`);
      console.log(`  shelf ${item.lane} · node ${item.world}${item.proposed_world && item.proposed_world !== item.world ? ` (proposed ${item.proposed_world})` : ''} · ${item.confidence || 'no proposal'}${item.why ? ` · ${item.why}` : ''}`);
      console.log(`  “${item.preview}”`);
      console.log('');
    }
    console.log('confirm a shelf:  npm run intake -- --confirm <file> --world <node> --lane <shelf>');
    console.log('draft them all :  npm run draft');
  }
} else if (flag('confirm')) {
  const target = arg('confirm');
  const file = path.isAbsolute(target) ? target : path.resolve(process.cwd(), target);
  if (!fs.existsSync(file)) {
    console.error(`no such capture: ${target}`);
    process.exit(1);
  }
  const e = confirmEntry(file, { world: arg('world'), lane: arg('lane') });
  console.log(`✓ filed as ${e.lane || 'thinking'}${e.world ? ` / ${e.world}` : ''} — words untouched`);
  console.log('  next: npm run draft');
} else if (flag('draft')) {
  reportDraft(draftPending({ world: world === 'auto' ? null : world, lane: arg('lane'), dry: flag('dry') }));
} else {
  const s = intakeStats();
  console.log(`inbox: ${s.pending} pending · ${s.drafted} drafted · ${s.total} total\n`);
  console.log('shelves:');
  for (const l of s.byLane) console.log(`  ${l.label.padEnd(16)} ${String(l.pending).padStart(2)} pending${l.drafted ? ` · ${l.drafted} drafted` : ''}   — ${LANES[l.lane].one_line}`);
  console.log('\nnodes:');
  for (const w of s.byWorld) {
    if (!w.pending && !w.drafted && !w.live) continue;
    console.log(`  ${w.id.padEnd(20)} units ${String(w.units).padStart(2)}/${w.target}  pending ${w.pending}  drafted ${w.drafted}${w.live ? '' : '  (node not opened yet)'}`);
  }
  const entries = listInbox({ status: 'pending' });
  if (entries.length) {
    console.log('\nwaiting for you:');
    for (const e of entries) console.log(`  · [${e.lane || 'thinking'} · ${e.world}] ${e.id}\n      ${(e.fields.thought || e.fields.what || e.fields.name || '').replace(/\s+/g, ' ').slice(0, 90)}`);
  }
}
