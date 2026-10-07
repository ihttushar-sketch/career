import Link from 'next/link';
import { author, stats } from '../lib/content.mjs';

export default function Footer() {
  const a = author();
  const s = stats();
  return (
    <footer className="footer">
      <div className="wrap sig">
        <div>
          <div className="mono" style={{ color: 'var(--accent)', marginBottom: 10 }}>
            {a.line}
          </div>
          <div className="name">{a.name}</div>
          <p style={{ margin: '6px 0 0', color: 'var(--ink-2)' }}>{a.role}</p>
          <p className="kicker" style={{ marginTop: 18 }}>
            Think differently. Build strategically.
          </p>
        </div>
        <ul>
          <li>
            <span>Website</span>
            <a href={`https://${a.website}`} target="_blank" rel="noreferrer">
              {a.website}
            </a>
          </li>
          <li>
            <span>Email</span>
            <a href={`mailto:${a.email}`}>{a.email}</a>
          </li>
          <li>
            <span>Phone</span>
            <a href={`tel:${a.phone.replace(/\s/g, '')}`}>{a.phone}</a>
          </li>
        </ul>
        <ul>
          <li>
            <span>Philosophy</span>
            {a.philosophy}
          </li>
          <li>
            <span>Engine</span>
            {a.engine}
          </li>
          <li>
            <span>Universe so far</span>
            {s.units} concepts · {s.words.toLocaleString()} words · {s.edges} links
          </li>
          <li>
            <span>Built from</span>
            <Link href="/about#pipeline">thinking-core → node → concept → content</Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
