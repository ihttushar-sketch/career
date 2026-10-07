import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { addEntry, listInbox, inboxDir, parseEntry } from '../lib/intake.mjs';
import { draftFromEntry, draftPending, GAP } from '../lib/draft.mjs';
import { CONTENT_ROOT, getUnit, loadUnits, validateUnits } from '../lib/content.mjs';
import { POST } from '../app/api/intake/route.js';

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
  assert.match(fs.readFileSync(file, 'utf8'), /^---\nworld:/, 'front matter fence must be valid');
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
  const made = draftPending({ world: WORLD });
  const fresh = newlyCreated(unitDir, before);
  created.units.push(...fresh);

  assert.equal(made.length, 1, 'one pending entry, one shell');
  assert.equal(fresh.length, 1);
  assert.match(fresh[0], /worlds\/brand-thinking\/\d{2}-referral-discount\.md$/);

  const after = parseEntry(fs.readFileSync(file, 'utf8'), file);
  assert.equal(after.status, 'drafted');
  assert.ok(String(after.draft).startsWith('worlds/brand-thinking/'), 'entry points at its unit file');

  // and nothing re-drafts silently
  assert.deepEqual(draftPending({ world: WORLD }), [], 'drafted entries must not be drafted twice');
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
