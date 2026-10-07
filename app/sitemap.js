import { loadUnits, loadWorlds } from '../lib/content.mjs';

const base = process.env.SITE_URL || 'https://www.iliashossain.site';

export default function sitemap() {
  const now = new Date();
  const statics = ['/', '/worlds', '/frameworks', '/graph', '/about'].map((url) => ({ url: base + url, lastModified: now }));
  const worlds = loadWorlds().filter((w) => w.live).map((w) => ({ url: `${base}/worlds/${w.id}`, lastModified: now }));
  const units = loadUnits().map((u) => ({ url: `${base}/concepts/${u.concept_id}`, lastModified: now }));
  return [...statics, ...worlds, ...units];
}
