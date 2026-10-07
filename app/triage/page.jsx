import Link from 'next/link';
import TriageQueue from '../../components/TriageQueue.jsx';
import { triageQueue, loadWorlds, intakeStats, LANES, LANE_IDS, loadCases, loadBusinessAreas } from '../../lib/intake-bridge.mjs';

export const metadata = { title: 'Triage', description: 'Where each capture belongs — decided in one click.' };
export const dynamic = 'force-dynamic';

export default function TriagePage() {
  const items = triageQueue();
  const stats = intakeStats();
  const worlds = loadWorlds().map((w) => ({ id: w.id, name: w.name, unitCount: w.unitCount, target: w.target }));
  const lanes = LANE_IDS.map((id) => ({ id, label: LANES[id].label }));
  const shelves = [
    ['Thinking', stats.byLane.find((l) => l.lane === 'thinking')?.pending || 0],
    ['Cases', loadCases().length],
    ['Business', loadBusinessAreas().length],
    ['Notes', stats.byLane.find((l) => l.lane === 'note')?.pending || 0],
  ];

  return (
    <div className="wrap">
      <section className="hero" style={{ display: 'block' }}>
        <div className="mono eyebrow">Triage · the 10-second decision</div>
        <h1 style={{ fontSize: 'clamp(32px,4.6vw,52px)' }}>Which shelf does it belong to?</h1>
        <p className="lede" style={{ marginTop: 14, maxWidth: '58ch' }}>
          You capture whenever it comes. This is the only place that asks something back — and it asks one question:
          where does it live. Confirming never rewrites your words; <code>npm run draft</code> still refuses to invent a
          position you didn't give.
        </p>
        <div className="hero-stats" style={{ marginTop: 22, gridTemplateColumns: 'repeat(4, minmax(80px, 1fr))' }}>
          {shelves.map(([label, n]) => (
            <div key={label}>
              <b>{label === 'Cases' || label === 'Business' ? n : n}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <TriageQueue items={items} worlds={worlds} lanes={lanes} />
        <div className="row" style={{ marginTop: 18, gap: 10 }}>
          <Link className="btn" href="/intake">+ Capture something new</Link>
          <span className="mono dim">terminal: npm run intake -- --triage · npm run draft</span>
        </div>
      </section>
    </div>
  );
}
