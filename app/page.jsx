import Link from 'next/link';
import UniverseMap from '../components/UniverseMap.jsx';
import { loadWorlds, loadCore, stats, validateUnits, author } from '../lib/content.mjs';
import { loadCases, loadBusinessAreas, intakeStats, LANES, LANE_IDS } from '../lib/intake-bridge.mjs';

export const dynamic = 'force-static';

export default function Home() {
  const worlds = loadWorlds();
  const core = loadCore();
  const s = stats();
  const a = author();
  const gate = validateUnits();
  const laneStats = intakeStats();
  const laneCards = loadCases().length;
  const bizCards = loadBusinessAreas().length;

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="mono eyebrow">{a.philosophy}</div>
            <h1>
              Welcome to my
              <br />
              Thinking Universe
            </h1>
            <p className="lede" style={{ marginTop: 20 }}>
              Ideas I observe. Questions I ask. Frameworks I build.
            </p>
            <div className="row" style={{ marginTop: 26, gap: 14 }}>
              <Link className="btn" href="/worlds/brand-thinking" style={{ padding: '11px 16px' }}>
                Enter Brand Thinking · {worlds.find((w) => w.id === 'brand-thinking')?.unitCount || 0} concepts
              </Link>
              <Link className="btn" href="/graph" style={{ padding: '11px 16px' }}>
                See how ideas connect
              </Link>
            </div>
          </div>
          <div>
            <div className="hero-stats">
              <div className="stat">
                <b>{s.units}</b>
                <span>thinking units</span>
              </div>
              <div className="stat">
                <b>{s.worldsLive}/{s.worldsTotal}</b>
                <span>worlds live</span>
              </div>
              <div className="stat">
                <b>{s.edges}</b>
                <span>idea links</span>
              </div>
              <div className="stat">
                <b>{s.words.toLocaleString()}</b>
                <span>words written</span>
              </div>
            </div>
            <p className="kicker" style={{ marginTop: 18 }}>
              One Thinker. Many worlds. Ideas that link to other ideas.
            </p>
          </div>
        </div>
      </section>


      <section className="wrap section">
        <div className="section-head">
          <h2>Four shelves around one thinker</h2>
          <p>
            The main node is not a topic — it is the person. Thinking, researched cases, business areas and loose
            notes each get their own shape, their own shelf, and the same rule: your words stay yours.
          </p>
        </div>
        <div className="grid-2" style={{ gap: 14 }}>
          {LANE_IDS.map((id) => {
            const lane = LANES[id];
            const counts = laneStats.byLane.find((l) => l.lane === id);
            const owned = id === 'case' ? laneCards : id === 'business' ? bizCards : null;
            return (
              <Link key={id} className="panel" href={id === 'thinking' ? '/intake?lane=thinking' : id === 'case' ? '/cases' : id === 'business' ? '/business' : '/triage'} style={{ padding: 18, display: 'block' }}>
                <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                  <b style={{ fontSize: 17 }}>{lane.label}</b>
                  <span className="mono dim" style={{ fontSize: 12 }}>
                    {owned !== null ? `${owned} card(s)` : `${counts?.pending || 0} pending · ${counts?.drafted || 0} drafted`}
                  </span>
                </div>
                <p className="dim" style={{ margin: '6px 0 0', fontSize: 14.5 }}>{lane.one_line}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="wrap map">
        <div className="section-head">
          <h2>Universe map</h2>
          <p>Filled nodes are clickable. Planned nodes stay ghosts until the thinking exists — no empty pages on purpose.</p>
        </div>
        <div className="map-box">
          <UniverseMap worlds={worlds} />
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <h2>Worlds</h2>
          <p>
            Each node is a complete thinking world. Target {worlds[0]?.target || 50} concepts each, filled by the same engine.
          </p>
        </div>
        <div className="world-grid">
          {worlds.map((w) => (
            <WorldCard key={w.id} w={w} />
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="grid-2">
          <div>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2>The engine</h2>
            </div>
            <p className="dim" style={{ fontSize: 15 }}>
              This site is not a blog. It is the output end of a pipeline where the author's raw thinking is
              structured, deepened, packaged and linked — never replaced.
            </p>
            <code className="block">
{`TUSHAR THINKING CORE   (philosophy, beliefs, frameworks)
        ↓
NODE / WORLD           (Brand, Marketing, Life, Love, Science…)
        ↓
CONCEPT                (one contradiction per concept)
        ↓
THINKING UNIT          (hook → thesis → framework → article →
                        5 visuals → caption → quote → CTA)
        ↓
LINKS                  (related_concepts across worlds)`}
            </code>
            <div className="row" style={{ marginTop: 18 }}>
              <Link className="btn" href="/about#pipeline">Read the workflow</Link>
              <Link className="btn" href="/frameworks">{s.frameworks} frameworks</Link>
            </div>
          </div>
          <div>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2>Publication gate</h2>
            </div>
            <div className={`notice ${gate.ok ? 'ok' : ''}`}>
              <b>{gate.ok ? 'all units pass the schema contract' : `${gate.errors.length} blocking problem(s)`}</b>
              Every concept file is validated against <code>thinking-unit.schema.json</code> at build time: required
              fields, 5 visual directions with prompts, 3–5 hashtags, ≥2 cross-links, no orphan ids, no duplicate
              numbers. {gate.warns.length} non-blocking note(s).
            </div>
            <ul className="list-plain">
              <li>
                <b>Rule 01</b>
                <span>AI expands the author's thinking. AI never replaces it.</span>
              </li>
              <li>
                <b>Rule 02</b>
                <span>Thinking first. Content second. Design third.</span>
              </li>
              <li>
                <b>Rule 03</b>
                <span>Image = stop. Caption = think. Article = understand.</span>
              </li>
              <li>
                <b>Rule 04</b>
                <span>Nothing publishes without <code>approved</code> status + human sign-off.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <h2>Recurring ideas</h2>
          <p>Signatures that keep appearing across worlds — these are what make the universe one voice, not 500 posts.</p>
        </div>
        <div className="pill-row">
          {(core.recurring_ideas || []).map((r) => (
            <span className="chip" key={r} data-on="1" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--sans)', fontSize: 13.5, padding: '8px 13px' }}>
              {r}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}

function WorldCard({ w }) {
  const inner = (
    <>
      <div className="row" style={{ gap: 8 }}>
        <h3>{w.name}</h3>
        <span className="tag">{w.status}</span>
      </div>
      <p className="thesis">{w.thesis}</p>
      <div className="foot">
        <span className="mono dim">
          {w.unitCount}/{w.target} concepts
        </span>
        <span className="mono" style={{ color: w.live ? 'var(--accent)' : 'var(--muted)' }}>
          {w.live ? `${w.approvedCount} approved` : 'planned'}
        </span>
      </div>
      <div className="bar">
        <i style={{ width: `${Math.min(100, w.fill)}%` }} />
      </div>
    </>
  );
  const cls = 'world-card';
  return w.live ? (
    <Link className={cls} href={`/worlds/${w.id}`} data-live="1">
      {inner}
    </Link>
  ) : (
    <div className={cls} data-live="0">
      {inner}
    </div>
  );
}
