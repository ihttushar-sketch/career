#!/usr/bin/env node
/**
 * Renders-to-units linker.
 *
 * Convention: drop a rendered image into thinking-universe/assets/ named
 *   <concept-number>_<anything>.png      e.g. 03_brand_delivers_meaning.png
 * and this script writes that file into the unit's visual_concepts[slot=1].asset_path
 * (or any slot whose `kind` matches a `-hero|explanation|real-life|business|quote-` name fragment).
 *
 * It edits only the asset_path line, so hand-tuned article text is never touched.
 * Re-running the content generator keeps these links (see scripts/build-content.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_ROOT } from '../lib/content.mjs';

const KINDS = ['hero', 'explanation', 'real-life', 'business', 'quote'];
const ASSETS = path.join(CONTENT_ROOT, 'assets');
const WORLDS = path.join(CONTENT_ROOT, 'worlds');

function units() {
  return fs
    .readdirSync(WORLDS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      fs
        .readdirSync(path.join(WORLDS, d.name))
        .filter((f) => f.endsWith('.md') && f !== 'INDEX.md')
        .map((f) => ({ world: d.name, file: path.join(WORLDS, d.name, f), base: f })),
    );
}

const byNumber = new Map();
for (const u of units()) {
  const m = /^(\d+)-/.exec(u.base);
  if (m) byNumber.set(`${u.world}#${Number(m[1])}`, u);
}

const IMG = /\.(png|jpe?g|webp|svg)$/i;
// images are grouped per world: assets/<world>/<nn>_<slug>.png ; flat files still work (legacy)
const images = [];
if (fs.existsSync(ASSETS)) {
  for (const entry of fs.readdirSync(ASSETS, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      for (const f of fs.readdirSync(path.join(ASSETS, entry.name))) {
        if (IMG.test(f)) images.push({ world: entry.name, name: f, path: path.join(ASSETS, entry.name, f) });
      }
    } else if (IMG.test(entry.name)) {
      images.push({ world: 'brand-thinking', name: entry.name, path: path.join(ASSETS, entry.name) });
    }
  }
}
let linked = 0;

for (const { world: imgWorld, name: img } of images) {
  const n = Number(/^(\d+)/.exec(img)?.[1]);
  if (!n) continue;
  const unit = byNumber.get(`${imgWorld}#${n}`);
  if (!unit) {
    console.log(`· ${imgWorld}/${img} → no unit ${n} in that world, skipped`);
    continue;
  }
  const kindIdx = KINDS.findIndex((k) => img.toLowerCase().includes(k));
  const slot = kindIdx >= 0 ? kindIdx + 1 : 1;
  const rel = `../../assets/${imgWorld}/${img}`;

  let raw = fs.readFileSync(unit.file, 'utf8');
  if (raw.includes(`asset_path: ${rel}`)) {
    console.log(`· ${imgWorld}/${img} → already linked in ${unit.base}`);
    continue;
  }
  // insert asset_path right after the slot line of the target visual
  const slotRe = new RegExp(`(  - slot: ${slot}\\n)`);
  if (!slotRe.test(raw)) {
    console.log(`! ${unit.base} has no slot ${slot}, skipped`);
    continue;
  }
  raw = raw.replace(slotRe, `$1    asset_path: ${rel}\n`);
  fs.writeFileSync(unit.file, raw, 'utf8');
  linked++;
  console.log(`✓ ${imgWorld}/${img} → ${unit.base} (slot ${slot})`);
}

console.log(`\n${images.length} rendered asset(s) across ${new Set(images.map((i) => i.world)).size} world folder(s), ${linked} newly linked.`);
