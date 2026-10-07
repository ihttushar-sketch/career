import Link from 'next/link';
import QuickCapture from '../../components/QuickCapture.jsx';
import { intakeStats } from '../../lib/intake-bridge.mjs';

export const metadata = {
  title: 'Quick capture',
  description: 'One box. Any device. Your thought lands in the inbox untouched.',
};
export const dynamic = 'force-dynamic';

export default function QuickPage({ searchParams }) {
  const sp = searchParams || {};
  const stats = intakeStats();
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO || 'ihttushar-sketch/career';

  return (
    <div className="wrap">
      <section className="hero" style={{ display: 'block' }}>
        <div className="mono eyebrow">Shelf-free capture · phone-first</div>
        <h1 style={{ fontSize: 'clamp(30px,4.4vw,46px)' }}>Throw it in now</h1>
        <p className="lede" style={{ marginTop: 12, maxWidth: '52ch' }}>
          Format, shelf and node are my problem later — not yours now. Write the line the way it came to you.
          {stats.pending ? ` (${stats.pending} capture(s) already waiting for triage.)` : ''}
        </p>
      </section>

      <section className="section" style={{ paddingTop: 6, maxWidth: 680 }}>
        <QuickCapture repo={repo} initialLane={sp.lane || 'auto'} />
        <p className="dim" style={{ fontSize: 13.5, marginTop: 14 }}>
          PC ছাড়া তিনটা পথ: এই পেজ (server চললে), <b>GitHub capture issue</b> (যেকোনো ব্রাউজার — Action inbox-এ
          বসিয়ে দেবে, PR-এ approve করবেন), অথবা আমাকে এখানেই লিখে দিন।{' '}
          <Link href="/intake">Full form →</Link> <Link href="/triage">Triage →</Link>{' '}
          <Link href="/plan">Node readiness →</Link>
        </p>
      </section>
    </div>
  );
}
