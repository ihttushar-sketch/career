'use client';
import { useState } from 'react';

/** Confirm a shelf for a capture — one click, no rewriting of the author's words. */
export default function TriageQueue({ items = [], worlds = [], lanes = [] }) {
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState([]);
  const [picked, setPicked] = useState({});
  const [error, setError] = useState(null);

  async function confirm(item) {
    const choice = picked[item.file] || {};
    if (!choice.world && !choice.lane) {
      setError('একটা node (অথবা shelf) বেছে নিন—তাছাড়া confirm করার কিছু নেই।');
      return;
    }
    setError(null);
    setBusy(item.file);
    try {
      const res = await fetch('api/intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', file: item.file, world: choice.world, lane: choice.lane }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'confirm failed');
      setDone((d) => [...d, item.file]);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="panel" style={{ padding: 20 }}>
      {items.length === 0 ? (
        <p className="dim" style={{ margin: 0 }}>
          Queue empty — প্রতিটা capture filing হয়ে গেছে।
        </p>
      ) : null}
      {items.map((it) => (
        <div key={it.file} style={{ borderTop: '1px solid var(--line)', padding: '14px 0' }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="shelf-tag">{it.lane}</span>
            <span className="mono dim" style={{ fontSize: 12 }}>{it.confidence || 'no proposal'}</span>
            {it.why ? <span className="dim" style={{ fontSize: 12.5 }}>· {it.why}</span> : null}
          </div>
          <p style={{ margin: '6px 0 10px', fontSize: 15.5 }}>“{it.preview}”</p>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <select
              value={picked[it.file]?.world || ''}
              onChange={(e) => setPicked({ ...picked, [it.file]: { ...picked[it.file], world: e.target.value } })}
              style={{ padding: '8px 10px', font: 'inherit' }}
            >
              <option value="">node: {it.world}</option>
              {worlds.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.unitCount}/{w.target})</option>
              ))}
            </select>
            <select
              value={picked[it.file]?.lane || ''}
              onChange={(e) => setPicked({ ...picked, [it.file]: { ...picked[it.file], lane: e.target.value } })}
              style={{ padding: '8px 10px', font: 'inherit' }}
            >
              <option value="">shelf: {it.lane}</option>
              {lanes.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
            <button className="btn" type="button" onClick={() => confirm(it)} disabled={busy === it.file}>
              {done.includes(it.file) ? '✓ filed' : busy === it.file ? '…' : 'Confirm'}
            </button>
          </div>
        </div>
      ))}
      {error ? <p className="error-line">{error}</p> : null}
      {done.length ? (
        <p className="dim" style={{ fontSize: 13.5, margin: '12px 0 0' }}>
          {done.length} filed · এখন <code>npm run draft</code> চালালে shell/card তৈরি হবে
        </p>
      ) : null}
    </div>
  );
}
