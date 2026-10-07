import { addEntry, listInbox, intakeStats, template } from '../../../lib/intake.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const url = new URL(req.url);
  const world = url.searchParams.get('world');
  const want = url.searchParams.get('template');
  if (want) {
    return Response.json({ world: want, template: template(want) });
  }
  return Response.json({ stats: intakeStats(), entries: listInbox(world ? { world } : {}) });
}

/**
 * POST /api/intake  { world, thought, observation, angle, wrong, why, title, hook, example }
 * Writes ONE inbox file. Never writes a unit, never publishes.
 */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'send JSON' }, { status: 400 });
  }
  const thought = String(body.thought || '').trim();
  if (thought.length < 8) {
    return Response.json({ error: 'THOUGHT খালি—engine আপনার position বানায় না, আপনি লিখুন।' }, { status: 422 });
  }
  try {
    const { file, entry } = addEntry({
      world: body.world || 'brand-thinking',
      thought,
      title: body.title,
      hook: body.hook,
      fields: {
        observation: body.observation,
        angle: body.angle,
        wrong: body.wrong,
        why: body.why,
        example: body.example,
      },
    });
    return Response.json(
      {
        ok: true,
        savedTo: file.replace(`${process.cwd()}/`, ''),
        entry,
        next: 'npm run draft',
        note: 'shell তৈরি হলে NEEDS_AUTHOR_INPUT গুলো আপনি পূরণ করবেন, তারপর status: approved।',
      },
      { status: 201 },
    );
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 400 });
  }
}
