import Link from 'next/link';

/**
 * One renderer for two shelves: researched cases and business areas.
 * Draft cards show their open questions on purpose — an unfinished card is honest,
 * a polished invented one would be the thing this universe exists to avoid.
 */
export default function LaneCards({ eyebrow, title, lede, cards = [], kind, intakeHref, emptyLine }) {
  const gaps = cards.reduce((s, c) => s + (c.__gaps || 0), 0);
  return (
    <div className="wrap">
      <section className="hero" style={{ display: 'block' }}>
        <div className="mono eyebrow">{eyebrow}</div>
        <h1 style={{ fontSize: 'clamp(32px,4.6vw,52px)' }}>{title}</h1>
        <p className="lede" style={{ marginTop: 14, maxWidth: '60ch' }}>{lede}</p>
        <div className="hero-stats" style={{ marginTop: 22, gridTemplateColumns: 'repeat(3, minmax(90px, 1fr))' }}>
          <div>
            <b>{cards.length}</b>
            <span>cards</span>
          </div>
          <div>
            <b className="gap-count">{gaps}</b>
            <span>questions open</span>
          </div>
          <div>
            <b>{cards.filter((c) => c.status === 'approved' || c.status === 'published').length}</b>
            <span>signed off</span>
          </div>
        </div>
        <div className="row" style={{ marginTop: 20, gap: 10 }}>
          <Link className="btn" href={intakeHref}>+ Add {kind === 'case' ? 'a case' : 'a business area'}</Link>
          <Link className="btn" href="/triage">Triage queue</Link>
        </div>
      </section>

      <section className="section">
        {cards.length === 0 ? (
          <div className="notice">
            <b>Nothing filed here yet</b>
            <p style={{ margin: '6px 0 0', fontSize: 14.5 }}>{emptyLine}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 18 }}>
            {cards.map((c) => (
              <article key={c.id} className="panel" style={{ padding: 22 }}>
                <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="shelf-tag">{kind}</span>
                  <span className="mono dim" style={{ fontSize: 12 }}>{c.id}</span>
                  <span className="mono" style={{ fontSize: 12, color: c.status === 'draft' ? 'var(--muted)' : 'var(--accent)' }}>
                    {c.status}
                    {c.__gaps ? ` · ${c.__gaps} open` : ''}
                  </span>
                </div>
                <h3 style={{ margin: '10px 0 4px', fontSize: 22 }}>{c.title || c.id}</h3>
                {kind === 'case' && c.company ? (
                  <p className="dim" style={{ margin: 0, fontSize: 14 }}>
                    {String(c.company).replace(/"/g, '')}
                    {c.industry ? ` · ${c.industry}` : ''}
                    {c.year ? ` · ${c.year}` : ''}
                  </p>
                ) : null}
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {Object.entries(c.__sections || {}).map(([h, v]) => (
                    <div key={h}>
                      <div className="mono" style={{ fontSize: 11.5, letterSpacing: '.1em', color: 'var(--muted)' }}>
                        {h.toUpperCase()}
                      </div>
                      <p
                        style={{
                          margin: '3px 0 0',
                          fontSize: 15.5,
                          color: String(v).includes('NEEDS_AUTHOR_INPUT') ? 'var(--muted)' : 'inherit',
                          fontStyle: String(v).includes('NEEDS_AUTHOR_INPUT') ? 'italic' : 'normal',
                        }}
                      >
                        {v || '—'}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  {(Array.isArray(c.world_links) ? c.world_links : c.world_links ? [c.world_links] : []).map((w) => (
                    <Link key={w} className="chip" href={`/worlds/${w}`}>
                      feeds {w}
                    </Link>
                  ))}
                  <span className="mono dim" style={{ fontSize: 11.5 }}>{c.__rel}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
