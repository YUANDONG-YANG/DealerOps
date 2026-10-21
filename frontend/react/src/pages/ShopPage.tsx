import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import FormDrawer from '../components/FormDrawer';
import PageState from '../components/PageState';
import { listPublicDealers, type PublicDealer } from '../api/publicDealers';
import { buyerSiteApi, type PublicInventory, type PublicVehicle } from '../api/buyerSite';
import { fieldErrorsOf } from '../api/http';
import { describeError } from '../api/errors';
import { enumLabel, km } from '../format';

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

/** Buyer site: /shop lists dealerships, /shop/:dealerId shows one dealership's listed vehicles. */
export default function ShopPage() {
  const { dealerId } = useParams();
  return (
    <div className="landing">
      <ShopHeader />
      {dealerId ? <DealerInventory dealerId={Number(dealerId)} /> : <DealerDirectory />}
    </div>
  );
}

function DealerDirectory() {
  const [dealers, setDealers] = useState<PublicDealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listPublicDealers()
      .then(setDealers)
      .catch(e => setError(describeError(e, 'load dealerships')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="landing-section">
      <h1>Shop used vehicles</h1>
      <p className="muted">Choose a dealership to see the vehicles it has listed.</p>
      <PageState loading={loading} error={error} empty={!loading && !error && !dealers.length}
        emptyText="No dealerships are listed yet." loadingText="Loading dealerships…">
        <div className="landing-grid">
          {dealers.map(d => (
            <Link key={d.id} to={`/shop/${d.id}`} className="card landing-card" style={{ textDecoration: 'none' }}>
              <h3>{d.legalName}</h3>
              <span className="muted">View inventory</span>
            </Link>
          ))}
        </div>
      </PageState>
    </section>
  );
}

function DealerInventory({ dealerId }: { dealerId: number }) {
  const [inventory, setInventory] = useState<PublicInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [asking, setAsking] = useState<PublicVehicle | null>(null);
  const [form, setForm] = useState(EMPTY_INQUIRY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [sentFor, setSentFor] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    buyerSiteApi.inventory(dealerId)
      .then(data => { if (active) setInventory(data); })
      .catch(e => { if (active) setError(describeError(e, 'load this dealership')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [dealerId]);

  function openInquiry(vehicle: PublicVehicle) {
    setAsking(vehicle);
    setFieldErrors({});
    setFormError('');
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!asking || sending) return;
    setSending(true);
    setFieldErrors({});
    setFormError('');
    try {
      const { message, ...contact } = form;
      await buyerSiteApi.inquire(dealerId, { vehicleId: asking.vehicleId, contact, message });
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
      <PageState loading={loading} error={error} loadingText="Loading vehicles…">
        {inventory && (
          <>
            <h1>{inventory.legalName}</h1>
            <p className="muted">
              {inventory.contactAddress} · <a href={smsFor(inventory.contactPhone)} title="Send a text message">{inventory.contactPhone}</a>
              {' · '}<a href={mailtoFor(inventory.contactEmail)}>{inventory.contactEmail}</a>
            </p>
            {sentFor && <p className="success-text" role="status">Thanks. {inventory.legalName} received your question about the {sentFor} and will contact you.</p>}
            {inventory.vehicles.length === 0 ? (
              <div className="state">No vehicles are listed right now.</div>
            ) : (
              <div className="landing-grid">
                {inventory.vehicles.map(v => (
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
              <textarea id="inquiry-message" className="input" rows={4} maxLength={1000} value={form.message}
                onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))} />
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
