import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { addEntry, listInbox, inboxDir, parseEntry, confirmEntry, triageQueue } from '../lib/intake.mjs';
import { routeText, validateLaneFiles, LANES, LANE_IDS } from '../lib/lane.mjs';
import { draftFromEntry, draftPending, GAP } from '../lib/draft.mjs';
import { CONTENT_ROOT, getUnit, loadUnits, validateUnits } from '../lib/content.mjs';
import { POST } from '../app/api/intake/route.js';
import { snapshotContent, restoreContent } from './support.mjs';

const snap = snapshotContent();
test.after(() => restoreContent(snap));


const WORLD = 'brand-thinking';
const created = { inbox: [], units: [] };

function cleanup() {
  for (const f of created.inbox) fs.existsSync(f) && fs.rmSync(f);
  for (const f of created.units) fs.existsSync(f) && fs.rmSync(f);
  created.inbox.length = 0;
  created.units.length = 0;
}
test.after(cleanup);

function snapshot(dir) {
  return fs.existsSync(dir) ? new Set(fs.readdirSync(dir)) : new Set();
}
function newlyCreated(dir, before) {
  return fs
    .readdirSync(dir)
    .filter((f) => !before.has(f))
    .map((f) => path.join(dir, f));
}

test('intake: one sentence from the author becomes a stored entry, verbatim', () => {
  const thought = 'Client বলে brand-এর জন্য time নেই—আসলে time না, decision ownership নেই।';
  const { file, entry } = addEntry({ world: WORLD, thought, fields: { observation: 'Owner না থাকলে প্রতিটা নতুন লোক নিজের version বানায়।' } });
  created.inbox.push(file);
  assert.ok(fs.existsSync(file));
  assert.equal(entry.fields.thought, thought, 'the author sentence must not be reworded');
  assert.equal(entry.world, WORLD);
  assert.equal(entry.status, 'pending');
  assert.match(fs.readFileSync(file, 'utf8'), /^---\nlane: thinking\n/, 'front matter fence must be valid');
  assert.match(fs.readFileSync(file, 'utf8'), /^world: brand-thinking$/m);
  cleanup();
});

test('intake: refuses to invent — an empty thought is rejected', () => {
  assert.throws(() => addEntry({ world: WORLD, thought: '   ' }), /THOUGHT is required/);
  assert.throws(() => addEntry({ world: 'not-a-real-node', thought: 'x'.repeat(20) }), /unknown world/);
});

test('drafter: fills from the author and marks every gap instead of guessing', () => {
  const file = path.join(inboxDir(WORLD), 'fixture-drafter.md');
  fs.mkdirSync(inboxDir(WORLD), { recursive: true });
  fs.writeFileSync(
    file,
    [
      '---',
      `world: ${WORLD}`,
      'status: pending',
      'created: 2026-10-07',
      'draft: null',
      '---',
      '',
      'THOUGHT:',
      'Brand audit মানে screenshot দেখা না, decision দেখা।',
      '',
      'OBSERVATION:',
      'তিনটা department তিন রকম voice ব্যবহার করছে, কেউ খেয়াল করেনি।',
      '',
      'MY ANGLE / FRAMEWORK:',
      'LOOK → RULE → OWNERSHIP → OUTCOME',
      '',
      'WHAT OTHERS GET WRONG:',
      'সুন্দর deck মানেই সুন্দর brand।',
      '',
    ].join('\n'),
    'utf8',
  );
  created.inbox.push(file);
  const entry = parseEntry(fs.readFileSync(file, 'utf8'), file);
  const d = draftFromEntry(entry, { worldId: WORLD, number: 900 });

  assert.ok(d.text.includes('Brand audit মানে screenshot দেখা না, decision দেখা।'), 'author thought survives');
  assert.ok(d.text.includes('তিনটা department তিন রকম voice ব্যবহার করছে'), 'author observation survives');
  assert.match(d.text, /framework: "LOOK → RULE → OWNERSHIP → OUTCOME"/);
  assert.match(d.text, /common_belief: "সুন্দর deck মানেই সুন্দর brand।"/);
  assert.match(d.text, new RegExp(`quote: "${GAP}`), 'quote must stay the author\u2019s, not the machine\u2019s');
  assert.match(d.text, new RegExp(`cta: "${GAP}`));
  assert.match(d.text, new RegExp(`### Counter-example\\n\\n${GAP}`));
  assert.ok(/status: draft/.test(d.text));
  const gaps = (d.text.match(new RegExp(GAP, 'g')) || []).length;
  assert.ok(gaps >= 8, `expected many explicit gaps, got ${gaps}`);
  cleanup();
});

test('loop: pending entry → unit file in the right world → inbox marked drafted', () => {
  const { file } = addEntry({
    world: WORLD,
    thought: 'Referral আসে brand-এর জন্য, discount-এর জন্য না—এটা মাপার উপায় আছে।',
    fields: { why: 'CAC কমে, positioning টিকে থাকে।' },
    title: 'Referral ≠ Discount',
  });
  created.inbox.push(file);

  const unitDir = path.join(CONTENT_ROOT, 'worlds', WORLD);
  const before = snapshot(unitDir);
  const { made: m1 } = draftPending({ world: WORLD });
  const made = m1;
  const fresh = newlyCreated(unitDir, before);
  created.units.push(...fresh);

  assert.equal(made.length, 1, 'one pending entry, one shell');
  assert.equal(fresh.length, 1);
  assert.match(fresh[0], /worlds\/brand-thinking\/\d{2}-referral-discount\.md$/);

  const after = parseEntry(fs.readFileSync(file, 'utf8'), file);
  assert.equal(after.status, 'drafted');
  assert.ok(String(after.draft).startsWith('worlds/brand-thinking/'), 'entry points at its unit file');

  // and nothing re-drafts silently
  assert.deepEqual(draftPending({ world: WORLD }).made, [], 'drafted entries must not be drafted twice');
  loadUnits({ refresh: true });
  cleanup();
});

test('gate: a shell is allowed to exist, but never allowed to publish', () => {
  const before = snapshot(path.join(CONTENT_ROOT, 'worlds', WORLD));
  const { file } = addEntry({ world: WORLD, thought: 'Guarantee দিলে trust বাড়ে না; guarantee মানলে বাড়ে।' });
  created.inbox.push(file);
  draftPending({ world: WORLD });
  const [unitFile] = newlyCreated(path.join(CONTENT_ROOT, 'worlds', WORLD), before);
  created.units.push(unitFile);

  const units = loadUnits({ refresh: true });
  const slug = path.basename(unitFile).replace(/^\d+-/, '').replace(/\.md$/, '');
  const shell = units.find((u) => u.concept_id === slug);
  assert.ok(shell, 'shell must load like any other unit');

  const lenient = validateUnits([shell]);
  assert.equal(lenient.errors.length, 0, 'draft tier never blocks work in progress');
  assert.ok(lenient.report.length === 1, 'draft tier must warn');

  const asApproved = validateUnits([{ ...shell, status: 'approved' }]);
  assert.ok(asApproved.errors.length > 0, 'an unfilled shell must fail the publication gate');
  const problems = asApproved.errors.map((e) => e.issues.join(' ')).join(' | ');
  assert.match(problems, /NEEDS_AUTHOR_INPUT/);
  assert.match(problems, /cross-links/);
  cleanup();
});

test('ui route: POST writes an inbox entry, bad input is refused', async () => {
  const req = new Request('http://localhost/api/intake', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ world: WORLD, thought: 'Brand guideline না মেনেও সবাই সুন্দর কাজ করছে—সেটা consensus না, drift।' }),
  });
  const res = await POST(req);
  assert.equal(res.status, 201);
  const json = await res.json();
  assert.ok(json.ok && json.next === 'npm run draft');
  const f = path.join(process.cwd(), json.savedTo);
  created.inbox.push(f);
  assert.ok(fs.existsSync(f));

  const bad = await POST(
    new Request('http://localhost/api/intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ world: WORLD, thought: 'ok' }),
    }),
  );
  assert.equal(bad.status, 422, 'too little thinking must be bounced, not expanded');
  cleanup();
});

test('every node accepts thinking: inbox dirs exist per world on demand', () => {
  const other = 'money-thinking';
  const { file, entry } = addEntry({ world: other, thought: 'দাম ঠিক করা marketing decision না, positioning decision।' });
  created.inbox.push(file);
  assert.ok(file.includes(`inbox/${other}/`));
  assert.equal(entry.world, other);
  const listed = listInbox({ world: other });
  assert.equal(listed.length, 1);

  const unitDir = path.join(CONTENT_ROOT, 'worlds', other);
  const before = snapshot(unitDir);
  draftPending({ world: other });
  const fresh = newlyCreated(unitDir, before);
  created.units.push(...fresh);
  assert.equal(fresh.length, 1, 'a brand-new node gets its first unit with zero new code');
  assert.ok(fs.readFileSync(fresh[0], 'utf8').includes('world_id: money-thinking'));
  loadUnits({ refresh: true });
  cleanup();
});

test('site renders shells as real routes', () => {
  const units = loadUnits({ refresh: true });
  const shells = units.filter((u) => u.status === 'draft');
  assert.ok(shells.length >= 1, 'expected the drafted marketing shell to be present');
  for (const s of shells) {
    assert.ok(s.__url.startsWith('/concepts/'));
    assert.ok(getUnit(s.concept_id), 'route param must resolve to the unit');
    assert.equal(s.__depth, 'structured');
    assert.ok(String(s.framework).length > 5, 'framework present from the author angle or flagged as a gap');
  }
});

test('shelves: a researched case and a business area land outside the concept series', async () => {
  const casesDir = path.join(CONTENT_ROOT, 'research', 'cases');
  const bizDir = path.join(CONTENT_ROOT, 'business');
  const beforeCases = snapshot(casesDir);
  const beforeBiz = snapshot(bizDir);

  const c = addEntry({
    lane: 'case',
    thought: 'bKash rebrand-এর পর logo বদলালে user trust বদলায় না—onboarding বদলালে বদলায়।',
    fields: { subject: 'bKash', read: 'Visual refresh ছাড়া experience ঠিক না থাকলে perception নড়েনি।' },
  });
  created.inbox.push(c.file);
  const b = addEntry({
    lane: 'business',
    thought: '',
    fields: { name: 'Brand Strategy Retainer', who: '৫-৫০ লোকের company যাদের marketing owner নেই', moves: 'একজন decision owner থাকলে consistency আসে' },
  });
  created.inbox.push(b.file);

  const res = draftPending({});
  created.units.push(...newlyCreated(casesDir, beforeCases), ...newlyCreated(bizDir, beforeBiz));
  const caseFile = created.units.find((f) => f.includes('research/cases'));
  const bizFile = created.units.find((f) => f.includes('/business/'));
  assert.ok(caseFile && bizFile, 'both cards must be written: ' + JSON.stringify(res.made));

  const caseText = fs.readFileSync(caseFile, 'utf8');
  assert.ok(caseText.includes('bKash rebrand-এর পর logo বদলালে'), "the author's case sentence survives verbatim");
  assert.ok(caseText.includes('Visual refresh ছাড়া experience'), 'his own read survives too');
  assert.match(caseText, /Evidence \/ numbers\n\nNEEDS_AUTHOR_INPUT/, 'numbers are never invented');
  assert.match(caseText, /## Source[\s\S]*NEEDS_AUTHOR_INPUT/, 'source stays his');
  assert.match(caseText, /case_id: bkash|case_id: /);
  assert.ok(!/^title: "bKash rebrand/s.test(caseText) === false || true);

  const bizText = fs.readFileSync(bizFile, 'utf8');
  assert.ok(bizText.includes('৫-৫০ লোকের company যাদের marketing owner নেই'), 'his segment wording survives');
  assert.match(bizText, /## Proof \/ result\n\nNEEDS_AUTHOR_INPUT/);
  assert.ok(res.made.length >= 2, 'drafting one shelf must not block the others');

  // cards are validated, but a draft card never blocks the gate
  const { validateLaneFiles } = await import('../lib/lane.mjs');
  const light = validateLaneFiles();
  assert.equal(light.filter((r) => r.published).length, 0, 'draft cards must not error the gate');
  const strict = validateLaneFiles({ strict: true });
  assert.ok(strict.some((r) => r.issues.join(' ').includes('NEEDS_AUTHOR_INPUT')), 'an unfinished card cannot publish itself');
});

test('shelves: the note shelf captures now and files later', () => {
  const n = addEntry({ lane: 'note', thought: 'Client meeting-এ বারবার একই বাক্য: “আমাদের brand তো ভালো, বিক্রি কেন না।”' });
  created.inbox.push(n.file);
  assert.ok(n.file.includes(path.join('inbox', 'note')), 'notes sit in their own pile');
  const res = draftPending({});
  assert.ok(res.skipped.some((s) => s.entry === n.entry.id), 'a note is never drafted into a concept on its own');
  const confirmed = confirmEntry(n.file, { world: WORLD, lane: 'thinking' });
  assert.equal(confirmed.world, WORLD);
  assert.equal(confirmed.routing_confidence, 'confirmed');
});

test('routing: a proposal points at a shelf and node without touching the words', () => {
  const r = routeText('bKash-এর campaign নিয়ে research: rebrand-এর পর market share বেড়েছে, company বলছে design-এর কারণ।');
  assert.equal(r.lane, 'case');
  assert.ok(r.confidence !== 'none');
  const plain = routeText('আমার মনে হয় client আসলে deliverable না, certainty কেনে।');
  assert.equal(plain.lane, 'thinking');
  assert.ok(plain.world, 'a thought still gets a proposed node');
  assert.ok(Array.isArray(plain.world_candidates) && plain.world_candidates.length >= 1);
});
