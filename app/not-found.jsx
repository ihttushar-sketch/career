import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap" style={{ padding: '110px 24px 90px' }}>
      <div className="mono" style={{ color: 'var(--accent)' }}>404 · missing thought</div>
      <h1 style={{ margin: '14px 0 12px' }}>That page does not exist yet</h1>
      <p className="lede">
        In this universe a URL is only created when the thinking behind it is written. Empty pages would make the
        archive look fuller than it is.
      </p>
      <div className="row" style={{ marginTop: 26 }}>
        <Link className="btn" href="/" style={{ padding: '10px 14px' }}>Back to the universe</Link>
        <Link className="btn" href="/worlds/brand-thinking" style={{ padding: '10px 14px' }}>Brand Thinking · 50 concepts</Link>
      </div>
    </div>
  );
}
