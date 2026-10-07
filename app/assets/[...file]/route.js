import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_ROOT } from '../../../lib/content.mjs';

const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

export async function GET(_req, { params }) {
  const { file } = await params;
  const rel = (file || []).join('/');
  const base = path.resolve(CONTENT_ROOT, 'assets');
  const target = path.resolve(base, rel);
  // /assets/<file> fallback keeps old links alive (search inside world folders)
  let found = target;
  if (!fs.existsSync(found) && (file || []).length === 1) {
    const dirs = fs.existsSync(base) ? fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()) : [];
    for (const d of dirs) {
      const cand = path.join(base, d.name, rel);
      if (fs.existsSync(cand)) { found = cand; break; }
    }
  }
  if (!found.startsWith(base) || !fs.existsSync(found)) {
    return new Response('not found', { status: 404 });
  }
  const ext = path.extname(found).toLowerCase();
  return new Response(fs.readFileSync(found), {
    headers: {
      'content-type': TYPES[ext] || 'application/octet-stream',
      'cache-control': 'public, max-age=3600, immutable',
    },
  });
}
