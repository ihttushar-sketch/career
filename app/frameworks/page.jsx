import Link from 'next/link';
import { loadCore, loadUnits, getUnit } from '../../lib/content.mjs';

export const metadata = { title: 'Framework library' };
export const dynamic = 'force-static';

export default function FrameworksPage() {
  const core = loadCore();
  const units = loadUnits();
  const byNumber = new Map(units.map((u) => [`${u.world_id}/${String(u.concept_number).padStart(2, '0')}`, u]));
  const named = (core.frameworks || []).map((f) => ({
    ...f,
    unit: byNumber.get(f.source_concept) || null,
  }));
  const namedChains = new Set(named.map((f) => String(f.name).toUpperCase().replace(/[^A-Z]/g, '')));
  const unitChains = units.filter((u) => {
    if (!u.framework) return false;
    const key = String(u.framework).toUpperCase().replace(/[^A-Z]/g, '');
    return ![...namedChains].some((n) => n.includes(key.slice(0, 18)) || key.includes(n.slice(0, 18)));
  });

  return (
    <div className="wrap">
      <section className="hero" style={{ display: 'block' }}>
        <div className="mono eyebrow">Reusable instruments</div>
        <h1 style={{ fontSize: 'clamp(34px,5vw,58px)' }}>Framework library</h1>
        <p className="lede" style={{ marginTop: 14, maxWidth: '60ch' }}>
          The chains that carry the thinking. A framework is only useful if it can be repeated from memory in a meeting
          where nobody is reading — so every one of these is 3–5 links long.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Named in the thinking core</h2>
          <p>Universe-level instruments, referenced across worlds.</p>
        </div>
        <ul className="list-plain">
          {named.map((f) => (
            <li key={f.id}>
              <b>{f.id}</b>
              <span>
                <span style={{ fontWeight: 700, fontSize: 17 }}>{f.name}</span>
                <span className="dim" style={{ display: 'block', fontSize: 14.5, marginTop: 3 }}>
                  {f.use}
                </span>
                {f.unit ? (
                  <Link className="mono" href={f.unit.__url} style={{ color: 'var(--accent)', display: 'inline-block', marginTop: 6 }}>
                    from · {f.unit.title} →
                  </Link>
                ) : (
                  <span className="mono dim" style={{ display: 'inline-block', marginTop: 6 }}>
                    source · {f.source_concept}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Every concept's chain</h2>
          <p>{unitChains.length} unit-level frameworks. Copy one into a brief, a caption or a whiteboard.</p>
        </div>
        <div className="concept-grid">
          {unitChains.map((u) => (
            <Link key={u.concept_id} href={u.__url} className="c-item" style={{ gridTemplateColumns: '34px 1fr' }}>
              <span className="c-num">{String(u.concept_number).padStart(2, '0')}</span>
              <span>
                <span className="c-title">{u.title}</span>
                <span
                  className="c-hook"
                  style={{ fontFamily: 'var(--mono)', fontSize: 11.5, letterSpacing: '0.04em', textTransform: 'uppercase' }}
                >
                  {u.framework}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
