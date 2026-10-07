'use client';
import { useState } from 'react';

/**
 * One form, four shelves. The author picks the shelf only if he wants to — otherwise the
 * system proposes one and the capture waits in the triage queue. His words are sent as typed.
 */
export default function IntakeForm({ worlds = [], lanes = {}, initialWorld = 'auto', initialLane = 'thinking' }) {
  const [lane, setLane] = useState(initialLane);
  const [world, setWorld] = useState(initialWorld);
  const def = lanes[lane] || lanes.thinking;
  const keys = def.fields.map(([k]) => k);
  const [vals, setVals] = useState(() => Object.fromEntries([...keys, 'title', 'hook'].map((k) => [k, ''])));
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null);

  const set = (k) => (e) => setVals({ ...vals, [k]: e.target.value });
  const reset = () => {
    setVals(Object.fromEntries([...keys, 'title', 'hook'].map((k) => [k, ''])));
    setResult(null);
    setState('idle');
  };

  const markdown = () =>
    [
      '---',
      `lane: ${lane}`,
      `world: ${world}`,
      'status: pending',
      `created: ${new Date().toISOString().slice(0, 10)}`,
      'draft: null',
      '---',
      '',
      ...def.fields
        .filter(([k, , , v]) => (vals[k] || '').trim())
        .flatMap(([k, label]) => [`${label}:`, (vals[k] || '').trim(), '']),
    ].join('\n');

  async function submit(e) {
    e.preventDefault();
    const primary = (vals[keys[0]] || '').trim();
    if (!primary) {
      setState('short');
      return;
    }
    setState('saving');
    const payload = { lane, world, ...Object.fromEntries(keys.map((k) => [k, vals[k]])), title: vals.title, hook: vals.hook };
    try {
      const res = await fetch('api/intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'save failed');
      setResult(json);
      setState('saved');
    } catch {
      setState('offline');
    }
  }

  return (
    <form className="panel" onSubmit={submit} style={{ padding: 22 }}>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {Object.values(lanes).map((l) => (
          <button
            key={l.id}
            type="button"
            className={`chip ${lane === l.id ? 'active' : ''}`}
            onClick={() => {
              setLane(l.id);
              setResult(null);
              setState('idle');
            }}
            title={l.one_line}
          >
            {l.label}
          </button>
        ))}
      </div>
      <p className="dim" style={{ fontSize: 14, margin: '0 0 14px' }}>
        {def.one_line}
      </p>

      {def.fields.map(([k, label, help, required], i) => (
        <label key={k} className="field" style={{ marginBottom: 12 }}>
          <span className="mono" style={{ fontSize: 12, letterSpacing: '.08em' }}>
            {label}
            {required || (i === 0 && lane !== 'business') ? ' *' : ''}
          </span>
          <textarea
            value={vals[k] || ''}
            onChange={set(k)}
            rows={i === 0 ? 4 : 2}
            placeholder={help}
            style={{ width: '100%', marginTop: 6 }}
          />
        </label>
      ))}

      <div className="grid-2">
        <label className="field">
          <span className="mono" style={{ fontSize: 12, letterSpacing: '.08em' }}>
            NODE
          </span>
          <select value={world} onChange={(e) => setWorld(e.target.value)} style={{ width: '100%', marginTop: 6 }}>
            <option value="auto">auto — system প্রস্তাব করবে, আপনি triage-এ confirm করবেন</option>
            {worlds.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.unitCount}/{w.target})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="mono" style={{ fontSize: 12, letterSpacing: '.08em' }}>
            TITLE (optional)
          </span>
          <input value={vals.title || ''} onChange={set('title')} placeholder="মাথায় থাকলে—না থাকলে draft করার সময় জিজ্ঞেস করা হবে" style={{ width: '100%', marginTop: 6 }} />
        </label>
      </div>

      <div className="row" style={{ gap: 10, marginTop: 16, alignItems: 'center' }}>
        <button className="btn primary" type="submit" disabled={state === 'saving'}>
          {state === 'saving' ? 'saving…' : 'Save — যেকোনো সময়, অসম্পূর্ণই রাখুন'}
        </button>
        <span className="dim" style={{ fontSize: 13 }}>
          save করলেই inbox-এ বসে যায়; লেখা বদলায় না, কোনো position বানানো হয় না
        </span>
      </div>

      {state === 'short' ? <p className="error-line">প্রথম ঘরটা লিখুন বাকি সব optional। শুধু এক লাইনও চলবে।</p> : null}

      {state === 'saved' && result ? (
        <div className="notice" style={{ marginTop: 14 }}>
          <b>Saved</b>
          <p style={{ margin: '6px 0 0', fontSize: 14 }}>
            {result.savedTo}
            <br />
            shelf: <b>{result.lane}</b> · node: <b>{result.world || 'unfiled'}</b>
            {result.proposal ? ` · প্রস্তাব ${result.proposal.confidence}${result.proposal.needs_confirm ? ' →_triage-এ confirm করুন' : ''}` : ''}
          </p>
          <p className="mono dim" style={{ fontSize: 12, margin: '8px 0 0' }}>
            next: npm run draft — তারপর NEEDS_AUTHOR_INPUT গুলো ভরুন
          </p>
          <div className="row" style={{ gap: 10, marginTop: 10 }}>
            <button className="btn" type="button" onClick={reset}>
              + আরেকটা
            </button>
          </div>
        </div>
      ) : null}

      {state === 'offline' ? (
        <div className="notice" style={{ marginTop: 14 }}>
          <b>Server save হলো না (static hosting?) — এই ফাইলটা রাখুন</b>
          <p style={{ margin: '6px 0 0', fontSize: 13 }}>
            <code>thinking-universe/inbox/&hellip;</code> এ paste করুন, অথবা local-এ <code>npm run intake -- --add</code> ব্যবহার করুন।
          </p>
          <pre className="code" style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>
            {markdown()}
          </pre>
          <button
            className="btn"
            type="button"
            onClick={() => navigator.clipboard?.writeText(markdown())}
            style={{ marginTop: 10 }}
          >
            copy
          </button>
        </div>
      ) : null}
    </form>
  );
}
