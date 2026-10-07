import fs from 'node:fs';
import path from 'node:path';
import { addEntry, listInbox, intakeStats, template, triageQueue, confirmEntry, LANES, LANE_IDS } from '../../../lib/intake.mjs';
import { routeText, loadCases, loadBusinessAreas } from '../../../lib/lane.mjs';

export const dynamic = 'force-dynamic';

/**
 * The author's inbox, over HTTP.
 *   GET  /api/intake                     → stats + queue + lane schema
 *   GET  /api/intake?template=case       → printable file for a shelf (and ?world=&lane=)
 *   POST /api/intake { lane, world, … }  → capture one thought / case / business area / note
 *   POST /api/intake { action:'confirm' }→ triage: file a capture in a shelf+node
 *   POST /api/intake { action:'route' }  → "where would this go?" without saving
 * Nothing here writes a unit, approves a status or publishes anything.
 */
export async function GET(req) {
  const url = new URL(req.url);
  const world = url.searchParams.get('world');
  const lane = url.searchParams.get('lane') || 'thinking';
  const want = url.searchParams.get('template');
  if (want) {
    return Response.json({ lane: want, world: world || 'unfiled', template: template(world || 'brand-thinking', want) });
  }
  return Response.json({
    lanes: LANE_IDS.map((id) => ({ id, label: LANES[id].label, one_line: LANES[id].one_line, fields: LANES[id].fields })),
    stats: intakeStats(),
    queue: triageQueue(),
    cases: loadCases().map((c) => ({ id: c.id, title: c.title, company: c.company, world_links: c.world_links, status: c.status, gaps: c.__gaps })),
    business: loadBusinessAreas().map((b) => ({ id: b.id, title: b.title, world_links: b.world_links, status: b.status, gaps: b.__gaps })),
    entries: listInbox(world ? { world } : {}),
  });
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'send JSON' }, { status: 400 });
  }

  if (body.action === 'route') {
    const text = String(body.thought || body.text || '');
    if (text.trim().length < 4) return Response.json({ error: 'কিছু একটা লিখুন—তারপর বলছি কোথায় বসে।' }, { status: 422 });
    return Response.json({ ok: true, proposal: routeText(text) });
  }

  if (body.action === 'confirm') {
    const f = String(body.file || '');
    const file = path.isAbsolute(f) ? f : path.resolve(process.cwd(), f);
    if (!file.includes(`${path.sep}thinking-universe${path.sep}inbox${path.sep}`) || !fs.existsSync(file)) {
      return Response.json({ error: 'সেই capture খুঁজে পাওয়া যায়নি' }, { status: 404 });
    }
    if (body.lane && !LANE_IDS.includes(body.lane)) return Response.json({ error: `unknown lane: ${body.lane}` }, { status: 400 });
    const e = confirmEntry(file, { world: body.world, lane: body.lane });
    return Response.json({ ok: true, file: path.relative(process.cwd(), file), lane: e.lane, world: e.world, next: 'npm run draft' });
  }

  const lane = body.lane && LANES[body.lane] ? body.lane : 'thinking';
  const contentKeys = LANES[lane].fields.map(([k]) => k);
  const primary = String(body.thought ?? body[contentKeys[0]] ?? '').trim();
  // only the shelf's own fields count as content — 'world' or 'lane' must not pass as thinking
  const hasAny = contentKeys.some((k) => typeof body[k] === 'string' && body[k].trim().length > 7);
  if (primary.length < 8 && !hasAny) {
    return Response.json({ error: `${LANES[lane].fields[0][1]} খালি—engine আপনার position বানায় না, আপনি লিখুন।` }, { status: 422 });
  }
  try {
    const out = addEntry({
      world: body.world || 'auto',
      lane,
      thought: primary,
      title: body.title,
      hook: body.hook,
      fields: Object.fromEntries(LANES[lane].fields.map(([k]) => [k, body[k]])),
    });
    return Response.json(
      {
        ok: true,
        savedTo: path.relative(process.cwd(), out.file),
        lane: out.lane,
        world: out.world,
        proposal: out.proposal
          ? { lane: out.proposal.lane, world: out.proposal.world, confidence: out.proposal.confidence, needs_confirm: out.proposal.needs_confirm, why: out.proposal.lane_why }
          : null,
        entry: out.entry,
        next: 'npm run draft',
        note: 'draft হলে NEEDS_AUTHOR_INPUT গুলো আপনি পূরণ করবেন, তারপর status: approved।',
      },
      { status: 201 },
    );
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 400 });
  }
}
