#!/usr/bin/env node
/**
 * Derives worlds/<world>/INDEX.md from the unit files themselves, so the series index can never
 * drift from the content. Run after adding or expanding concepts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadWorlds, unitsByWorld, CONTENT_ROOT } from '../lib/content.mjs';
import { WORLD } from '../data/index.mjs';

const CLUSTERS = {
  1: 'foundations',
  2: 'identity ↔ perception',
  3: 'strategy layer',
  4: 'market outcomes',
  5: 'craft & process',
  6: 'change, people & scale',
};

const worlds = loadWorlds();
const w = worlds.find((x) => x.id === WORLD.id);
const units = unitsByWorld(WORLD.id);
const pad = (n) => String(n).padStart(2, '0');

const rows = units.map((u) => {
  const art = u.__byHeading?.['deep article'] || '';
  const status = u.status === 'approved' || u.status === 'published' ? (u.__depth === 'full' ? 'expanded' : 'draft') : 'seed';
  const visual = `${(u.visual_concepts || []).length}${u.__assets?.length ? ' ✓' : ''}`;
  return `| ${pad(u.concept_number)} | \`${u.concept_id}\` | ${u.title} | ${u.hook} | ${u.framework} | ${art.length} | ${visual} | ${status} |`;
});

const byCluster = {};
for (const u of units) (byCluster[u.cluster] ||= []).push(u.concept_number);

const body = `# ${w.name} — Series Index

> Generated from the unit files by \`scripts/build-index.mjs\`. Do not hand-edit the table; edit the
> concept file (or its authored fields in \`data/\`) and regenerate.

**World:** \`${w.id}\` · **Thesis:** ${w.thesis}
**Coverage:** ${units.length}/${w.target} concepts · ${units.filter((u) => u.status === 'approved' || u.status === 'published').length} approved · ${units.filter((u) => u.__depth === 'full').length} deep articles
**Assets rendered:** ${units.filter((u) => u.__assets?.length).length} hero image(s) in \`thinking-universe/assets/\`

| # | concept_id | title | hook | framework | article chars | visuals | status |
|---|------------|-------|------|-----------|---------------|---------|--------|
${rows.join('\n')}

## Expansion order (by cluster)

${Object.entries(byCluster)
  .map(([c, nums]) => `${c}. **${CLUSTERS[c] || `cluster ${c}`}** — ${nums.map(pad).join(', ')}`)
  .join('\n')}

Read in cluster order to build the framework; read in number order to build the argument.

## What each row expands into

Every unit file carries, per \`thinking-unit.schema.json\`: hook, core thesis, the author's own words,
contrarian angle, simple breakdown, arrow framework, deep article (problem → common belief →
observation → argument → breakdown → plain words → example → counter-example → where it gets
misread → implications → meeting test → conclusion), real-life + business examples, 5 visual
directions with production prompts, publish-ready LinkedIn caption, quote, contextual CTA,
3–5 hashtags, cross-links and the author signature.
`;

const out = path.join(CONTENT_ROOT, 'worlds', WORLD.id, 'INDEX.md');
fs.writeFileSync(out, body, 'utf8');
console.log(`wrote ${path.relative(process.cwd(), out)} — ${units.length} rows, ${Math.round(body.length / 1024)} KB`);
