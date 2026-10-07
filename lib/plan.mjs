import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_ROOT, loadWorlds, loadCore, unitsByWorld, loadUnits } from './content.mjs';
import { listInbox } from './intake.mjs';

/**
 * NODE PLAN — what is still the author's job, per node.
 *
 * A node is "ready" in this universe when every one of its 50 slots knows *why* it exists:
 * signed off, drafted from a capture, reserved because another node points here, or an open
 * seed question taken from the author's own recurring ideas. The plan is generated, never
 * hand-edited, and it never contains a belief — only his words, his links and his questions.
 */

const GAP = 'NEEDS_AUTHOR_INPUT';

/** a seed stays a question even after truncation — it must never read like a finished claim */
const question = (s = '') => {
  const v = String(s).replace(/[.…]+$|…$/g, '').trim();
  return /[?]$/.test(v) ? v : `${v}?`;
};

const short = (s, n = 96) => {
  const v = String(s || '').replace(/\s+/g, ' ').trim();
  return v.length > n ? `${v.slice(0, n - 1)}…` : v;
};

/** other nodes that already point at this one — the graph is asking for an answer here */
function reservedFor(worldId) {
  const out = [];
  for (const u of loadUnits()) {
    if (u.world_id === worldId) continue;
    const wants = Array.isArray(u.related_worlds) ? u.related_worlds : [];
    if (wants.includes(worldId)) out.push({ from: u.world_id, concept: u.concept_id, title: u.title, cluster: u.cluster_name || '' });
  }
  return out;
}

/** the author's own cross-world signatures + open questions, matched to this node */
function seedQuestions(world, core) {
  const keys = [
    ...tokens(world.name),
    ...tokens(world.thesis),
    ...(world.id === 'brand-thinking' ? ['brand', 'logo', 'design'] : []),
  ];
  const mentions = (text) => {
    const t = String(text || '').toLowerCase();
    return keys.some((k) => k.length > 3 && t.includes(k)) || t.includes(world.id.replace('-thinking', ''));
  };
  const rows = [];
  for (const idea of core.recurring_ideas || []) {
    rows.push({ source: 'recurring idea', text: `“${short(idea, 62)}” — এই node-এ আপনার position কী?` });
  }
  for (const q of core.open_questions || []) {
    const line = typeof q === 'string' ? q : q?.question || q?.text || JSON.stringify(q);
    rows.push({ source: 'open question', text: line });
  }
  const defs = core.definitions || {};
  for (const [k, v] of Object.entries(defs)) {
    if (String(v).includes(GAP) || k.includes(GAP)) rows.push({ source: 'definition owed', text: `${k}: এই node-এর ভাষায় আপনার সংজ্ঞা কী?` });
  }
  for (const f of core.frameworks || []) {
    if (mentions(f.use) || String(f.use || '').includes('universe-wide')) rows.push({ source: 'framework', text: `${f.name} — এই node-এ কোথায় কাজে লাগে, একটা real example দেন?` });
  }
  for (const c of core.contrarian_positions || []) {
    const line = typeof c === 'string' ? c : Object.values(c || {}).join(' ');
    if (String(line).includes(GAP)) rows.push({ source: 'position owed', text: `${line} — এই node থেকে আপনার উত্তর?` });
  }
  for (const s of core.stories_and_experiences || []) {
    const text = typeof s === 'string' ? s : Object.entries(s || {}).map(([k, v]) => `${k === GAP ? 'still owed' : k}: ${v}`).join(' — ');
    rows.push({ source: 'story owed', text: `${text} — এই node-এ এটা কোথায় বসবে?` });
  }
  return rows;
}

const tokens = (s = '') =>
  String(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(' ')
    .filter((w) => w.length > 3);

export function buildPlan(worldId) {
  const worlds = loadWorlds();
  const world = worlds.find((w) => w.id === worldId);
  if (!world) throw new Error(`unknown world: ${worldId}`);
  const core = loadCore();
  const target = world.target || 50;
  const units = unitsByWorld(worldId);
  const inbox = listInbox({ world: worldId });
  const pending = inbox.filter((e) => e.status === 'pending' && (e.lane || 'thinking') === 'thinking');
  const drafted = inbox.filter((e) => e.status === 'drafted');
  const reserved = reservedFor(worldId);
  const seeds = seedQuestions(world, core);

  const rows = [];
  for (const u of units) {
    rows.push({
      n: u.concept_number,
      state: String(u.status) === 'approved' || String(u.status) === 'published' ? 'signed off' : String(u.status) === 'draft' ? 'draft shell' : u.status,
      title: u.title,
      note: String(u.status) === 'draft' ? `${u.needs_author_input?.length || 0} gaps open — fill, then status: approved` : u.cluster_name || '',
      href: `/concepts/${u.concept_id}`,
    });
  }
  for (const e of pending) {
    rows.push({ n: null, state: 'captured, not drafted', title: short(e.fields?.title || e.fields?.thought), note: `npm run draft → ${path.relative(CONTENT_ROOT, e.__file)}`, href: null });
  }
  const taken = new Set(rows.map((r) => r.n));
  let openSeen = 0;
  for (let n = 1; n <= target; n++) {
    if (taken.has(n)) continue;
    const seed = seeds[(n - 1) % Math.max(1, seeds.length)];
    const wantedBy = reserved.slice(openSeen % Math.max(1, reserved.length), (openSeen % Math.max(1, reserved.length)) + 2);
    openSeen++;
    rows.push({
      n,
      state: reserved.length ? 'open · reserved' : 'open',
      title: seed ? question(short(seed.text, 110)) : `${GAP}: এই slot-এ আপনার কোন concept বসবে?`,
      note: seed ? `seed from your ${seed.source} — replace with your own framing` : 'nothing here yet',
      href: null,
      reserved: wantedBy.map((r) => `${r.from}/${r.concept}`).join(', '),
    });
  }
  rows.sort((a, b) => (a.n || 999) - (b.n || 999) || String(a.title).localeCompare(String(b.title)));

  const filled = units.length;
  const approved = units.filter((u) => ['approved', 'published'].includes(String(u.status))).length;
  return {
    world,
    target,
    rows: rows.slice(0, Math.max(target, rows.length)),
    counts: {
      units: filled,
      approved,
      drafts: units.length - approved,
      pending: pending.length,
      captures: drafted.length,
      reserved: reserved.length,
      open: Math.max(0, target - filled),
    },
    reserved,
    progress: Math.round((approved / target) * 100),
  };
}

export function renderPlan(worldId) {
  const p = buildPlan(worldId);
  const { world, counts } = p;
  const line = (r) =>
    `| ${String(r.n ?? '—').padStart(2, ' ')} | ${r.state} | ${r.title.replace(/\|/g, '/')} | ${r.note || ''}${r.reserved ? ` · ← ${r.reserved}` : ''} |`;
  return [
    `# ${world.name} — node plan (generated)`,
    '',
    `> \`${path.relative(CONTENT_ROOT, path.join(CONTENT_ROOT, 'worlds', worldId, 'PLAN.md'))}\` is written by \`npm run plan\`.`
      + ' Do not hand-edit: edit the unit files or add a capture, then regenerate. This file holds no beliefs —'
      + ' only your signed titles, your drafted shells, and the questions that are still yours.',
    '',
    `**Thesis:** ${world.thesis || GAP}`,
    `**State:** ${world.status} · intake ${world.intake || 'open'}`,
    `**Ready:** ${counts.approved}/${p.target} signed off · ${counts.drafts} draft shell(s) · ${counts.pending} capture(s) waiting · ${counts.open} slot(s) open`,
    `**Graph demand:** ${counts.reserved} concept(s) in other nodes point here and are still unanswered`,
    '',
    '## Slots',
    '',
    '| # | state | concept / next question | note |',
    '|---:|---|---|---|',
    ...p.rows.map(line),
    '',
    '## Reserved by other nodes',
    '',
    ...(p.reserved.length
      ? p.reserved.map((r) => `- **${r.title}** — from \`${r.from}/${r.concept}\`${r.cluster ? ` (${r.cluster})` : ''} → this node owes the answer`)
      : ['- (none yet — other nodes do not link here)']),
    '',
    '## How to fill a slot from anywhere',
    '',
    '```text',
    'phone / any browser : /quick  → one box → Save  (no server? it opens a prefilled GitHub issue)',
    'terminal           : npm run intake -- --add --world ' + worldId + ' --thought "…"',
    'then               : npm run draft → fill NEEDS_AUTHOR_INPUT → status: approved → npm run check:strict',
    '```',
    '',
    `> Seed questions come from your own recurring ideas, open questions and framework uses in`,
    `> \`thinking-core/tushar-thinking-core.yaml\`. They are prompts, not positions. Replace or delete.`,
    '',
  ].join('\n');
}

export function writePlan(worldId) {
  const file = path.join(CONTENT_ROOT, 'worlds', worldId, 'PLAN.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, renderPlan(worldId), 'utf8');
  // an inbox that exists is an inbox that can be used from a phone
  fs.mkdirSync(path.join(CONTENT_ROOT, 'inbox', worldId), { recursive: true });
  return file;
}

export function planAll() {
  return loadWorlds().map((w) => ({ world: w.id, file: writePlan(w.id), ...buildPlan(w.id).counts }));
}
