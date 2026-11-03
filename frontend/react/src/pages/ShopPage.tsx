import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import FormDrawer from '../components/FormDrawer';
import PageState from '../components/PageState';
import { listPublicDealers, type PublicDealer } from '../api/publicDealers';
import { buyerSiteApi, type PublicInventory, type PublicVehicle } from '../api/buyerSite';
import { fieldErrorsOf } from '../api/http';
import { describeError } from '../api/errors';
import { enumLabel, km } from '../format';

/** Matches the server limit on InquiryRequest.Message. */
const INQUIRY_MESSAGE_MAX = 1000;
const EMPTY_INQUIRY = { name: '', email: '', phone: '', homeAddress: '', message: '' };
const INQUIRY_FIELDS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'homeAddress', label: 'Home address', type: 'text' },
] as const;

function vehicleFacts(v: PublicVehicle): string {
  return [
    enumLabel(v.conditionCode),
    enumLabel(v.bodyType),
    km(v.mileageKm),
    v.exteriorColor,
    v.fuelType ? enumLabel(v.fuelType) : null,
  ].filter(Boolean).join(' · ');
}

// Money, e-mail addresses and phone numbers inside ad text, matched left to right; the e-mail
// alternative comes first so a numeric mailbox such as 13771566780@163.com is not read as a phone.
const AD_TOKEN = /(\$\d[\d,]*(?:\.\d{2})?)|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|(\+?\d[\d\s().-]{8,}\d)/g;

/** Mail subject and body prefilled with the ad the buyer is looking at. */
function mailtoFor(email: string, v?: PublicVehicle): string {
  const subject = v ? `Question about the ${v.modelYear} ${v.make} ${v.model}` : 'Question about your vehicles';
  const body = v
    ? `Hello,\n\nI am interested in this vehicle:\n${v.title}\n${v.modelYear} ${v.make} ${v.model} · ${vehicleFacts(v)}\n${window.location.href}\n\n`
    : `Hello,\n\n${window.location.href}\n\n`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Opens the device's messaging app with the number and a first line about the ad. */
function smsFor(phone: string, v?: PublicVehicle): string {
  const number = phone.replace(/[^\d+]/g, '');
  const text = v ? `Hi, I am interested in the ${v.modelYear} ${v.make} ${v.model}: ${v.title}` : 'Hi, I have a question about your vehicles.';
  return `sms:${number}?&body=${encodeURIComponent(text)}`;
}

/** Ad text with prices highlighted, phone numbers as SMS links and e-mail addresses as mail links. */
function AdText({ text, vehicle }: { text: string; vehicle?: PublicVehicle }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(AD_TOKEN)) {
    const [token, price, email, phone] = m;
    const at = m.index ?? 0;
    // Too few digits for a phone number (a mileage or a year range): leave it as plain text.
    if (phone && phone.replace(/\D/g, '').length < 10) continue;
    parts.push(text.slice(last, at));
    if (price) parts.push(<strong key={at} className="ad-price">{price}</strong>);
    else if (email) parts.push(<a key={at} href={mailtoFor(email, vehicle)}>{email}</a>);
    else parts.push(<a key={at} href={smsFor(phone, vehicle)} title="Send a text message">{token}</a>);
    last = at + token.length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

function ShopHeader() {
  return (
    <header className="landing-nav">
      <Link to="/" className="landing-brand"><BrandMark />Dealer Ops</Link>
      <nav className="landing-links" aria-label="Shop">
        <Link to="/shop">Dealerships</Link>
        <Link to="/disclaimer">Disclaimer</Link>
      </nav>
    </header>
  );
}

/** Buyer site: /shop lists dealerships, /shop/:dealer (the dealership's slug) shows its listed vehicles. */
export default function ShopPage() {
  const { dealer } = useParams();
  return (
    <div className="landing">
      <ShopHeader />
      {dealer ? <DealerInventory dealer={dealer} /> : <DealerDirectory />}
    </div>
  );
}

function DealerDirectory() {
  const [dealers, setDealers] = useState<PublicDealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    listPublicDealers()
      .then(setDealers)
      .catch(e => setError(describeError(e, 'load dealerships')))
      .finally(() => setLoading(false));
  }, []);

  // The address holds the city, so one box searches the name and the city.
  const term = query.trim().toLowerCase();
  const shown = term
    ? dealers.filter(d => `${d.legalName} ${d.contactAddress}`.toLowerCase().includes(term))
    : dealers;

  return (
    <section className="landing-section">
      <h1>Shop vehicles</h1>
      <p className="muted">Choose a dealership to see the vehicles it has listed.</p>
      <input type="search" className="input" aria-label="Search dealerships" placeholder="Search by dealership name or city"
        value={query} onChange={e => setQuery(e.target.value)} style={{ maxWidth: 360, margin: '8px 0 16px' }} />
      <PageState loading={loading} error={error} empty={!loading && !error && !shown.length}
        emptyText={dealers.length ? 'No dealerships match your search.' : 'No dealerships are listed yet.'}
        loadingText="Loading dealerships…">
        <div className="landing-grid">
          {shown.map(d => (
            <Link key={d.id} to={`/shop/${d.slug}`} className="card landing-card dealer-card" style={{ textDecoration: 'none' }}>
              {d.logoUrl && <div className="dealer-card-logo" role="img" aria-label={`${d.legalName} logo`}
                style={{ backgroundImage: `url("${d.logoUrl}")` }} />}
              <h3>{d.legalName}</h3>
              <div className="muted" style={{ fontSize: 13 }}>
                {d.contactAddress && <div>{d.contactAddress}</div>}
                {d.contactPhone && <div>{d.contactPhone}</div>}
                {d.contactEmail && <div>{d.contactEmail}</div>}
              </div>
              <div className="dealer-card-stats">
                <div><strong>{d.inStockCount.toLocaleString('en-CA')}</strong><span>In stock</span></div>
                <div><strong>{d.soldCount.toLocaleString('en-CA')}</strong><span>Sold</span></div>
              </div>
            </Link>
          ))}
        </div>
      </PageState>
    </section>
  );
}

function DealerInventory({ dealer }: { dealer: string }) {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<PublicInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [asking, setAsking] = useState<PublicVehicle | null>(null);
  const [form, setForm] = useState(EMPTY_INQUIRY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [sentFor, setSentFor] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    buyerSiteApi.inventory(dealer)
      .then(data => {
        if (!active) return;
        setInventory(data);
        // An id link (the dashboard and ad page know only the id) or an old name settles on the slug.
        if (dealer !== data.slug) navigate(`/shop/${encodeURIComponent(data.slug)}`, { replace: true });
      })
      .catch(e => { if (active) setError(describeError(e, 'load this dealership')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [dealer, navigate]);

  // Every word must match the year, make or model, so "2021 civic" narrows to that vehicle.
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const vehicles = (inventory?.vehicles ?? []).filter(v => {
    const text = `${v.modelYear} ${v.make} ${v.model}`.toLowerCase();
    return words.every(w => text.includes(w));
  });
  const messageLeft = INQUIRY_MESSAGE_MAX - form.message.length;

  function openInquiry(vehicle: PublicVehicle) {
    setAsking(vehicle);
    setFieldErrors({});
    setFormError('');
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!asking || !inventory || sending) return;
    setSending(true);
    setFieldErrors({});
    setFormError('');
    try {
      const { message, ...contact } = form;
      await buyerSiteApi.inquire(inventory.dealerId, { vehicleId: asking.vehicleId, contact, message });
      setSentFor(`${asking.modelYear} ${asking.make} ${asking.model}`);
      setForm(EMPTY_INQUIRY);
      setAsking(null);
    } catch (err) {
      const fields = fieldErrorsOf(err);
      setFieldErrors(fields);
      setFormError(Object.keys(fields).length ? 'Check the highlighted fields.' : describeError(err, 'send your question'));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="landing-section">
      <Link to="/shop" className="btn" style={{ marginBottom: 16 }}>← Back to dealerships</Link>
      <PageState loading={loading} error={error} loadingText="Loading vehicles…">
        {inventory && (
          <>
            <h1>{inventory.legalName}</h1>
            <p className="muted">
              {inventory.contactAddress} · <a href={smsFor(inventory.contactPhone)} title="Send a text message">{inventory.contactPhone}</a>
              {' · '}<a href={mailtoFor(inventory.contactEmail)}>{inventory.contactEmail}</a>
            </p>
            <div className="dealer-card-stats dealer-page-stats">
              <div><strong>{inventory.vehicles.length.toLocaleString('en-CA')}</strong><span>Vehicles listed</span></div>
            </div>
            {sentFor && <p className="success-text" role="status">Thanks. {inventory.legalName} received your question about the {sentFor} and will contact you.</p>}
            {inventory.vehicles.length > 0 && (
              <input type="search" className="input" aria-label="Search this dealership's vehicles"
                placeholder="Search by make, model or year" value={query} onChange={e => setQuery(e.target.value)}
                style={{ maxWidth: 360, margin: '8px 0 16px' }} />
            )}
            {inventory.vehicles.length === 0 ? (
              <div className="state">No vehicles are listed right now.</div>
            ) : vehicles.length === 0 ? (
              <div className="state">No vehicles match your search.</div>
            ) : (
              <div className="landing-grid">
                {vehicles.map(v => (
                  <article key={v.vehicleId} className="card landing-card shop-card" aria-label={`${v.modelYear} ${v.make} ${v.model}`}>
                    {v.photoUrl && <img src={v.photoUrl} alt={`${v.modelYear} ${v.make} ${v.model}`} loading="lazy"
                      style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 6 }} />}
                    <h3><AdText text={v.title} vehicle={v} /></h3>
                    <div className="muted">{v.modelYear} {v.make} {v.model}</div>
                    <div className="muted" style={{ fontSize: 13 }}>{vehicleFacts(v)}</div>
                    <p style={{ whiteSpace: 'pre-line' }}><AdText text={v.body} vehicle={v} /></p>
                    <button className="btn btn-primary" onClick={() => openInquiry(v)}>Ask about this vehicle</button>
                  </article>
                ))}
              </div>
            )}
            <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
              Listings are published by the dealership. Confirm the price, condition and all disclosures with the
              dealership before you buy. <Link to="/disclaimer">Disclaimer</Link>
            </p>
          </>
        )}
      </PageState>

      <FormDrawer title="Ask about this vehicle" open={asking != null} onClose={() => setAsking(null)}>
        {asking && (
          <form onSubmit={send}>
            <p><strong>{asking.modelYear} {asking.make} {asking.model}</strong></p>
            {INQUIRY_FIELDS.map(f => (
              <div className="form-item" key={f.key}>
                <label className="form-label form-required" htmlFor={`inquiry-${f.key}`}>{f.label}</label>
                <input id={`inquiry-${f.key}`} className="input" type={f.type} value={form[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                {fieldErrors[`contact.${f.key}`] && <div className="form-error">{fieldErrors[`contact.${f.key}`]}</div>}
              </div>
            ))}
            <div className="form-item">
              <label className="form-label form-required" htmlFor="inquiry-message">Message</label>
              <textarea id="inquiry-message" className="input" rows={4} maxLength={INQUIRY_MESSAGE_MAX} value={form.message}
                onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))} />
              {messageLeft <= 50 && (
                <div className="muted" style={{ fontSize: 12 }} aria-live="polite">
                  {messageLeft} of {INQUIRY_MESSAGE_MAX} characters left
                </div>
              )}
              {fieldErrors.message && <div className="form-error">{fieldErrors.message}</div>}
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              {inventory?.legalName} receives these details to answer you and keeps them as a customer record.
            </p>
            {formError && <p className="danger-text">{formError}</p>}
            <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sending…' : 'Send question'}</button>
          </form>
        )}
      </FormDrawer>
    </section>
  );
}
