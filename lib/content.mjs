import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';

const ROOT = process.cwd();
export const CONTENT_ROOT = path.join(ROOT, process.env.CONTENT_ROOT || 'thinking-universe');
const WORLDS_DIR = path.join(CONTENT_ROOT, 'worlds');
const CORE_FILE = path.join(CONTENT_ROOT, 'thinking-core', 'tushar-thinking-core.yaml');
const ASSETS_DIR = path.join(CONTENT_ROOT, 'assets');
const SCHEMA_FILE = path.join(CONTENT_ROOT, 'thinking-unit.schema.json');

/* ------------------------------------------------------------------ core */

let coreCache = null;
let coreStamp = 0;
export function loadCore() {
  const m = fs.statSync(CORE_FILE).mtimeMs;
  if (!coreCache || m !== coreStamp) {
    coreCache = yaml.load(fs.readFileSync(CORE_FILE, 'utf8'));
    coreStamp = m;
  }
  return coreCache;
}

export function loadSchema() {
  return JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
}

export function author() {
  const core = loadCore();
  return {
    name: core.meta.owner,
    role: core.meta.role,
    website: core.meta.website,
    email: core.meta.email,
    phone: core.meta.phone,
    philosophy: core.master_philosophy,
    engine: core.core_engine,
    line: core.positioning_line,
  };
}

/* ----------------------------------------------------------------- units */

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.isFile() && e.name.endsWith('.md') && e.name !== 'INDEX.md' ? [p] : [];
  });
}

/** split markdown body into ordered { heading, text } sections */
export function parseSections(body) {
  const out = [];
  let cur = { heading: null, lines: [] };
  for (const line of body.split('\n')) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      if (cur.heading || cur.lines.join('').trim()) out.push(cur);
      cur = { heading: m[1], lines: [] };
    } else {
      cur.lines.push(line);
    }
  }
  out.push(cur);
  return out
    .map((s) => ({ heading: s.heading, text: s.lines.join('\n').trim() }))
    .filter((s) => s.heading || s.text);
}

let unitCache = null;
let unitStamp = '';

/** cheap staleness check so editing a .md in dev repaints the page without a restart */
function contentStamp() {
  try {
    return fs
      .readdirSync(WORLDS_DIR, { recursive: true })
      .filter((f) => String(f).endsWith('.md'))
      .map((f) => {
        const st = fs.statSync(path.join(WORLDS_DIR, String(f)));
        return `${f}:${st.mtimeMs}:${st.size}`;
      })
      .join('|');
  } catch {
    return '';
  }
}

export function loadUnits({ refresh = false } = {}) {
  const stamp = contentStamp();
  if (unitCache && !refresh && stamp === unitStamp) return unitCache;
  unitStamp = stamp;
  const files = walk(WORLDS_DIR).sort();
  unitCache = files.map((file) => {
    const raw = fs.readFileSync(file, 'utf8');
    const { data, content } = matter(raw);
    const sections = parseSections(content);
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const preamble = sections.find((s) => !s.heading)?.text || '';
    const byHeading = {};
    for (const s of sections) if (s.heading) byHeading[s.heading.toLowerCase()] = s.text;
    const words = (content.match(/[^\s]+/g) || []).length;
    return {
      ...data,
      __file: file,
      __rel: rel,
      __url: `/concepts/${data.concept_id}`,
      __sections: sections,
      __byHeading: byHeading,
      __preamble: preamble,
      __words: words,
      __body: content,
      __assets: (data.visual_concepts || []).filter((v) => v.asset_path && existsAsset(v.asset_path, file)),
      __depth: depthOf(data, words),
    };
  });
  return unitCache;
}

function depthOf(data, words) {
  const visuals = (data.visual_concepts || []).length;
  const approved = data.status === 'approved' || data.status === 'published';
  if (approved && words >= 700 && visuals >= 4) return 'full';
  if (approved && visuals >= 4) return 'expanded';
  return 'structured';
}

export function getUnit(id) {
  return loadUnits().find((u) => u.concept_id === id) || null;
}

export function unitsByWorld(worldId) {
  return loadUnits()
    .filter((u) => u.world_id === worldId)
    .sort((a, b) => (a.concept_number || 0) - (b.concept_number || 0));
}

/** asset_path in a unit file is relative to that file; resolve it against the file's own directory */
export function existsAsset(relFromUnitFile, unitFile) {
  if (!relFromUnitFile) return false;
  const target = path.isAbsolute(relFromUnitFile)
    ? relFromUnitFile
    : path.resolve(path.dirname(unitFile), relFromUnitFile);
  return fs.existsSync(target);
}

/** resolve an asset_path declared in a unit to a served /assets/<name> url */
export function assetUrl(unit, assetPath) {
  if (!assetPath) return null;
  const name = path.basename(assetPath);
  const served = path.join(ASSETS_DIR, name);
  return fs.existsSync(served) ? `/assets/${name}` : null;
}

/* ----------------------------------------------------------------- worlds */

export function loadWorlds() {
  const core = loadCore();
  const units = loadUnits();
  return (core.world_registry || []).map((w) => {
    const own = units.filter((u) => u.world_id === w.id);
    const approved = own.filter((u) => u.status === 'approved' || u.status === 'published').length;
    const full = own.filter((u) => u.__depth === 'full').length;
    return {
      ...w,
      unitCount: own.length,
      approvedCount: approved,
      fullCount: full,
      fill: w.concepts_target ? Math.round((own.length / w.concepts_target) * 100) : 0,
      live: own.length > 0,
      target: w.concepts_target || 50,
    };
  });
}

export function getWorld(id) {
  return loadWorlds().find((w) => w.id === id) || null;
}

/* ------------------------------------------------------------------ graph */

export function buildGraph() {
  const units = loadUnits();
  const byId = new Map(units.map((u) => [u.concept_id, u]));
  const nodes = units.map((u) => ({
    id: u.concept_id,
    world: u.world_id,
    number: u.concept_number,
    title: u.title,
    hook: u.hook,
    depth: u.__depth,
    status: u.status,
  }));
  const edges = [];
  const seen = new Set();
  for (const u of units) {
    for (const rel of u.related_concepts || []) {
      if (!byId.has(rel)) continue;
      const key = [u.concept_id, rel].sort().join('::');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: u.concept_id, to: rel, cross: byId.get(rel).world_id !== u.world_id });
    }
  }
  // world-level adjacency derived from cross-world edges
  const worldLinks = {};
  for (const e of edges) {
    if (!e.cross) continue;
    const a = byId.get(e.from).world_id;
    const b = byId.get(e.to).world_id;
    const k = [a, b].sort().join('|');
    worldLinks[k] = (worldLinks[k] || 0) + 1;
  }
  const threadCounts = {};
  for (const u of units) {
    for (const w of u.related_worlds || []) {
      if (w === u.world_id) continue;
      threadCounts[w] = (threadCounts[w] || 0) + 1;
    }
  }
  const worldThreads = Object.entries(threadCounts)
    .map(([world, count]) => ({ world, count }))
    .sort((a, b) => b.count - a.count);
  return {
    nodes,
    edges,
    worldThreads,
    worldLinks: Object.entries(worldLinks).map(([k, weight]) => ({ a: k.split('|')[0], b: k.split('|')[1], weight })),
    degree: nodes.map((n) => ({
      id: n.id,
      degree: edges.filter((e) => e.from === n.id || e.to === n.id).length,
    })),
  };
}

export function relatedUnits(unit) {
  const units = loadUnits();
  const out = [];
  for (const id of unit.related_concepts || []) {
    const u = units.find((x) => x.concept_id === id);
    if (u) out.push(u);
  }
  // inbound links: other units that point at this one
  for (const u of units) {
    if (u.concept_id !== unit.concept_id && (u.related_concepts || []).includes(unit.concept_id)) {
      out.push(u);
    }
  }
  const seen = new Set();
  return out.filter((u) => (seen.has(u.concept_id) ? false : seen.add(u.concept_id)));
}

/* ------------------------------------------------------------------ stats */

export function stats() {
  const units = loadUnits();
  const worlds = loadWorlds();
  const graph = buildGraph();
  const words = units.reduce((s, u) => s + u.__words, 0);
  const visuals = units.reduce((s, u) => s + (u.visual_concepts || []).length, 0);
  return {
    units: units.length,
    approved: units.filter((u) => u.status === 'approved' || u.status === 'published').length,
    full: units.filter((u) => u.__depth === 'full').length,
    words,
    visuals,
    prompts: visuals,
    edges: graph.edges.length,
    crossEdges: graph.edges.filter((e) => e.cross).length,
    worldThreads: graph.worldThreads.reduce((s, w) => s + w.count, 0),
    worldsLive: worlds.filter((w) => w.live).length,
    worldsTotal: worlds.length,
    frameworks: (loadCore().frameworks || []).length,
    nodesPlanned: worlds.reduce((s, w) => s + (w.concepts_target || 0), 0),
  };
}

/* ---------------------------------------------------------------- validate */

export function validateUnits(units = loadUnits(), { strict = false } = {}) {
  const schema = loadSchema();
  const allowed = new Set(Object.keys(schema.properties));
  const required = schema.required || [];
  const ids = new Set(units.map((u) => u.concept_id));
  const report = [];
  for (const u of units) {
    const errs = [];
    const warns = [];
    const data = u;
    for (const k of Object.keys(data)) {
      if (k.startsWith('__') || k === 'content') continue;
      if (!allowed.has(k)) errs.push(`unknown key: ${k}`);
    }
    for (const k of required) {
      const v = data[k];
      const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
      if (empty) {
        const viaBody = schema.x_body_fields?.[k] && data.__byHeading?.[schema.x_body_fields[k].replace(/^##\s+/, '').toLowerCase()];
        if (!viaBody) errs.push(`missing required: ${k}`);
      }
    }
    for (const k of ['deep_article', 'linkedin_caption', 'real_life_example', 'business_example']) {
      const heading = schema.x_body_fields?.[k]?.replace(/^##\s+/, '').toLowerCase();
      const hasFront = !!data[k];
      const hasBody = heading ? !!data.__byHeading?.[heading] : false;
      if (!hasFront && !hasBody) errs.push(`missing body field: ${k}`);
    }
    const vc = data.visual_concepts || [];
    const tier = strict || data.status === 'approved' || data.status === 'published' ? 'strict' : 'seed';
    const minVisuals = tier === 'strict' ? 4 : 1;
    if (vc.length < minVisuals) errs.push(`visual_concepts ${vc.length} < ${minVisuals} (${tier})`);
    vc.forEach((v, i) => {
      for (const need of ['purpose', 'prompt']) {
        if (!v?.[need]) errs.push(`visual_concepts[${i + 1}].${need} empty`);
      }
      const head = String(v?.headline_on_image || '');
      if (head) {
        const words = head.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
        const links = head.split('→').length - 1;
        if (v.kind === 'explanation') {
          if (links < 2 || links > 6) errs.push(`visual ${i + 1}: framework chain must be 3-7 links`);
        } else {
          const limit = v.kind === 'quote' ? 12 : 10;
          if (words.length > limit) errs.push(`visual ${i + 1} headline ${words.length} words > ${limit} (IMAGE TEXT RULE)`);
        }
      }
      if (tier === 'strict' && String(v?.prompt || '').length < 120) errs.push(`visual_concepts[${i + 1}].prompt too thin to render`);
    });
    const tags = data.hashtags || [];
    if (tags.length > 5) errs.push(`hashtags ${tags.length} > 5`);
    else if (tier === 'strict' && tags.length < 3) errs.push(`hashtags ${tags.length} < 3`);
    if (tier === 'strict' && data.__words < 500) warns.push(`thin article: ${data.__words} words`);
    if (data.status === 'approved' && !data.reviewed_by) warns.push('awaiting author sign-off (reviewed_by: null)');
    const rel = data.related_concepts || [];
    if (tier === 'strict' && rel.length < 2) errs.push('fewer than 2 cross-links');
    for (const r of rel) {
      if (!ids.has(r)) warns.push(`dangling link: ${r}`);
    }
    if (data.world_id === 'brand-thinking' && data.concept_number !== undefined) {
      if (data.concept_number < 1 || data.concept_number > 50) errs.push('concept_number out of range');
    }
    const gaps = (data.__body || '').match(/NEEDS_AUTHOR_INPUT/g)?.length || 0;
    if (gaps) {
      (strict ? errs : warns).push(`${gaps}x NEEDS_AUTHOR_INPUT`);
    }
    if (new Set([...(data.hook ? [data.hook] : [])]).size !== 1) errs.push('hook missing');
    if (errs.length) report.push({ id: data.concept_id, file: data.__rel, level: 'error', issues: [...errs, ...warns] });
    else if (warns.length) report.push({ id: data.concept_id, file: data.__rel, level: 'warn', issues: warns });
  }
  // duplicate ids / numbers
  const seenId = new Map();
  for (const u of units) {
    if (seenId.has(u.concept_id)) report.push({ id: u.concept_id, file: u.__rel, level: 'error', issues: [`duplicate concept_id (also ${seenId.get(u.concept_id)})`] });
    else seenId.set(u.concept_id, u.__rel);
  }
  const seenNum = new Map();
  for (const u of units) {
    const k = `${u.world_id}#${u.concept_number}`;
    if (u.concept_number != null) {
      if (seenNum.has(k)) report.push({ id: u.concept_id, file: u.__rel, level: 'error', issues: [`duplicate concept_number ${u.concept_number} in world`], });
      else seenNum.set(k, u.__rel);
    }
  }
  const errors = report.filter((r) => r.level === 'error');
  return { ok: errors.length === 0, report, errors, warns: report.filter((r) => r.level === 'warn') };
}

export { WORLDS_DIR, ASSETS_DIR };
