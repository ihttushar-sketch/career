import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { CONTENT_ROOT, loadWorlds } from './content.mjs';

/**
 * INTAKE LAYER — the author's door into every node.
 *
 * One file per thought:  thinking-universe/inbox/<world_id>/<date>-<slug>.md
 * The author writes raw perception. Nothing here needs to be finished, tidy or
 * quotable — the drafter (scripts/draft.mjs) turns it into a Thinking Unit shell,
 * and every place that still needs the author's own position is written as NEEDS_AUTHOR_INPUT.
 */

export const INBOX_ROOT = path.join(CONTENT_ROOT, 'inbox');

const FIELDS = [
  ['thought', 'THOUGHT'],
  ['observation', 'OBSERVATION'],
  ['angle', 'MY ANGLE / FRAMEWORK'],
  ['wrong', 'WHAT OTHERS GET WRONG'],
  ['why', 'WHY IT MATTERS'],
  ['title', 'TITLE'],
  ['hook', 'HOOK'],
  ['example', 'REAL EXAMPLE'],
];

export const FIELD_LABELS = FIELDS.map(([, l]) => l);

const slugify = (s = '') => {
  // ASCII-only slugs: Bengali thoughts still get readable, URL-safe file names
  const ascii = String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 46)
    .replace(/-+/g, '-')
    .replace(/-+$/, '');
  if (ascii.length > 4) return ascii;
  const hash = Array.from(String(s)).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
  return `${ascii ? ascii + '-' : ''}thought-${hash.slice(0, 6)}`;
};

export function inboxDir(worldId) {
  return path.join(INBOX_ROOT, worldId);
}

export function template(worldId = 'brand-thinking') {
  return [
    '---',
    `world: ${worldId}`,
    `status: pending`,
    `created: ${new Date().toISOString().slice(0, 10)}`,
    `draft: null`,
    '---',
    '',
    `TEMPLATE — delete this line when you save`,
    '',
    'THOUGHT:',
    'আপনার মূল কথা, যেমনটা আপনি নিজে ভাবেন ঠিক তেমনি। অসম্পূর্ণ থাকলেও চলবে।',
    '',
    'OBSERVATION:',
    'আপনি বাস্তবে কী দেখেছেন যা অন্যরা দেখে না।',
    '',
    'MY ANGLE / FRAMEWORK:',
    'ধাপের শিকল দিলে দারুণ (যেমন: LOGO → SYSTEM → EXPERIENCE → PERCEPTION)। না দিলে system জিজ্ঞেস করে বানাবে, কিন্তু মূল position আপনার থাকবে।',
    '',
    'WHAT OTHERS GET WRONG:',
    'সাধারণ ধারণাটা কী, যেটা নিয়ে আপনি কথা বলতে চান।',
    '',
    'WHY IT MATTERS:',
    'এটা বোঝা বা না বোঝায় business-এর কী ফেরে।',
  ].join('\n');
}

export function parseEntry(raw, file) {
  const { data, content } = matter(raw);
  const fields = {};
  let current = null;
  for (const line of content.split('\n')) {
    const labelled = FIELDS.find(([, l]) => line.trim().toUpperCase().startsWith(l));
    if (labelled) {
      current = labelled[0];
      fields[current] = '';
      continue;
    }
    if (/^TEMPLATE\b/.test(line.trim())) continue;
    if (current) fields[current] = (fields[current] + '\n' + line).trim();
  }
  return { ...data, fields, __file: file, id: data.id || path.basename(file, '.md') };
}

export function listInbox({ world = null, status = null } = {}) {
  if (!fs.existsSync(INBOX_ROOT)) return [];
  const dirs = world ? [inboxDir(world)] : fs.readdirSync(INBOX_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(INBOX_ROOT, d.name));
  const out = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md') && !x.startsWith('_'))) {
      const file = path.join(dir, f);
      const e = parseEntry(fs.readFileSync(file, 'utf8'), file);
      if (status && e.status !== status) continue;
      out.push(e);
    }
  }
  return out.sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
}

export function nextConceptNumber(worldId) {
  const dir = path.join(CONTENT_ROOT, 'worlds', worldId);
  if (!fs.existsSync(dir)) return 1;
  const nums = fs
    .readdirSync(dir)
    .map((f) => Number(/^(\d+)-/.exec(f)?.[1]))
    .filter(Boolean);
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

/** write one intake entry; returns the created file + its parsed form */
export function addEntry({ world = 'brand-thinking', thought = '', fields = {}, title, hook } = {}) {
  const t = String(thought || fields.thought || '').trim();
  if (!t) throw new Error('THOUGHT is required — the engine never invents your position');
  const known = loadWorlds().map((w) => w.id);
  if (!known.includes(world)) throw new Error(`unknown world: ${world}`);
  const dir = inboxDir(world);
  fs.mkdirSync(dir, { recursive: true });
  const created = new Date().toISOString().slice(0, 10);
  const id = `${created}-${slugify(title || t)}`;
  let file = path.join(dir, `${id}.md`);
  let n = 2;
  while (fs.existsSync(file)) file = path.join(dir, `${id}-${n++}.md`);

  const body = [
    '---',
    `world: ${world}`,
    `status: pending`,
    `created: ${created}`,
    `draft: null`,
    '---',
    '',
    `THOUGHT:`,
    t,
    '',
    ...[
      ['OBSERVATION', fields.observation],
      ['MY ANGLE / FRAMEWORK', fields.angle],
      ['WHAT OTHERS GET WRONG', fields.wrong],
      ['WHY IT MATTERS', fields.why],
      ['TITLE', title],
      ['HOOK', hook],
      ['REAL EXAMPLE', fields.example],
    ]
      .filter(([, v]) => v && String(v).trim())
      .flatMap(([l, v]) => [`${l}:`, String(v).trim(), '']),
  ].join('\n');

  fs.writeFileSync(file, body.endsWith('\n') ? body : `${body}\n`, 'utf8');
  return { file, entry: parseEntry(fs.readFileSync(file, 'utf8'), file) };
}

export function markDrafted(file, draftRelPath) {
  const raw = fs.readFileSync(file, 'utf8');
  const next = raw
    .replace(/^status:\s*pending\s*$/m, 'status: drafted')
    .replace(/^draft:.*$/m, `draft: ${draftRelPath}`);
  fs.writeFileSync(file, /^status:/m.test(raw) ? next : `status: drafted\ndraft: ${draftRelPath}\n${raw}`, 'utf8');
}

export function intakeStats() {
  const all = listInbox();
  const worlds = loadWorlds();
  return {
    pending: all.filter((e) => e.status === 'pending').length,
    drafted: all.filter((e) => e.status === 'drafted').length,
    total: all.length,
    byWorld: worlds.map((w) => ({
      id: w.id,
      name: w.name,
      live: w.live,
      pending: all.filter((e) => e.world === w.id && e.status === 'pending').length,
      drafted: all.filter((e) => e.world === w.id && e.status === 'drafted').length,
      units: w.unitCount,
      target: w.target,
    })),
  };
}

export { slugify };

/** small projection for the UI (inbox list with drafted target resolved) */
export function listPendingView() {
  return listInbox().map((e) => {
    const thought = (e.fields?.thought || '').replace(/\s+/g, ' ').trim();
    let slug = null;
    if (e.draft && e.draft !== 'null') {
      const file = path.basename(e.draft);
      slug = file.replace(/^\d+-/, '').replace(/\.md$/, '');
    }
    return {
      id: e.id,
      world: e.world,
      status: e.status,
      created: e.created,
      thought,
      title: e.fields?.title || null,
      hook: e.fields?.hook || null,
      draft: e.draft && e.draft !== 'null' ? e.draft : null,
      slug,
      file: path.relative(CONTENT_ROOT, e.__file),
    };
  });
}
