'use client';
import { useState } from 'react';

/**
 * One box. That is the whole point: a thought that costs more than 10 seconds to record is a
 * thought that gets lost. Shelf and node are proposed later, at triage.
 */
export default function QuickCapture({ repo = '', initialLane = 'auto' }) {
  const [text, setText] = useState('');
  const [more, setMore] = useState('');
  const [lane, setLane] = useState(initialLane);
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null);

  const issueUrl = () => {
    const base = `https://github.com/${repo || 'ihttushar-sketch/career'}/issues/new`;
    const q = new URLSearchParams({
      title: `Capture: ${text.trim().slice(0, 46)}`,
      labels: 'capture',   // matches the template's field ids so every box arrives filled
      lane,
      node: 'auto',
      thought: text.trim(),
      observation: more.trim(),
    });
    return `${base}?${q.toString()}`;
  };

  async function save(e) {
    e.preventDefault();
    if (text.trim().length < 6) {
      setState('short');
      return;
    }
    setState('saving');
    const body = { lane: lane === 'auto' ? 'thinking' : lane, world: 'auto', thought: text, observation: more };
    try {
      const res = await fetch('api/intake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'failed');
      setResult(json);
      setState('saved');
      setText('');
      setMore('');
    } catch {
      setState('offline');
    }
  }

  return (
    <form className="panel" style={{ padding: 18 }} onSubmit={save}>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {[['auto', 'auto — পরে ঠিক হবে'], ['thinking', 'Thinking'], ['case', 'Case'], ['business', 'Business'], ['note', 'Note']].map(([id, label]) => (
          <button key={id} type="button" className={`chip ${lane === id ? 'on' : ''}`} onClick={() => setLane(id)}>
            {label}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={'যেমনটা মাথায় এসেছে তেমনি লিখুন। Banglish, ভাঙা বাক্য, সংখ্যা—যা খুশি। কোনো format লাগবে না।'}
        style={{ width: '100%', font: 'inherit', fontSize: 17, padding: 12, minHeight: 120 }}
        enterKeyHint="send"
      />
      <textarea
        value={more}
        onChange={(e) => setMore(e.target.value)}
        rows={2}
        placeholder="চাইলে আরেকটু: কী দেখেছেন, কার সাথে কথা বলেছেন (optional)"
        style={{ width: '100%', font: 'inherit', marginTop: 8, padding: 10 }}
      />

      <div className="row" style={{ gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn primary" type="submit" disabled={state === 'saving'}>
          {state === 'saving' ? 'saving…' : 'Save'}
        </button>
        {text.trim().length > 5 ? (
          <a className="btn" href={issueUrl()} target="_blank" rel="noreferrer">
            → GitHub issue দিয়ে পাঠান
          </a>
        ) : null}
        <span className="dim" style={{ fontSize: 12.5 }}>server না চললে issue path স্বয়ংক্রিয়ভাবে চলে আসবে</span>
      </div>

      {state === 'short' ? <p className="error-line">একটু লিখুন—৬ অক্ষর তো লাগবে।</p> : null}

      {state === 'saved' && result ? (
        <div className="notice" style={{ marginTop: 12 }}>
          <b>✓ ধরে রাখা হয়েছে</b>
          <p style={{ margin: '6px 0 0', fontSize: 14 }}>
            <code className="mono">{result.savedTo}</code>
            <br />
            shelf {result.lane} · node {result.world || 'unfiled'}
            {result.proposal ? ` · প্রস্তাব ${result.proposal.world || '?'}, confidence ${result.proposal.confidence}` : ''}
          </p>
          <p className="dim" style={{ fontSize: 13, margin: '8px 0 0' }}>
            কিছু মনে রাখতে হবে না — সপ্তাহে একবার <a href="/triage">/triage</a>-এ Confirm করুন, বাকিটা engine সামলাবে।
          </p>
        </div>
      ) : null}

      {state === 'offline' ? (
        <div className="notice" style={{ marginTop: 12 }}>
          <b>এই hosting-save হচ্ছে না — GitHub path ব্যবহার করুন</b>
          <p style={{ margin: '6px 0 10px', fontSize: 13.5 }}>
            নিচের বাটনে চাপলে issue-এর সব field আগে থেকে লেখা থাকবে, শুধু <b>Submit</b>। GitHub Action সেটাকে আপনার
            inbox-এ বসিয়ে দেবে (আপনার লেখা হুবহু)।
          </p>
          <a className="btn primary" href={issueUrl()} target="_blank" rel="noreferrer">
            Open prefilled capture issue
          </a>
          <button
            className="btn"
            type="button"
            style={{ marginLeft: 8 }}
            onClick={() => navigator.clipboard?.writeText(`THOUGHT:\n${text}\n\n${more ? `OBSERVATION:\n${more}` : ''}`)}
          >
            copy text
          </button>
        </div>
      ) : null}
    </form>
  );
}
