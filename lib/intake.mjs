import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { CONTENT_ROOT, loadWorlds } from './content.mjs';
import { LANES, LANE_IDS, routeText, laneInboxDir } from './lane.mjs';

/**
 * INTAKE LAYER — the author's door into every node.
 *
 * One file per thought:  thinking-universe/inbox/<world_id>/<date>-<slug>.md
 * The author writes raw perception. Nothing here needs to be finished, tidy or
 * quotable — the drafter (scripts/draft.mjs) turns it into a Thinking Unit shell,
 * and every place that still needs the author's own position is written as NEEDS_AUTHOR_INPUT.
 */

export const INBOX_ROOT = path.join(CONTENT_ROOT, 'inbox');

/** every label of every lane — parsing stays lane-agnostic so old files still read */
const ALL_LABELS = [...new Set(Object.values(LANES).flatMap((l) => l.fields.map(([k, lab]) => [k, lab])))];
const FIELDS = LANES.thinking.fields;
export const FIELD_LABELS = LANE_IDS.flatMap((id) => LANES[id].fields.map(([, l]) => l));
export { LANES, LANE_IDS } from './lane.mjs';

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

export function template(worldId = 'brand-thinking', lane = 'thinking') {
  const def = LANES[lane] || LANES.thinking;
  return [
    '---',
    `lane: ${lane}`,
    `world: ${worldId}`,
    `status: pending`,
    `created: ${new Date().toISOString().slice(0, 10)}`,
    `draft: null`,
    '---',
    '',
    `TEMPLATE — delete this line when you save`,
    '',
    ...def.fields.flatMap(([k, label], i) => [`${label}:`, def.questions[i] || '', '']),
  ].join('\n');
}

export function parseEntry(raw, file) {
  const { data, content } = matter(raw);
  const fields = {};
  let current = null;
  for (const line of content.split('\n')) {
    const labelled = ALL_LABELS.find(([, l]) => line.trim().toUpperCase().startsWith(l + ':'));
    if (labelled) {
      current = labelled[0];
      fields[current] = '';
      continue;
    }
    // any lane's own label survives the round trip, even ones added later
    const generic = /^([A-Z][A-Z /&'’-]{2,}):\s*$/.exec(line.trim());
    if (generic) {
      current = generic[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
      fields[current] = '';
      continue;
    }
    if (/^TEMPLATE\b/.test(line.trim())) continue;
    if (current) fields[current] = (fields[current] + '\n' + line).trim();
  }
  return { ...data, fields, __file: file, id: data.id || path.basename(file, '.md') };
}

export function listInbox({ world = null, status = null, lane = null } = {}) {
  if (!fs.existsSync(INBOX_ROOT)) return [];
  const dirs = world && world !== 'auto' && world !== 'unfiled'
    ? [inboxDir(world), ...LANE_IDS.filter((l) => l !== 'thinking').map((l) => laneInboxDir(l))].filter((d, i, a) => a.indexOf(d) === i)
    : fs.readdirSync(INBOX_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(INBOX_ROOT, d.name));
  const out = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md') && !x.startsWith('_'))) {
      const file = path.join(dir, f);
      const e = parseEntry(fs.readFileSync(file, 'utf8'), file);
      if (status && e.status !== status) continue;
      if (world && world !== 'auto' && world !== 'unfiled' && (e.world || 'unfiled') !== world) continue;
      if (lane && (e.lane || 'thinking') !== lane) continue;
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

/**
 * Capture one piece of the author's thinking — at any moment, in any of the four lanes.
 * `world: 'auto'` (default) means: file it where the words point, but only as a proposal.
 */
export function addEntry({ world = 'auto', lane = 'thinking', thought = '', fields = {}, title, hook, raw } = {}) {
  const def = LANES[lane];
  if (!def) throw new Error(`unknown lane: ${lane}`);
  const primary = String(thought || fields.thought || raw || Object.values(fields).find((v) => v && String(v).trim()) || '').trim();
  if (!primary) throw new Error(`${def.fields[0][1]} is required — the engine never invents your position`);
  if (!/^[a-z0-9-]+$/.test(String(lane))) throw new Error('bad lane');

  let text = [primary, ...Object.values(fields).filter(Boolean)].join('\n');
  let proposal = lane === 'thinking' || world === 'auto' ? routeText(text) : null;
  let chosenWorld = world && world !== 'auto' ? world : proposal?.world || null;
  // a low-confidence guess is not a filing: leave it unfiled so it waits for you at triage
  if (world === 'auto' && proposal && proposal.confidence === 'low') chosenWorld = null;
  const known = loadWorlds().map((w) => w.id);
  if (chosenWorld && !known.includes(chosenWorld)) throw new Error(`unknown world: ${chosenWorld}`);

  // The router may only move a capture between shelves when the author did not pick a lane
  // himself. His words are copied as they are — never reworded, never re-interpreted.
  let chosenLane = lane;
  if (lane === 'thinking' && world === 'auto' && proposal && proposal.lane !== 'thinking' && proposal.confidence !== 'none') {
    chosenLane = proposal.lane;
  }
  const def2 = LANES[chosenLane];
  const CONTENT_FIELD = { case: 'what', business: 'name', note: 'thought', thinking: 'thought' }[chosenLane];
  const carried = {};
  for (const [k, label] of def2.fields) {
    const own = fields[k];
    carried[k] = own && String(own).trim() ? String(own).trim() : k === CONTENT_FIELD ? primary : '';
  }
  if (title && !carried.title) carried.title = String(title).trim();
  if (hook && !carried.hook) carried.hook = String(hook).trim();
  // Anything typed for a different shelf is kept verbatim under CAPTURED NOTES — moving a
  // capture between shelves must never lose a word, and never rewrite one either.
  const extraLabels = Object.entries(fields)
    .filter(([k, v]) => v && String(v).trim() && !def2.fields.some(([kk]) => kk === k) && !['title', 'hook'].includes(k))
    .map(([k, v]) => [`CAPTURED NOTES`, undefined])
    .concat();
  const extras = Object.entries(fields)
    .filter(([k, v]) => v && String(v).trim() && !def2.fields.some(([kk]) => kk === k) && !['title', 'hook'].includes(k))
    .map(([k, v]) => `${(FIELDS.find(([kk]) => kk === k)?.[1] || k).toUpperCase()}: ${String(v).trim()}`)
    .join('\n');
  if (extras) carried.__notes = extras;

  const dir = chosenLane === 'thinking' ? inboxDir(chosenWorld || 'unfiled') : laneInboxDir(chosenLane);
  fs.mkdirSync(dir, { recursive: true });
  const created = new Date().toISOString().slice(0, 10);
  const id = `${created}-${slugify(fields.title || title || primary)}`;
  let file = path.join(dir, `${id}.md`);
  let n = 2;
  while (fs.existsSync(file)) file = path.join(dir, `${id}-${n++}.md`);

  const body = [
    '---',
    `lane: ${chosenLane}`,
    `world: ${chosenWorld || 'unfiled'}`,
    `status: pending`,
    `created: ${created}`,
    `captured: manual`,
    `draft: null`,
    ...(proposal
      ? [
          `proposed_lane: ${proposal.lane}`,
          `proposed_world: ${proposal.world || 'unfiled'}`,
          `routing_confidence: ${proposal.confidence}`,
          `routing_why: ${((proposal.lane_why || []).slice(0, 3).join(' | ') || 'not enough to judge').replace(/["'`\n]/g, '').replace(/:/g, '-')}`,
        ]
      : []),
    '---',
    '',
    ...def2.fields
      .map(([k, l]) => [l, carried[k]])
      .filter(([, v]) => v && String(v).trim())
      .flatMap(([l, v]) => [`${l}:`, String(v).trim(), '']),
    ...(carried.__notes ? ['CAPTURED NOTES:', carried.__notes, ''] : []),
  ].join('\n');

  fs.writeFileSync(file, body.endsWith('\n') ? body : `${body}\n`, 'utf8');
  const entry = parseEntry(fs.readFileSync(file, 'utf8'), file);
  return { file, entry, proposal, lane: chosenLane, world: chosenWorld };
}

/** triage: author (or UI) confirms the shelf, one keystroke, nothing rewritten */
export function confirmEntry(file, { world = null, lane = null } = {}) {
  const raw = fs.readFileSync(file, 'utf8');
  let next = raw;
  if (world) next = next.replace(/^world:.*$/m, `world: ${world}`);
  if (lane) next = next.replace(/^lane:.*$/m, `lane: ${lane}`);
  next = next.replace(/^routing_confidence:.*$/m, 'routing_confidence: confirmed');
  if (!/^routing_confidence:/m.test(next)) next = next.replace(/^---\n/, '---\nrouting_confidence: confirmed\n');
  fs.writeFileSync(file, next, 'utf8');
  return parseEntry(fs.readFileSync(file, 'utf8'), file);
}

/** everything waiting, with the shelf it proposes — the triage queue */
export function triageQueue() {
  return listInbox({ status: 'pending' }).map((e) => ({
    id: e.id,
    file: path.relative(CONTENT_ROOT, e.__file),
    lane: e.lane || 'thinking',
    world: e.world || 'unfiled',
    proposed_world: e.proposed_world || null,
    confidence: e.routing_confidence || null,
    why: e.routing_why || null,
    created: e.created,
    preview: String(e.fields?.thought || e.fields?.subject || e.fields?.name || Object.values(e.fields || {})[0] || '')
      .replace(/\s+/g, ' ')
      .slice(0, 140),
  }));
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
  const byLane = LANE_IDS.map((l) => ({ lane: l, label: LANES[l].label, pending: all.filter((e) => (e.lane || 'thinking') === l && e.status === 'pending').length, drafted: all.filter((e) => (e.lane || 'thinking') === l && e.status === 'drafted').length }));
  const worlds = loadWorlds();
  return {
    byLane,
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
