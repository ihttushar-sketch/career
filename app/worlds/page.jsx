import Link from 'next/link';
import { loadWorlds } from '../../lib/content.mjs';

export const metadata = { title: 'Worlds' };
export const dynamic = 'force-static';

export default function WorldsIndex() {
  const worlds = loadWorlds();
  return (
    <div className="wrap">
      <section className="hero" style={{ display: 'block' }}>
        <div className="mono eyebrow">Node registry</div>
        <h1 style={{ fontSize: 'clamp(34px,5vw,58px)' }}>Worlds of the universe</h1>
        <p className="lede" style={{ marginTop: 14, maxWidth: '62ch' }}>
          A node opens only when the thinking inside it exists. {worlds.filter((w) => w.live).length} of {worlds.length}{' '}
          worlds are filled; the rest are architecture waiting for the author's observations — not placeholder pages.
        </p>
      </section>
      <section className="section">
        <ul className="list-plain">
          {worlds.map((w) => (
            <li key={w.id}>
              <b>{w.id}</b>
              <span>
                {w.live ? (
                  <Link href={`/worlds/${w.id}`} style={{ fontWeight: 700, fontSize: 18 }}>
                    {w.name}
                  </Link>
                ) : (
                  <span style={{ fontWeight: 700, fontSize: 18 }}>{w.name}</span>
                )}
                <span className="dim" style={{ display: 'block', fontSize: 14.5, marginTop: 2 }}>
                  {w.thesis}
                </span>
                <span className="mono dim" style={{ display: 'block', marginTop: 6 }}>
                  {w.unitCount}/{w.target} concepts · {w.approvedCount} approved · {w.status}
                  {w.live ? ' · open world →' : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
