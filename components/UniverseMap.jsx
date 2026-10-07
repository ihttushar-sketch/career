'use client';
import Link from 'next/link';

/**
 * Interactive universe map. Nodes are positioned on a ring around the thinker core.
 * Live worlds (with concepts) are filled + clickable; planned worlds are ghosted.
 */
export default function UniverseMap({ worlds = [], coreLabel = 'THINKING UNIVERSE', size = 720 }) {
  const R = size / 2;
  const ring = R * 0.72;
  const liveCount = worlds.filter((w) => w.unitCount > 0).length;
  const pts = worlds.map((w, i) => {
    const a = (i / worlds.length) * Math.PI * 2 - Math.PI / 2;
    return { ...w, x: R + Math.cos(a) * ring, y: R + Math.sin(a) * ring };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Thinking Universe node map">
      <defs>
        <radialGradient id="core" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fffdf8" />
          <stop offset="100%" stopColor="#efe9dc" />
        </radialGradient>
      </defs>
      <circle cx={R} cy={R} r={ring} fill="none" stroke="rgba(16,19,23,.10)" strokeDasharray="2 6" />
      {pts.map((p) => (
        <line key={`l-${p.id}`} className={p.unitCount ? 'spoke-live' : 'spoke'} x1={R} y1={R} x2={p.x} y2={p.y} />
      ))}
      {pts.map((p) => {
        const live = p.unitCount > 0;
        const r = live ? 16 + Math.min(14, (p.unitCount / p.target) * 14) : 8;
        const label = (p.name || p.id).toUpperCase();
        const anchor = p.x > R + 30 ? 'start' : p.x < R - 30 ? 'end' : 'middle';
        const dy = p.y > R + 30 ? 22 : p.y < R - 30 ? -18 : -16;
        const inner = (
          <g className="node" data-live={live ? '1' : '0'}>
            <circle cx={p.x} cy={p.y} r={r} fill={live ? 'rgba(184,116,42,.16)' : 'transparent'} stroke={live ? '#b8742a' : 'rgba(16,19,23,.28)'} strokeWidth={live ? 1.6 : 1} />
            {live ? <circle cx={p.x} cy={p.y} r={3} fill="#b8742a" /> : null}
            <text x={p.x + (anchor === 'start' ? r + 8 : anchor === 'end' ? -r - 8 : 0)} y={p.y + dy} textAnchor={anchor}>
              {label}
              {live ? ` · ${p.unitCount}/${p.target}` : ' · planned'}
            </text>
          </g>
        );
        return live ? (
          <Link key={p.id} href={`/worlds/${p.id}`}>
            {inner}
          </Link>
        ) : (
          <g key={p.id}>{inner}</g>
        );
      })}
      <circle cx={R} cy={R} r={46} fill="url(#core)" stroke="#101317" strokeWidth="1" />
      <text x={R} y={R - 4} textAnchor="middle" style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', fill: '#101317' }}>
        {coreLabel.split(' ')[0]}
      </text>
      <text x={R} y={R + 10} textAnchor="middle" style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', fill: '#101317' }}>
        {coreLabel.split(' ')[1]}
      </text>
      <text x={R} y={R + 30} textAnchor="middle" style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.1em', fill: '#757a82' }}>
        {liveCount} LIVE / {worlds.length} PLANNED
      </text>
    </svg>
  );
}
