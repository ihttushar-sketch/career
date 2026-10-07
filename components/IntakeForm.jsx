'use client';
import { useState } from 'react';

const FIELDS = [
  ['thought', 'THOUGHT', 'আপনার মূল কথা—যেমনটা আপনি নিজে ভাবেন ঠিক তেমনি। এটা একমাত্র বাধ্যতামূলক।', true, 4],
  ['observation', 'OBSERVATION', 'আপনি বাস্তবে কী দেখেছেন যা অন্যরা দেখে না (client situation, numbers, behaviour)।', false, 3],
  ['angle', 'MY ANGLE / FRAMEWORK', 'ধাপের শিকল: A → B → C → D (৩–৫ ধাপ)। না দিলে drafting time প্রশ্ন হিসেবে থাকবে।', false, 1],
  ['wrong', 'WHAT OTHERS GET WRONG', 'সাধারণ ধারণাটা কী, যেটা নিয়ে আপনি কথা বলতে চান।', false, 2],
  ['why', 'WHY IT MATTERS', 'এটা বোঝা বা না বোঝায় business-এর কী ফেরে।', false, 2],
  ['example', 'REAL EXAMPLE', 'মাথায় আসা একটা ঘটনা (অ্যানোনিমাইজ করা)।', false, 2],
];

export default function IntakeForm({ worlds = [], initialWorld = 'brand-thinking' }) {
  const [world, setWorld] = useState(initialWorld);
  const [vals, setVals] = useState({ thought: '', observation: '', angle: '', wrong: '', why: '', example: '', title: '', hook: '' });
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null);

  const set = (k) => (e) => setVals({ ...vals, [k]: e.target.value });
  const markdown = () =>
    [
      '---',
      `world: ${world}`,
      'status: pending',
      `created: ${new Date().toISOString().slice(0, 10)}`,
      'draft: null',
      '---',
      '',
      'THOUGHT:',
      vals.thought,
      '',
      ...[
        ['OBSERVATION', vals.observation],
        ['MY ANGLE / FRAMEWORK', vals.angle],
        ['WHAT OTHERS GET WRONG', vals.wrong],
        ['WHY IT MATTERS', vals.why],
        ['TITLE', vals.title],
        ['HOOK', vals.hook],
        ['REAL EXAMPLE', vals.example],
      ]
        .filter(([, v]) => v.trim())
        .flatMap(([l, v]) => [`${l}:`, v.trim(), '']),
    ].join('\n');

  async function submit(e) {
    e.preventDefault();
    setState('sending');
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...vals, world }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'save failed');
      setResult(json);
      setState('saved');
    } catch (err) {
      setState('fallback');
      setResult({ error: String(err.message || err) });
    }
  }

  const label = 'font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); display:block; margin-bottom: 6px;';
  const hint = 'font-size: 13px; color: var(--muted); margin: 6px 0 0;';

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 18 }}>
      <div>
        <span style={{ ...label, color: 'var(--muted)' }}>Node / world</span>
        <div className="chips">
          {worlds.map((w) => (
            <button
              type="button"
              key={w.id}
              className="chip"
              data-on={world === w.id ? '1' : undefined}
              onClick={() => setWorld(w.id)}
              style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--sans)', fontSize: 13.5 }}
            >
              {w.name} <span className="dim" style={{ fontSize: 11 }}>{w.unitCount}/{w.target}{w.pending ? ` · inbox ${w.pending}` : ''}</span>
            </button>
          ))}
        </div>
      </div>

      {FIELDS.map(([key, label_, placeholder, required, rows]) => (
        <label key={key} style={{ display: 'block' }}>
          <span style={{ ...label, color: required ? 'var(--accent)' : 'var(--muted)' }}>
            {label_} {required ? '· required' : ''}
          </span>
          <textarea
            className="input"
            rows={rows}
            value={vals[key]}
            onChange={set(key)}
            placeholder={placeholder}
            style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 15.5 }}
          />
        </label>
      ))}

      <div className="grid-2">
        <label style={{ display: 'block' }}>
          <span style={{ ...label, color: 'var(--muted)' }}>TITLE (optional)</span>
          <input className="input" value={vals.title} onChange={set('title')} placeholder='দিলে ভালো, না দিলে drafting কাজে লাগানো প্রথম লাইন থেকে provisional title বানাবে' />
        </label>
        <label style={{ display: 'block' }}>
          <span style={{ ...label, color: 'var(--muted)' }}>HOOK (optional)</span>
          <input className="input" value={vals.hook} onChange={set('hook')} placeholder="যে লাইনটা মানুষকে থামাবে" />
        </label>
      </div>

      <div className="row">
        <button className="btn" type="submit" disabled={state === 'sending' || vals.thought.trim().length < 8} style={{ padding: '11px 16px' }}>
          {state === 'sending' ? 'saving…' : 'Save into this node’s inbox'}
        </button>
        <button
          className="btn"
          type="button"
          onClick={async () => {
            const blob = new Blob([markdown()], { type: 'text/markdown' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${new Date().toISOString().slice(0, 10)}-thought.md`;
            a.click();
          }}
          style={{ padding: '11px 16px' }}
        >
          download as .md
        </button>
        <button
          className="btn"
          type="button"
          style={{ padding: '11px 16px' }}
          onClick={() => navigator.clipboard?.writeText(markdown())}
        >
          copy block
        </button>
      </div>

      {state === 'saved' && (
        <div className="notice ok">
          <b>saved to inbox</b>
          <code>{result.savedTo}</code>
          <p style={{ margin: '8px 0 0', fontSize: 14.5 }}>
            এরপর: <code>npm run draft</code> → shell তৈরি হবে (আপনার লেখা হুবহু বসে যাবে, বাকি জায়গায়
            NEEDS_AUTHOR_INPUT প্রশ্ন) → আপনি পূরণ করবেন → <code>status: approved</code>।
          </p>
        </div>
      )}
      {state === 'fallback' && (
        <div className="notice">
          <b>server endpoint not reachable — this host is static</b>
          {result?.error} — তাই এই ব্লকটা কপি করে <code>thinking-universe/inbox/{world}/</code>-এ রাখুন, তারপর{' '}
          <code>npm run draft</code>।
          <pre className="prompt" style={{ marginTop: 10 }}>{markdown()}</pre>
        </div>
      )}
      <p style={{ ...hint, margin: 0 }}>
        Engine আপনার position বানায় না। খালি জায়গা থাকলে সেটা <code>NEEDS_AUTHOR_INPUT</code> লিখে রাখবে—guess করবে না।
      </p>
    </form>
  );
}
