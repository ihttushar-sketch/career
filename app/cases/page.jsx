import Link from 'next/link';
import { loadCases } from '../../lib/intake-bridge.mjs';
import LaneCards from '../../components/LaneCards.jsx';

export const metadata = {
  title: 'Researched cases',
  description: 'Real events, kept as evidence — numbers and interpretation stay the author’s.',
};
export const dynamic = 'force-dynamic';

export default function CasesPage() {
  const cards = loadCases();
  return (
    <LaneCards
      eyebrow="Shelf 02 · evidence"
      title="Researched cases"
      lede="A case is not a concept. It is something that actually happened, kept so a concept can point at it. The engine files what you paste and asks for the parts you have not researched — it never fills in a number, a source or a read of its own."
      cards={cards}
      kind="case"
      intakeHref="/intake?lane=case"
      emptyLine={'No cards yet. Save a case:  npm run intake -- --add --lane case --thought "…"'}
    />
  );
}
