import Link from 'next/link';
import ConceptBrowser from '../../../components/ConceptBrowser.jsx';
import { getWorld, unitsByWorld, loadCore, validateUnits } from '../../../lib/content.mjs';
import { listInbox } from '../../../lib/intake.mjs';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return loadCore()
    .world_registry.filter((w) => unitsByWorld(w.id).length)
    .map((w) => ({ world: w.id }));
}

export async function generateMetadata({ params }) {
  const { world } = await params;
  const w = getWorld(world);
  return {
    title: w ? w.name : 'World',
    description: w?.thesis,
  };
}

const slim = (u) => ({
  concept_id: u.concept_id,
  concept_number: u.concept_number,
  title: u.title,
  hook: u.hook,
  frame: u.framework,
  core_thesis: u.core_thesis,
  hashtags: u.hashtags,
  cluster: u.cluster,
  status: u.status,
  __depth: u.__depth,
  __words: u.__words,
  __url: u.__url,
});

export default async function WorldPage({ params }) {
  const { world } = await params;
  const w = getWorld(world);
  if (!w) return <NotFoundWorld id={world} />;
  const units = unitsByWorld(world);
  const gate = validateUnits(units);
  const full = units.filter((u) => u.__depth === 'full').length;
  const words = units.reduce((s, u) => s + u.__words, 0);
  const inbox = listInbox({ world });
  const pending = inbox.filter((e) => e.status === 'pending').length;
  const drafted = inbox.filter((e) => e.status === 'drafted').length;
  const prompts = units.reduce((s, u) => s + (u.visual_concepts || []).length, 0);

  return (
    <div className="wrap">
      <div className="crumbs mono">
        <Link href="/">Universe</Link> / <span>{w.name}</span>
      </div>
      <section className="article-head" style={{ display: 'block' }}>
        <div className="mono" style={{ color: 'var(--accent)' }}>
          Thinking world · node {String(world).replace(/-/g, ' ')}
        </div>
        <h1 style={{ margin: '10px 0 12px' }}>{w.name}</h1>
        <p className="hookline" style={{ maxWidth: '46ch' }}>
          {w.thesis}
        </p>
        {w.intro ? <p className="dim" style={{ maxWidth: '68ch', marginTop: 14, fontSize: 15.5 }}>{w.intro}</p> : null}
        <div className="row" style={{ marginTop: 22, gap: 12 }}>
          <Link className="btn" href={`/intake?world=${world}`} style={{ padding: '10px 14px' }}>
            + Add your thinking to this node
          </Link>
          <span className="mono dim">
            inbox: {pending} pending{drafted ? ` · ${drafted} drafted` : ''} — every node fills the same way Brand did
          </span>
        </div>
        <div className="hero-stats" style={{ marginTop: 18, gridTemplateColumns: 'repeat(4, minmax(90px, 1fr))' }}>
          <div className="stat">
            <b>
              {units.length}
              {units.length > w.target ? `+` : ''}
            </b>
            <span>concepts · {w.target} planned</span>
          </div>
          <div className="stat">
            <b>{full}</b>
            <span>deep articles</span>
          </div>
          <div className="stat">
            <b>{words.toLocaleString()}</b>
            <span>words</span>
          </div>
          <div className="stat">
            <b>{prompts}</b>
            <span>image prompts</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="row" style={{ marginBottom: 18 }}>
          <div className="section-head" style={{ margin: 0 }}>
            <h2>Series</h2>
            <p>Each entry is a thinking unit, not a post title.</p>
          </div>
          <span className="tag" data-kind={gate.ok ? 'full' : 'expanded'}>
            {gate.ok ? 'schema gate: pass' : `schema gate: ${gate.errors.length} issue(s)`}
          </span>
        </div>
        <ConceptBrowser units={units.map(slim)} />
      </section>

      <section className="section">
        <div className="grid-2">
          <div>
            <div className="section-head" style={{ margin: '0 0 12px' }}>
              <h3>How this world is ordered</h3>
            </div>
            <p className="dim" style={{ fontSize: 15 }}>
              Not 01→50 by ambition — by dependency. Foundations first (what a brand is not), then identity versus
              perception, then strategy, then what the market measures, then craft, then people and scale. Reading in
              this order builds the framework; reading in number order builds the argument.
            </p>
            <div className="chain">
              {['foundations', 'identity ↔ perception', 'strategy', 'market outcomes', 'craft & process', 'people & scale'].map((c) => (
                <b key={c}>{c}</b>
              ))}
            </div>
          </div>
          <div>
            <div className="section-head" style={{ margin: '0 0 12px' }}>
              <h3>Master logic of this node</h3>
            </div>
            <div className="chain">
              {['ASSET', 'SYSTEM', 'EXPERIENCE', 'PERCEPTION', 'PREFERENCE', 'LOYALTY'].map((s, i, arr) => (
                <span key={s} style={{ display: 'contents' }}>
                  <b>{s}</b>
                  {i < arr.length - 1 ? <span>→</span> : null}
                </span>
              ))}
            </div>
            <p className="dim" style={{ fontSize: 15, marginTop: 6 }}>
              Editorial rule for the whole series: the goal is never to prove Logo wrong — it is to put Logo in its
              correct place inside the larger brand system.
            </p>
            <div className="row" style={{ marginTop: 16 }}>
              <Link className="btn" href="/graph">See cross-node links</Link>
              <Link className="btn" href="/frameworks">Framework library</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function NotFoundWorld({ id }) {
  return (
    <div className="wrap" style={{ padding: '90px 24px' }}>
      <h1>This node is not open yet</h1>
      <p className="lede" style={{ marginTop: 16 }}>
        <code>{id}</code> exists in the architecture but has no thinking units. A world fills only from the author's
        own observations — the engine expands them, it does not imagine them.
      </p>
      <div className="row" style={{ marginTop: 24 }}>
        <Link className="btn" href="/worlds/brand-thinking">Open Brand Thinking</Link>
        <Link className="btn" href="/about#pipeline">See how a node gets filled</Link>
      </div>
    </div>
  );
}
