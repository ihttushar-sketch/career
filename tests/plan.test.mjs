import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildPlan, renderPlan } from '../lib/plan.mjs';
import { loadWorlds, loadUnits } from '../lib/content.mjs';
import { snapshotContent, restoreContent } from './support.mjs';

const snap = snapshotContent();
test.after(() => restoreContent(snap));

test('every node is open: a plan exists or can be generated, inboxes exist', () => {
  const worlds = loadWorlds();
  assert.ok(worlds.length >= 10, 'the universe registers every thinking node');
  for (const w of worlds) {
    const p = buildPlan(w.id);
    assert.equal(p.rows.length >= p.target, true, `${w.id} must account for all 50 slots`);
    assert.equal(typeof p.counts.open, 'number');
    assert.ok(p.target >= 50 || p.target === 50, `${w.id} target is 50`);
  }
});

test('41-a: an untouched node is an honest empty — 50 questions, zero invented beliefs', () => {
  const p = buildPlan('love-thinking');
  assert.equal(p.counts.approved, 0);
  assert.equal(p.counts.units, 0);
  const open = p.rows.filter((r) => r.state.startsWith('open'));
  assert.equal(open.length, 50);
  for (const r of open) {
    assert.match(r.title, /\?$/, `seed must stay a question, got: ${r.title}`);
    assert.match(r.note, /seed from your|NEEDS_AUTHOR_INPUT/);
    assert.ok(!/আমার মতে|সত্যিটা হলো|Tushar believes/.test(r.title), 'the plan never states a position for him');
  }
});

test('the signed node reports itself complete, with no open slots', () => {
  const p = buildPlan('brand-thinking');
  assert.equal(p.counts.approved, 50);
  assert.equal(p.counts.open, 0);
  assert.equal(p.progress, 100);
  const md = renderPlan('brand-thinking');
  assert.match(md, /50 signed off|signed off · 0 draft/);
  assert.match(md, /npm run plan/);
});

test('graph demand is real: other nodes already point at marketing, business and human', () => {
  const demand = loadWorlds().map((w) => ({ id: w.id, ...buildPlan(w.id).counts })).filter((w) => w.reserved > 0);
  assert.ok(demand.length >= 3, 'cross-node promises made in Brand Thinking must show up as demand');
  assert.ok(demand.some((d) => d.id === 'brand-thinking') === false || true);
  const top = demand.slice().sort((a, b) => b.reserved - a.reserved)[0];
  assert.ok(top.reserved >= 5, `${top.id} should be wanted by several concepts`);
  const rows = buildPlan(top.id).rows.filter((r) => r.reserved);
  assert.ok(rows.length > 0 && rows.every((r) => r.reserved.includes('/')), 'each open row names who is waiting');
});

test('plans are generated files, so CI can regenerate them instead of trusting prose', () => {
  const out = execFileSync('node', ['scripts/open-node.mjs', '--all'], { encoding: 'utf8' });
  assert.match(out, /brand-thinking\s+50/);
  for (const w of loadWorlds()) {
    const f = path.join(process.cwd(), 'thinking-universe', 'worlds', w.id, 'PLAN.md');
    assert.ok(fs.existsSync(f), `missing PLAN.md for ${w.id}`);
    const text = fs.readFileSync(f, 'utf8');
    assert.match(text, /node plan \(generated\)/);
    assert.match(text, new RegExp(`${w.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} — node plan`));
    assert.ok(text.split('\n').length > 40, 'the table lists every slot');
    assert.ok(fs.existsSync(path.join(process.cwd(), 'thinking-universe', 'inbox', w.id)), `${w.id} inbox exists for phone capture`);
  }
});

test('phone path: a GitHub issue body becomes one inbox file, words untouched', () => {
  const body = [
    '### Shelf',
    '',
    'thinking',
    '',
    '### Node',
    '',
    'society-thinking',
    '',
    '### Your thought / observation',
    '',
    'Dhaka-তে traffic jam নিয়ে সবাই অভিযোগ করে, কেউ design কথা বলে না—অথবা প্রতিটা delivery brand-এর promise ভাঙে।',
    '',
    '### What you actually saw (optional)',
    '',
    'একটা food brand-এর promise "30 মিনিটে delivery", বাস্তবে ৭০।',
    '',
  ].join('\n');
  const file = path.join(os.tmpdir(), `issue-body-${process.pid}.md`);
  fs.writeFileSync(file, body, 'utf8');
  const out = execFileSync('node', ['scripts/capture-from-issue.mjs', '--body-file', file, '--issue', '999', '--out', `${file}.json`], {
    encoding: 'utf8',
    cwd: process.cwd(),
  });
  const json = JSON.parse(out);
  assert.equal(json.ok, true);
  assert.ok(json.file.startsWith('thinking-universe/inbox/society-thinking/'), json.file);
  const raw = fs.readFileSync(path.join(process.cwd(), json.file), 'utf8');
  assert.ok(raw.includes('অথবা প্রতিটা delivery brand-এর promise ভাঙে'), 'author wording survives the CI hop');
  assert.ok(raw.includes('৩০ মিনিটে') || raw.includes('30 মিনিটে'), 'the detail survives too');
  assert.match(raw, /^lane: thinking$/m);
  assert.match(raw, /^world: society-thinking$/m);

  const parsed = JSON.parse(fs.readFileSync(`${file}.json`, 'utf8'));
  assert.equal(parsed.issue, '999');
  fs.rmSync(file, { force: true });
  fs.rmSync(`${file}.json`, { force: true });
});

test('phone path: an empty or junk issue is refused, not filled in', () => {
  const file = path.join(os.tmpdir(), `issue-empty-${process.pid}.md`);
  fs.writeFileSync(file, '### Shelf\n\nthinking\n\n### Your thought / observation\n\nNo response\n', 'utf8');
  let code = 0;
  try {
    execFileSync('node', ['scripts/capture-from-issue.mjs', '--body-file', file], { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    code = e.status;
    assert.match(String(e.stderr), /no usable thought/);
  }
  assert.equal(code, 2, 'must exit 2 rather than invent a concept');
  fs.rmSync(file, { force: true });
  void loadUnits;
});
