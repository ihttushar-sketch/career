'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';

const CLUSTER_LABELS = {
  1: 'foundations',
  2: 'identity ↔ perception',
  3: 'strategy',
  4: 'market outcomes',
  5: 'craft & process',
  6: 'people & scale',
};

export default function ConceptBrowser({ units }) {
  const [q, setQ] = useState('');
  const [cluster, setCluster] = useState(0);
  const [onlyFull, setOnlyFull] = useState(false);

  const clusters = useMemo(() => {
    const set = new Set(units.map((u) => u.cluster).filter(Boolean));
    return [...set].sort((a, b) => a - b);
  }, [units]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return units.filter((u) => {
      if (cluster && u.cluster !== cluster) return false;
      if (onlyFull && u.__depth === 'structured') return false;
      if (!needle) return true;
      return [u.title, u.hook, u.frame, u.core_thesis, u.concept_id, ...(u.hashtags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [units, q, cluster, onlyFull]);

  return (
    <div>
      <div className="toolbar">
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search titles, hooks, frameworks, hashtags…"
          aria-label="Search concepts in this world"
        />
        <div className="chips">
          <button className="chip" data-on={!cluster ? '1' : undefined} onClick={() => setCluster(0)}>
            all {units.length}
          </button>
          {clusters.map((c) => (
            <button key={c} className="chip" data-on={cluster === c ? '1' : undefined} onClick={() => setCluster(cluster === c ? 0 : c)}>
              {CLUSTER_LABELS[c] || `cluster ${c}`}
            </button>
          ))}
          <button className="chip" data-on={onlyFull ? '1' : undefined} onClick={() => setOnlyFull(!onlyFull)}>
            expanded only
          </button>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="mono dim">
          showing {shown.length} of {units.length}
        </span>
        <span className="mono dim">
          depth: image 5–10s · caption 30–60s · article 5–10m
        </span>
      </div>
      <div className="concept-grid">
        {shown.map((u) => (
          <Link key={u.concept_id} href={u.__url} className="c-item">
            <span className="c-num">{String(u.concept_number).padStart(2, '0')}</span>
            <span>
              <span className="c-title">{u.title}</span>
              <span className="c-hook">{u.hook}</span>
            </span>
            <span className="c-side">
              <span className="tag" data-kind={u.__depth}>
                {u.__depth === 'full' ? 'deep article' : u.__depth === 'expanded' ? 'expanded' : 'structured'}
              </span>
              <span className="mono dim">{u.__words}w</span>
            </span>
          </Link>
        ))}
        {!shown.length && (
          <div className="c-item" style={{ gridColumn: '1 / -1' }}>
            <span className="c-num">--</span>
            <span>
              <span className="c-title">Nothing matches that yet</span>
              <span className="c-hook">
                Clear the search, or send the thought to the thinking core — a concept only exists once the author's
                position is written.
              </span>
            </span>
            <span className="c-side" />
          </div>
        )}
      </div>
    </div>
  );
}
