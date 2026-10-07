import Link from 'next/link';
import { author, loadCore, stats, validateUnits, loadUnits } from '../../lib/content.mjs';

export const metadata = {
  title: 'About',
  description:
    'Md Ilias Hossain Tushar — Brand Marketing Strategist. How the Thinking Universe is built: thinking core → node → concept → content.',
};
export const dynamic = 'force-static';

export default function About() {
  const a = author();
  const core = loadCore();
  const s = stats();
  const units = loadUnits();
  const gate = validateUnits(units);
  const strictGate = validateUnits(units, { strict: true });
  const avg = Math.round(units.reduce((n, u) => n + u.__words, 0) / Math.max(1, units.length));

  return (
    <div className="wrap">
      <section className="hero" style={{ display: 'block' }}>
        <div className="mono eyebrow">{a.line}</div>
        <h1 style={{ fontSize: 'clamp(34px,5vw,64px)' }}>{a.name}</h1>
        <p className="lede" style={{ marginTop: 14 }}>
          {a.role}. I work in the gap between what a business shows and what people actually believe about it — that gap
          is where brand is built, and where most budgets leak.
        </p>
        <div className="row" style={{ marginTop: 22 }}>
          <div className="pill-row">
            <a className="btn" href={`https://${a.website}`} style={{ padding: '10px 14px' }}>
              {a.website}
            </a>
            <a className="btn" href={`mailto:${a.email}`} style={{ padding: '10px 14px' }}>
              {a.email}
            </a>
            <a className="btn" href={`tel:${a.phone.replace(/\s/g, '')}`} style={{ padding: '10px 14px' }}>
              {a.phone}
            </a>
          </div>
          <span className="mono dim" id="contact">
            strategy · positioning · brand systems
          </span>
        </div>
      </section>

      <section className="section">
        <div className="grid-2">
          <div>
            <div className="section-head" style={{ margin: '0 0 10px' }}>
              <h3>What this place is</h3>
            </div>
            <p>
              Not a blog, not a portfolio, not a content library. It is an intellectual ecosystem: my observations,
              organised into worlds, each world holding concepts, each concept carrying its own article, framework,
              visual system and caption. One thinker, many worlds.
            </p>
            <p className="dim" style={{ fontSize: 15 }}>
              The unit of this site is not the post. It is the <b>thinking unit</b> — one contradiction, one framework,
              one explainable position.
            </p>
          </div>
          <div>
            <div className="section-head" style={{ margin: '0 0 10px' }}>
              <h3>What it refuses to be</h3>
            </div>
            <ul className="list-plain">
              <li>
                <b>not volume</b>
                <span>500 AI-written marketing articles would prove nothing except that 500 articles can be generated.</span>
              </li>
              <li>
                <b>not motivation</b>
                <span>No quotes without a mechanism. If it cannot be applied on Monday, it is decoration.</span>
              </li>
              <li>
                <b>not a persona</b>
                <span>Every position here is a position I actually hold. Where I have not thought yet, the file says so.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>The pipeline</h2>
          <p>How a thought becomes a page. The author's job is 20% of this — and it is the part nobody else can do.</p>
        </div>
        <code className="block">
{`INPUT  (author, can be two lines)
  WORLD:   Brand Thinking
  THOUGHT: "মানুষ Product কেনে না — Product দিয়ে নিজের সমস্যা বা পরিচয় সমাধান করে।"
      ↓
ENGINE
  interpret → core thesis → contrarian angle → framework → deep article
  → examples → counter-example → 5 visual directions + prompts
  → linkedin caption → quote → contextual CTA → hashtags → cross-links
      ↓
GATE
  thinking-unit.schema.json  +  8 quality checks  +  human approval
      ↓
OUTPUT
  thinking-universe/worlds/<world>/<nn>-<id>.md   →   this site
      ↓
LINKS
  related_concepts across worlds  →  the graph stays alive`}
        </code>
        <div className="grid-2" style={{ marginTop: 22 }}>
          <div className="panel">
            <div className="mono">Rule that cannot be traded</div>
            <p style={{ margin: '10px 0 0', fontSize: 16.5 }}>
              AI expands the author's thinking; it never replaces it. The engine may structure, deepen, challenge,
              example and package — the intellectual position stays mine. Where the source is empty, the output says{' '}
              <code>NEEDS_AUTHOR_INPUT</code> instead of guessing.
            </p>
          </div>
          <div className="panel">
            <div className="mono">Layer order</div>
            <p style={{ margin: '10px 0 0', fontSize: 16.5 }}>
              Thinking first. Content second. Design third. Never design → post → find something to say.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Build state</h2>
          <p>Honest numbers from the content layer, read at build time.</p>
        </div>
        <div className="hero-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="stat">
            <b>
              {s.units}/{s.nodesPlanned}
            </b>
            <span>thinking units</span>
          </div>
          <div className="stat">
            <b>{s.full}</b>
            <span>deep articles</span>
          </div>
          <div className="stat">
            <b>{avg}</b>
            <span>avg words / unit</span>
          </div>
          <div className="stat">
            <b>{s.edges}</b>
            <span>cross-links</span>
          </div>
        </div>
        <div className={`notice ${gate.ok ? 'ok' : ''}`} style={{ marginTop: 20 }}>
          <b>{gate.ok ? 'content contract satisfied — every unit validates' : `${gate.errors.length} blocking issue(s)`}</b>
          Standard gate (approval tier): {gate.report.length} note(s). Strict mode (all units at publication depth,
          zero author gaps): {strictGate.errors.length} issue(s) — that is the remaining work, printed here so the
          roadmap cannot be quietly forgotten.
        </div>
        <ul className="list-plain">
          <li>
            <b>phase 01–03</b>
            <span>architecture locked · thinking core written · node structure defined — done</span>
          </li>
          <li>
            <b>phase 04–05</b>
            <span>Brand Thinking node filled: 50 concepts, template proven on concept 01 — done</span>
          </li>
          <li>
            <b>phase 06</b>
            <span>expansion workflow: authored fields → validated unit — done (this site is its output)</span>
          </li>
          <li>
            <b>phase 07</b>
            <span>author review of 10–20 concepts, then depth pass on the rest — next</span>
          </li>
          <li>
            <b>phase 08</b>
            <span>same engine on Marketing Thinking, Reality of Life, Love, Science — after Brand node is signed off</span>
          </li>
        </ul>
        <div className="row" style={{ marginTop: 20 }}>
          <Link className="btn" href="/worlds/brand-thinking">Open the prototype node</Link>
          <Link className="btn" href="/graph">See the graph</Link>
          <Link className="btn" href="/frameworks">Framework library</Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Philosophy, in one block</h2>
        </div>
        <blockquote className="prose" style={{ margin: 0, fontSize: 20, fontFamily: 'var(--serif)', fontStyle: 'italic', lineHeight: 1.5 }}>
          I don't want to build another content website. I want to build a universe where my observations become ideas,
          ideas become frameworks, frameworks become knowledge, and knowledge connects to other knowledge.
        </blockquote>
        <div className="pill-row" style={{ marginTop: 18 }}>
          {[
            core.master_philosophy,
            core.structural_philosophy,
            core.core_engine,
            core.positioning_line,
          ].map((x) => (
            <span className="chip" key={x} data-on="1" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--sans)', fontSize: 13.5 }}>
              {x}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
