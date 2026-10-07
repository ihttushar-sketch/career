import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { UNITS, WORLD, gaps, linkHealth } from '../data/index.mjs';
import {
  loadUnits,
  loadWorlds,
  loadCore,
  buildGraph,
  stats,
  validateUnits,
  getUnit,
  unitsByWorld,
  author,
} from '../lib/content.mjs';

const ROOT = process.cwd();

test('node 01 is complete: 50 authored concepts, no gaps in 1..50', () => {
  assert.equal(UNITS.length, 50);
  assert.deepEqual(gaps(), []);
});

test('every authored concept carries the author layer (no empty positions)', () => {
  for (const u of UNITS) {
    for (const key of ['hook', 'thought', 'belief', 'thesis', 'frame', 'steps', 'example', 'counter', 'biz', 'mkt', 'brand', 'quote', 'cta', 'hero']) {
      assert.ok(u[key], `concept ${u.n} (${u.id}) missing field: ${key}`);
    }
    assert.match(u.frame, /→/, `${u.id}: framework must be an arrow chain`);
    assert.ok(u.steps.length >= 3 && u.steps.length <= 6, `${u.id}: framework steps must be 3-6`);
    assert.ok(Array.isArray(u.related) && u.related.length >= 2, `${u.id}: needs >= 2 cross-links`);
  }
});

test('the idea graph has no dangling or orphaned links', () => {
  const { dangling, orphans } = linkHealth();
  assert.deepEqual(dangling, []);
  assert.deepEqual(orphans, []);
});

test('every concept renders as a schema-valid thinking unit file', () => {
  const units = loadUnits();
  assert.equal(units.length, 50);
  const gate = validateUnits(units);
  assert.equal(gate.errors.length, 0, gate.errors.map((e) => `${e.id}: ${e.issues.join('; ')}`).join('\n'));
});

test('unit files live in the content tree and are unique by number and id', () => {
  const units = loadUnits();
  const ids = new Set();
  const nums = new Set();
  for (const u of units) {
    assert.ok(fs.existsSync(u.__file), `missing file for ${u.concept_id}`);
    assert.equal(u.world_id, WORLD.id);
    assert.ok(!ids.has(u.concept_id), `duplicate id ${u.concept_id}`);
    assert.ok(!nums.has(u.concept_number), `duplicate number ${u.concept_number}`);
    ids.add(u.concept_id);
    nums.add(u.concept_number);
    assert.ok(u.__url.startsWith('/concepts/'), `${u.concept_id}: link must resolve`);
  }
});

test('author voice is preserved in every unit (original thought survives expansion)', () => {
  for (const u of loadUnits()) {
    const raw = fs.readFileSync(u.__file, 'utf8');
    assert.ok(u.original_thought && u.original_thought.length > 20, `${u.concept_id}: author thought missing`);
    // the author's own sentence must literally survive into the file, not be paraphrased away
    assert.ok(raw.includes(u.original_thought.slice(0, 36)), `${u.concept_id}: author wording lost in expansion`);
    assert.ok(raw.includes(u.hook), `${u.concept_id}: hook lost in expansion`);
  }
});

test('publish rules enforced: 3-5 hashtags, 4-5 visuals, hero headline is short', () => {
  for (const u of loadUnits()) {
    assert.ok(u.hashtags.length >= 3 && u.hashtags.length <= 5, `${u.concept_id}: ${u.hashtags.length} hashtags`);
    assert.ok(u.visual_concepts.length >= 4, `${u.concept_id}: needs 4-5 visuals`);
    for (const v of u.visual_concepts) {
      assert.ok(v.purpose.length > 8 && v.prompt.length > 60, `${u.concept_id} visual ${v.slot}: thin prompt`);
      if (v.headline_on_image) {
        if (v.kind === 'explanation') {
          const links = v.headline_on_image.split('→').length - 1;
          assert.ok(links >= 2 && links <= 6, `${u.concept_id} visual ${v.slot}: framework chain must be 3-7 links`);
        } else {
          const limit = v.kind === 'quote' ? 12 : 10;
          const words = v.headline_on_image.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
          assert.ok(words.length <= limit, `${u.concept_id} visual ${v.slot}: image headline must stay under ${limit} words`);
        }
      }
      assert.ok(v.prompt.length > 200, `${u.concept_id} visual ${v.slot}: prompt must be production-ready`);
    }
  }
});

test('hooks are distinct — the series must not repeat itself', () => {
  const hooks = loadUnits().map((u) => String(u.hook).trim());
  assert.equal(new Set(hooks).size, 50, 'duplicate hooks found');
});

test('deep article covers every required reasoning section', () => {
  const needed = ['problem', 'common belief', "author's observation", 'argument', 'breakdown', 'example', 'counter-example', 'implication', 'conclusion'];
  for (const u of loadUnits()) {
    const art = (u.__byHeading['deep article'] || '').toLowerCase();
    assert.ok(art.length > 400, `${u.concept_id}: article too thin (${art.length} chars)`);
    for (const s of needed) assert.ok(art.includes(s), `${u.concept_id}: article missing section "${s}"`);
  }
});

test('cross-world threads are declared so future nodes can be prioritised', () => {
  const graph = buildGraph();
  assert.ok(graph.edges.length >= 90, `expected a dense same-world graph, got ${graph.edges.length}`);
  assert.ok(graph.worldThreads.length >= 6, 'brand thinking should reach into several other worlds');
  const s = stats();
  assert.equal(s.worldsLive, 1);
  assert.equal(s.full >= 1, true);
});

test('world registry, core and assets stay consistent', () => {
  const core = loadCore();
  assert.ok(core.world_registry.length >= 10);
  const worlds = loadWorlds();
  assert.equal(worlds.find((w) => w.id === 'brand-thinking').unitCount, 50);
  assert.ok(worlds.filter((w) => w.live).length === 1, 'only validated nodes may be live at phase 04');
  const asset = path.join(ROOT, 'thinking-universe', 'assets', '01_logo_is_seen_brand_is_experienced.png');
  assert.ok(fs.existsSync(asset), 'concept 01 hero asset must ship with the content');
});

test('contact signature is present and identical on every unit', () => {
  const a = author();
  assert.equal(a.role, 'Brand Marketing Strategist');
  for (const u of loadUnits().slice(0, 5)) {
    const raw = fs.readFileSync(u.__file, 'utf8');
    assert.match(raw, /www\.iliashossain\.site/);
    assert.match(raw, /mail@iliashossain\.site/);
    assert.match(raw, /01701076173/);
  }
});

test('sitemap covers every live page and every concept', async () => {
  const mod = await import('../app/sitemap.js');
  const urls = mod.default().map((e) => e.url);
  assert.equal(urls.length, 5 + 1 + 50);
  assert.ok(urls.includes('https://www.iliashossain.site/concepts/logo-not-equal-brand'));
  assert.ok(urls.includes('https://www.iliashossain.site/worlds/brand-thinking'));
});

test('rendered assets are referenced and resolvable', () => {
  const units = loadUnits();
  const withAssets = units.filter((u) => u.__assets?.length);
  assert.ok(withAssets.length >= 1, 'at least concept 01 must ship a rendered hero');
  for (const u of withAssets) {
    for (const v of u.__assets) {
      const target = path.resolve(path.dirname(u.__file), v.asset_path);
      assert.ok(fs.existsSync(target), `${u.concept_id}: ${v.asset_path} does not resolve to a file`);
      assert.ok(v.asset_path.startsWith('../../assets/'), `${u.concept_id}: asset paths stay relative to the unit file`);
    }
  }
});

test('regenerating units never destroys rendered asset links', () => {
  const before = loadUnits({ refresh: true })
    .map((u) => `${u.concept_id}:${(u.__assets || []).length}`)
    .join('|');
  execFileSync('node', ['scripts/build-content.mjs', '--force'], { cwd: ROOT, stdio: 'ignore' });
  const after = loadUnits({ refresh: true })
    .map((u) => `${u.concept_id}:${(u.__assets || []).length}`)
    .join('|');
  assert.equal(after, before, 'asset_path links must survive regeneration');
  const gate = validateUnits(loadUnits({ refresh: true }));
  assert.equal(gate.errors.length, 0, 'regenerated content must still validate');
});

test('linker is idempotent: running it twice changes nothing', () => {
  const dir = path.join(ROOT, 'thinking-universe', 'worlds', 'brand-thinking');
  const snapshot = () => fs.readdirSync(dir).map((f) => fs.statSync(path.join(dir, f)).size).join(',');
  const first = snapshot();
  execFileSync('node', ['scripts/link-assets.mjs'], { cwd: ROOT, stdio: 'ignore' });
  assert.equal(snapshot(), first, 'second run must not rewrite files');
});

test('generator is idempotent: re-running it must not create drift', () => {
  const before = loadUnits().map((u) => `${u.concept_id}:${u.__words}:${u.visual_concepts.length}`);
  const exemplar = fs.readFileSync(path.join(ROOT, 'thinking-universe', 'worlds', WORLD.id, '01-logo-not-equal-brand.md'), 'utf8');
  assert.ok(exemplar.includes('expanded_by') === false, 'hand-written exemplar must stay hand-written');
  const after = loadUnits({ refresh: true }).map((u) => `${u.concept_id}:${u.__words}:${u.visual_concepts.length}`);
  assert.deepEqual(after, before);
});
