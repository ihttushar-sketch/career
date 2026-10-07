import { WORLD as W_A, UNITS as A } from './brand-thinking-units.mjs';
import { UNITS as B } from './brand-thinking-units.b.mjs';
import { UNITS as C } from './brand-thinking-units.c.mjs';
import { UNITS as D } from './brand-thinking-units.d.mjs';

export const WORLD = W_A;

export const UNITS = [...A, ...B, ...C, ...D]
  .sort((a, b) => a.n - b.n)
  .filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i);

export const HANDWRITTEN = new Set(UNITS.filter((u) => u.skip).map((u) => u.id));

export function expectedCount() {
  const nums = UNITS.map((u) => u.n);
  return { total: UNITS.length, min: Math.min(...nums), max: Math.max(...nums) };
}

export function gaps() {
  const have = new Set(UNITS.map((u) => u.n));
  const missing = [];
  for (let i = 1; i <= 50; i++) if (!have.has(i)) missing.push(i);
  return missing;
}

export function linkHealth() {
  const ids = new Set(UNITS.map((u) => u.id));
  const dangling = [];
  for (const u of UNITS) {
    for (const r of u.related || []) {
      if (!ids.has(r)) dangling.push({ from: u.id, to: r });
    }
  }
  const orphans = UNITS.filter((u) => (u.related || []).length === 0).map((u) => u.id);
  return { dangling, orphans };
}
