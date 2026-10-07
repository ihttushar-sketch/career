import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Test isolation for a content-driven repo.
 *
 * These suites deliberately write real captures, shells and cards — that is the point of
 * testing an intake layer. So every test file snapshots the writable shelves before it runs
 * and puts the tree back byte-for-byte afterwards, no matter how it failed. Nothing here ever
 * touches git, so uncommitted author work is never rewritten by a test run.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const WRITABLE = [
  'thinking-universe/inbox',
  'thinking-universe/worlds',
  'thinking-universe/research',
  'thinking-universe/business',
];

const mdFiles = (dir) => {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...mdFiles(f));
    else if (e.name.endsWith('.md')) out.push(f);
  }
  return out;
};

export function snapshotContent() {
  const files = WRITABLE.flatMap((rel) => mdFiles(path.join(ROOT, rel)));
  const stamp = `${process.pid}-${Date.now()}`;
  const store = path.join(os.tmpdir(), `tushar-universe-${stamp}`);
  fs.mkdirSync(store, { recursive: true });
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    fs.mkdirSync(path.join(store, path.dirname(rel)), { recursive: true });
    fs.copyFileSync(f, path.join(store, rel));
  }
  return { store, files: files.map((f) => path.relative(ROOT, f)) };
}

export function restoreContent(snap) {
  if (!snap) return;
  const keep = new Set(snap.files);
  for (const rel of WRITABLE) {
    for (const f of mdFiles(path.join(ROOT, rel))) {
      const r = path.relative(ROOT, f);
      if (!keep.has(r)) fs.rmSync(f, { force: true });
    }
  }
  for (const r of snap.files) {
    const src = path.join(snap.store, r);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(path.join(ROOT, r)), { recursive: true });
    fs.copyFileSync(src, path.join(ROOT, r));
  }
  // remove dirs the tests created
  for (const rel of WRITABLE) {
    const base = path.join(ROOT, rel);
    if (!fs.existsSync(base)) continue;
    for (const e of fs.readdirSync(base, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const d = path.join(base, e.name);
      if (!mdFiles(d).length && fs.readdirSync(d).every((x) => !fs.statSync(path.join(d, x)).isDirectory())) fs.rmSync(d, { recursive: true, force: true });
    }
  }
  fs.rmSync(snap.store, { recursive: true, force: true });
}
