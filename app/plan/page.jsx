import Link from 'next/link';
import { buildPlan } from '../../lib/plan.mjs';
import { loadWorlds, loadCases, loadBusinessAreas } from '../../lib/intake-bridge.mjs';

export const metadata = {
  title: 'Node readiness',
  description: 'Every node, what it holds, what it still needs from the author, and what other nodes are waiting on.',
};
export const dynamic = 'force-dynamic';

const TIER = (p) =>
  p.counts.approved >= p.target ? 'complete' : p.counts.approved > 0 ? 'partial' : p.counts.units > 0 ? 'drafting' : 'open';

export default function PlanPage() {
  const plans = loadWorlds().map((w) => ({ id: w.id, ...buildPlan(w.id) }));
  const totals = plans.reduce(
    (a, p) => ({
      approved: a.approved + p.counts.approved,
      drafts: a.drafts + p.counts.drafts,
      captures: a.captures + p.counts.pending,
      open: a.open + p.counts.open,
      reserved: a.reserved + p.counts.reserved,
    }),
    { approved: 0, drafts: 0, captures: 0, open: 0, reserved: 0 },
  );
  const cards = loadCases().length + loadBusinessAreas().length;

  return (
    <div className="wrap">
      <section className="hero" style={{ display: 'block' }}>
        <div className="mono eyebrow">Readiness · {plans.length} nodes × 50 slots</div>
        <h1 style={{ fontSize: 'clamp(32px,4.6vw,52px)' }}>What every node still needs from you</h1>
        <p className="lede" style={{ marginTop: 14, maxWidth: '60ch' }}>
          A node is “ready” here only when each of its 50 slots knows why it exists: signed off, drafted from your
          capture, or an open question taken from your own recurring ideas and open questions. No node is filled with a
          belief you did not give — that is the whole contract.
        </p>
        <div className="hero-stats" style={{ marginTop: 22, gridTemplateColumns: 'repeat(5, minmax(70px, 1fr))' }}>
          <div><b>{totals.approved}</b><span>signed off</span></div>
          <div><b>{totals.drafts}</b><span>draft shells</span></div>
          <div><b>{totals.captures}</b><span>captures waiting</span></div>
          <div><b className="dim">{totals.open}</b><span>slots open</span></div>
          <div><b>{cards}</b><span>case/business cards</span></div>
        </div>
        <div className="row" style={{ marginTop: 20, gap: 10 }}>
          <Link className="btn primary" href="/quick">Capture from my phone</Link>
          <Link className="btn" href="/triage">Triage queue</Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Per node</h2>
          <p>
            “Graph demand” = how many concepts in <i>other</i> nodes already point here and are still unanswered. That
            number is the honest priority order.
          </p>
        </div>
        <ul className="list-plain">
          {plans
            .slice()
            .sort((a, b) => b.counts.approved - a.counts.approved || b.counts.reserved - a.counts.reserved)
            .map((p) => (
              <li key={p.id} style={{ gridTemplateColumns: '1.1fr 1.5fr', padding: '14px 0' }}>
                <div>
                  <b style={{ fontSize: 16.5 }}>{p.world.name}</b>
                  <div className="mono dim" style={{ fontSize: 11.5 }}>{p.id}</div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="bar" style={{ flex: 1 }}>
                      <span style={{ width: `${Math.min(100, p.progress)}%` }} />
                    </span>
                    <span className="mono" style={{ fontSize: 12 }}>
                      {p.counts.approved}/{p.target}
                    </span>
                    <span className="chip">{TIER(p)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 14 }}>
                  <span className="mono" style={{ color: p.counts.reserved ? 'var(--accent)' : 'var(--muted)' }}>
                    {p.counts.reserved} waiting on this node
                  </span>
                  {p.counts.drafts ? ` · ${p.counts.drafts} draft shell(s)` : ''}
                  {p.counts.pending ? ` · ${p.counts.pending} capture(s) to triage` : ''}
                  <div className="dim" style={{ marginTop: 6 }}>{p.rows.find((r) => r.state.startsWith('open'))?.title || 'every slot has content'}</div>
                  <div className="row" style={{ gap: 10, marginTop: 8 }}>
                    <Link href={`/worlds/${p.id}`}>node</Link>
                    <Link href={`/intake?world=${p.id}`}>add thinking</Link>
                    <a href={`https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO || 'ihttushar-sketch/career'}/issues/new?template=capture.yml&node=${p.id}&lane=thinking`} rel="noreferrer">
                      phone capture →
                    </a>
                  </div>
                </div>
              </li>
            ))}
        </ul>
        <p className="dim" style={{ fontSize: 13.5, marginTop: 16 }}>
          Full per-slot detail lives next to each node: <code>thinking-universe/worlds/&lt;node&gt;/PLAN.md</code> ·
          regenerate with <code>npm run plan</code>
        </p>
      </section>
    </div>
  );
}
