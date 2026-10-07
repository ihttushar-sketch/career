import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_ROOT } from '../../../lib/content.mjs';

const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

export async function GET(_req, { params }) {
  const { file } = await params;
  const rel = (file || []).join('/');
  const base = path.resolve(CONTENT_ROOT, 'assets');
  const target = path.resolve(base, rel);
  if (!target.startsWith(base) || !fs.existsSync(target)) {
    return new Response('not found', { status: 404 });
  }
  const ext = path.extname(target).toLowerCase();
  return new Response(fs.readFileSync(target), {
    headers: {
      'content-type': TYPES[ext] || 'application/octet-stream',
      'cache-control': 'public, max-age=3600, immutable',
    },
  });
}
