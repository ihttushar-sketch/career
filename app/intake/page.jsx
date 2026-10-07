import Link from 'next/link';
import IntakeForm from '../../components/IntakeForm.jsx';
import { loadWorlds, listInbox, intakeStats } from '../../lib/intake-bridge.mjs';

export const metadata = {
  title: 'Add thinking',
  description: 'Drop your own perception into any node. The engine structures it; it never replaces it.',
};
export const dynamic = 'force-dynamic';

export default function IntakePage({ searchParams }) {
  const sp = searchParams;
  const stats = intakeStats();
  const worlds = loadWorlds().map((w) => ({ ...w, pending: stats.byWorld.find((x) => x.id === w.id)?.pending || 0 }));
  const entries = listInbox();
  const pending = entries.filter((e) => e.status !== 'pending' || true).slice(0, 12);
  const initial = (sp && sp.world) || 'brand-thinking';

  return (
    <div className="wrap">
      <section className="hero" style={{ display: 'block' }}>
        <div className="mono eyebrow">Author input · the only irreplaceable layer</div>
        <h1 style={{ fontSize: 'clamp(34px,5vw,58px)' }}>Add your thinking to a node</h1>
        <p className="lede" style={{ marginTop: 14, maxWidth: '58ch' }}>
          One thought, in your own words, is enough to start. It lands in that node's inbox. <code>npm run draft</code>{' '}
          turns it into a Thinking Unit shell — your sentences placed verbatim, every missing position marked{' '}
          <code>NEEDS_AUTHOR_INPUT</code> instead of guessed.
        </p>
      </section>

      <section className="section">
        <div className="grid-2" style={{ gridTemplateColumns: '1.55fr 1fr', alignItems: 'start' }}>
          <div className="panel" style={{ padding: 24 }}>
            <IntakeForm worlds={worlds} initialWorld={initial} />
          </div>
          <div>
            <div className="section-head" style={{ margin: '0 0 10px' }}>
              <h3>Inbox</h3>
              <p>{stats.pending} waiting · {stats.drafted} drafted</p>
            </div>
            {pending.length ? (
              <ul className="list-plain">
                {pending.map((e) => (
                  <li key={e.id} style={{ gridTemplateColumns: '1fr' }}>
                    <b>
                      {e.world} · {e.status}
                    </b>
                    <span style={{ fontSize: 15 }}>
                      {e.fields.title || (e.fields.thought || '').replace(/\s+/g, ' ').slice(0, 96)}
                      {e.draft && e.draft !== 'null' ? (
                        <>
                          {' '}
                          <Link href={`/concepts/${e.id.replace(/^\d{4}-\d\d-\d\d-/, '')}`} className="mono" style={{ color: 'var(--accent)' }}>
                            → open shell
                          </Link>
                        </>
                      ) : (
                        <span className="mono dim" style={{ display: 'block', marginTop: 4 }}>
                          pending · run npm run draft
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="notice ok">
                <b>inbox empty</b>Save a thought above — or write it straight into{' '}
                <code>thinking-universe/inbox/&lt;world&gt;/</code> and run <code>npm run draft</code>.
              </div>
            )}

            <div className="panel" style={{ marginTop: 18 }}>
              <div className="mono">Coverage per node</div>
              <ul className="list-plain" style={{ marginTop: 8 }}>
                {worlds.map((w) => (
                  <li key={w.id} style={{ gridTemplateColumns: '1fr auto', padding: '9px 0', borderTop: 0 }}>
                    <span style={{ fontSize: 14.5 }}>
                      {w.unitCount ? (
                        <Link href={`/worlds/${w.id}`}>{w.name}</Link>
                      ) : (
                        w.name
                      )}
                    </span>
                    <span className="mono" style={{ color: w.unitCount ? 'var(--accent)' : 'var(--muted)' }}>
                      {w.unitCount}/{w.target}
                      {w.pending ? ` · inbox ${w.pending}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>What happens to your thought</h2>
          <p>Five steps, and only two of them belong to the machine.</p>
        </div>
        <code className="block">
{`1  YOU      write the perception              ← irreplaceable
2  ENGINE   inbox entry → unit shell           ← structure only, no invented positions
3  YOU      fill NEEDS_AUTHOR_INPUT, 2 links   ← irreplaceable
4  GATE     npm run check:strict               ← refuses thin or invented units
5  YOU      status: approved + reviewed_by     ← signature = accountability`}
        </code>
        <div className="row" style={{ marginTop: 18 }}>
          <Link className="btn" href="/worlds/brand-thinking">See a finished node</Link>
          <Link className="btn" href="/about#pipeline">Read the pipeline</Link>
          <Link className="btn" href="/graph">See where links point next</Link>
        </div>
      </section>
    </div>
  );
}
