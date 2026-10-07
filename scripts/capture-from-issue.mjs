#!/usr/bin/env node
/**
 * Issue body → inbox entry. This is the phone path: GitHub's issue form renders the answers as
 * `### <label>` sections; we read them, keep the text verbatim, and file one capture.
 *
 *   node scripts/capture-from-issue.mjs --body-file issue.md [--issue 12] [--out notes.json]
 *   node scripts/capture-from-issue.mjs --body "$(gh issue view 12 --json body -q .body)"
 *   node scripts/capture-from-issue.mjs --selftest
 *
 * It never drafts, never approves, never publishes — `npm run draft` is a separate, deliberate step.
 */
import fs from 'node:fs';
import { addEntry } from '../lib/intake.mjs';

/** GitHub renders issue-form labels; map every label we ship (and obvious variants) to a field */
const LABELS = [
  [/^\s*(shelf|lane)\s*$/i, 'lane'],
  [/^\s*node(\s*\(optional\))?\s*$/i, 'world'],
  [/your thought/i, 'thought'],
  [/\bobservation\b|what you actually saw/i, 'observation'],
  [/chain|framework/i, 'angle'],
  /what others get wrong/i,
  [/^\s*(why it matters)(.*)$/i, 'why'],
  [/title/i, 'title'],
  [/hook/i, 'hook'],
  [/real example|example/i, 'example'],
  [/^\s*company|subject/i, 'subject'],
  [/what happened/i, 'what'],
  [/what they did/i, 'did'],
  [/evidence|numbers/i, 'evidence'],
  [/my read/i, 'read'],
  [/what it proves|proves/i, 'proves'],
  [/source/i, 'source'],
  [/area \/ offer|offer/i, 'name'],
  [/who it is for|who\b/i, 'who'],
  [/believe before/i, 'before'],
  [/moves the needle/i, 'moves'],
  [/my part|your part/i, 'role'],
  [/proof|result/i, 'proof'],
  [/worth it|price/i, 'price'],
].map((x) => (Array.isArray(x) ? x : [x, 'wrong']));

function parseBody(md = '') {
  const fields = {};
  let current = null;
  let inFence = false;
  const buf = [];
  const flush = () => {
    if (current && buf.length) {
      const v = buf.join('\n').trim();
      if (v && !/^(no response|n\/a|—|-)$/i.test(v)) fields[current] = (fields[current] ? `${fields[current]}\n\n` : '') + v;
    }
    buf.length = 0;
  };
  for (const raw of md.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*```/.test(raw)) {
      inFence = !inFence;
      continue;
    }
    const h = /^#{2,4}\s+(.*)$/.exec(raw);
    if (h && !inFence) {
      flush();
      const hit = LABELS.find(([re]) => re.test(h[1].trim()));
      current = hit ? hit[1] : null;
      continue;
    }
    if (/^\s*>/.test(raw) && !buf.length) continue; // quoted template help text
    if (current) buf.push(raw);
  }
  flush();
  return fields;
}

const SAMPLE = [
  '### Shelf',
  '',
  'thinking',
  '',
  '### Node',
  '',
  'marketing-thinking',
  '',
  '### Your thought / observation',
  '',
  'ছোট company গুলো brand-এ টাকা খরচ করে না সময় কটায়—owner না থাকলে দুটোই হয়।',
  '',
  '### What you actually saw (optional)',
  '',
  'তিনটা meeting-এ তিনটা আলাদা price card।',
  '',
  '### Your chain / framework (optional)',
  '',
  '```text',
  'OWNER → RULE → CONSISTENCY → TRUST',
  '```',
  '',
  '### What others get wrong (optional)',
  '',
  'Brand মানে design phase, পরে করা যাবে।',
  '',
].join('\n');

if (process.argv.includes('--selftest')) {
  const f = parseBody(SAMPLE);
  const checks = [
    ['lane', f.lane === 'thinking'],
    ['world', f.world === 'marketing-thinking'],
    ['thought kept verbatim', String(f.thought || '').includes('owner না থাকলে দুটোই হয়')],
    ['observation', f.observation === 'তিনটা meeting-এ তিনটা আলাদা price card।'],
    ['fence stripped from chain', f.angle === 'OWNER → RULE → CONSISTENCY → TRUST'],
    ['wrong', String(f.wrong || '').includes('design phase')],
  ];
  for (const [name, ok] of checks) console.log(`${ok ? '✓' : '✗'} ${name}`);
  process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
}

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : null;
};

let md = '';
if (arg('body-file')) md = fs.readFileSync(arg('body-file'), 'utf8');
else if (arg('body')) md = arg('body');
else if (!process.stdin.isTTY) md = fs.readFileSync(0, 'utf8');
else {
  console.error('nothing to read: pass --body-file, --body or pipe the issue body in');
  process.exit(1);
}

const fields = parseBody(md);
const lane = ['thinking', 'case', 'business', 'note'].includes(String(fields.lane || '').trim()) ? String(fields.lane).trim() : 'thinking';
const world = ['auto', '', undefined, null].includes(fields.world) || !fields.world ? 'auto' : String(fields.world).trim();
if (!fields.thought || fields.thought.trim().length < 6) {
  console.error('no usable thought in this issue — nothing filed. Write at least one line under "Your thought / observation".');
  process.exit(2);
}

try {
  const out = addEntry({
    lane,
    world,
    thought: fields.thought,
    title: fields.title,
    hook: fields.hook,
    fields: Object.fromEntries(Object.entries(fields).filter(([k]) => !['lane', 'world', 'thought', 'title', 'hook'].includes(k))),
  });
  const rel = out.file.replace(`${process.cwd()}/`, '');
  const payload = {
    ok: true,
    issue: arg('issue') || null,
    file: rel,
    lane: out.lane,
    world: out.world,
    confidence: out.proposal?.confidence || null,
    proposed: out.proposal?.world || null,
  };
  console.log(JSON.stringify(payload, null, 2));
  if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(payload, null, 2), 'utf8');
} catch (e) {
  console.error(`could not file this capture: ${e.message || e}`);
  process.exit(3);
}
