import { loadBusinessAreas } from '../../lib/intake-bridge.mjs';
import LaneCards from '../../components/LaneCards.jsx';

export const metadata = {
  title: 'Business map',
  description: 'What you do, for whom, and what actually moves the needle — the offer side of the universe.',
};
export const dynamic = 'force-dynamic';

export default function BusinessPage() {
  return (
    <LaneCards
      eyebrow="Shelf 03 · the work itself"
      title="Business areas"
      lede="Thinking becomes offers, offers become proof, proof becomes content. This shelf keeps the commercial half of your thinking: who it is for, what the client believes before they arrive, what actually moves the needle, and what you are paid to touch. Pricing and results are always left as your questions to answer — the engine never guesses what you charge or what you achieved."
      cards={loadBusinessAreas()}
      kind="business"
      intakeHref="/intake?lane=business"
      emptyLine={'No areas filed yet. Save one:  npm run intake -- --add --lane business --thought "…"'}
    />
  );
}
