import { Link } from 'react-router-dom';
import BrandMark from '../components/BrandMark';

const SECTIONS: { title: string; text: string }[] = [
  {
    title: 'Ad compliance checks are not legal advice',
    text: 'The ad checker encodes the OMVIC disclosure rules that Dealer Ops was given as reference material. A passed check, a "Ready" ad, and an exported ad are not an OMVIC approval. Rules change: confirm current disclosure requirements with OMVIC before you publish an ad.',
  },
  {
    title: 'The AI review can be wrong',
    text: 'After the fixed rules pass, an AI model reviews the ad copy. It can miss a problem or flag one that is not there. Read every ad yourself before it is published.',
  },
  {
    title: 'Marketplace publishing is simulated',
    text: '"Simulate publish" on the ad page is a demonstration. It does not send the ad to Kijiji, AutoTrader.ca, or any other marketplace; Dealer Ops has no partner agreement with a listing platform. Ready ads do appear on the Dealer Ops buyer site.',
  },
  {
    title: 'Bill of sale template',
    text: 'The printable bill of sale is a starting template built from the vehicle, buyer, and payment records. It is not a reviewed legal contract and may not include every disclosure a bill of sale must carry. Check it before anyone signs it.',
  },
  {
    title: 'Payments are records only',
    text: 'Dealer Ops records payments the dealership has already received. It does not charge cards, move money, or connect to a bank.',
  },
  {
    title: 'Buyer site listings',
    text: 'Vehicles on the buyer site are listed by each dealership, which is responsible for the price, condition, and disclosures shown. Confirm every detail with the dealership before you buy. A question sent from the buyer site goes to that dealership, which keeps your name, email, phone, and address as a customer record.',
  },
  {
    title: 'Vehicle data',
    text: 'VIN decoding uses the public NHTSA vPIC catalog. Its results describe the model, not the individual vehicle, and can be incomplete.',
  },
];

/** Public disclaimer page, linked from the ad check result, the buyer site, and the bill of sale. */
export default function DisclaimerPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/" className="landing-brand"><BrandMark />Dealer Ops</Link>
        <nav className="landing-links" aria-label="Pages">
          <Link to="/shop">Shop</Link>
          <Link to="/login">Sign in</Link>
        </nav>
      </header>
      <section className="landing-section" style={{ maxWidth: 820 }}>
        <h1>Disclaimer</h1>
        <p className="muted">What Dealer Ops does and does not do. Last updated 2026-10-21.</p>
        {SECTIONS.map(s => (
          <div key={s.title} style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 18 }}>{s.title}</h2>
            <p>{s.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
