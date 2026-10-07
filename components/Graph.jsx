'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** deterministic layout: one hub per world on a ring, concepts on a ring around their hub */
export default function Graph({ graph, worlds, width = 1000, height = 620 }) {
  const [hover, setHover] = useState(null);
  const router = useRouter();
  const cx = width / 2;
  const cy = height / 2;
  const byWorld = new Map();
  for (const n of graph.nodes) {
    if (!byWorld.has(n.world)) byWorld.set(n.world, []);
    byWorld.get(n.world).push(n);
  }
  const worldIds = [...byWorld.keys()];
  const hubRing = Math.min(width, height) * 0.31;
  const hubs = {};
  worldIds.forEach((w, i) => {
    const a = (i / Math.max(1, worldIds.length)) * Math.PI * 2 - Math.PI / 2;
    hubs[w] = { x: cx + Math.cos(a) * hubRing, y: cy + Math.sin(a) * hubRing };
  });
  const pos = {};
  for (const [w, list] of byWorld) {
    const r = 42 + list.length * 2.05;
    list.forEach((n, i) => {
      const a = (i / list.length) * Math.PI * 2 - Math.PI / 2;
      pos[n.id] = { x: hubs[w].x + Math.cos(a) * r, y: hubs[w].y + Math.sin(a) * r, node: n, world: w };
    });
  }
  const active = hover ? new Set([hover, ...graph.edges.filter((e) => e.from === hover || e.to === hover).flatMap((e) => [e.from, e.to])]) : null;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Concept link graph" style={{ touchAction: 'manipulation' }}>
      {worldIds.map((w) => (
        <g key={`hub-${w}`}>
          <circle cx={hubs[w].x} cy={hubs[w].y} r={4} fill="#101317" />
          <text x={hubs[w].x} y={hubs[w].y - 10} textAnchor="middle" style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fill: '#757a82' }}>
            {w.replace(/-/g, ' ')} · {byWorld.get(w).length}
          </text>
        </g>
      ))}
      {graph.edges.map((e, i) => {
        const A = pos[e.from];
        const B = pos[e.to];
        if (!A || !B) return null;
        const dim = active && !(active.has(e.from) && active.has(e.to));
        return (
          <path
            key={i}
            d={`M ${A.x} ${A.y} Q ${(A.x + B.x) / 2} ${(A.y + B.y) / 2 - 26} ${B.x} ${B.y}`}
            className={e.cross ? 'glink glink-cross' : 'glink'}
            fill="none"
            opacity={dim ? 0.15 : 1}
          />
        );
      })}
      {Object.entries(pos).map(([id, p]) => {
        const on = !active || active.has(id);
        return (
          <g
            key={id}
            className="gnode"
            data-live={p.node.depth === 'full' ? '1' : '0'}
            opacity={on ? 1 : 0.28}
            onMouseEnter={() => setHover(id)}
            onMouseLeave={() => setHover(null)}
            onClick={() => router.push(`/concepts/${id}`)}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && router.push(`/concepts/${id}`)}
          >
            <title>{`${String(p.node.number).padStart(2, '0')} ${p.node.title}`}</title>
            <circle cx={p.x} cy={p.y} r={p.node.depth === 'full' ? 6 : 4.2} />
            {hover === id ? (
              <text x={p.x} y={p.y - 12} textAnchor="middle" style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700, fill: '#101317' }}>
                {String(p.node.number).padStart(2, '0')} {p.node.title}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
