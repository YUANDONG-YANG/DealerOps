import { type CSSProperties, type FormEvent, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { catalogApi, vinDecodeError, type VinDecode } from '../api/catalog'
import { getMe } from '../api/me'
import { accessToken, roleHome } from '../auth/login'
import { useSessionStore } from '../store/session'
import BrandMark from '../components/BrandMark'
import CheckMark, { type CheckResult } from '../components/CheckMark'
import LandingArt, { type LandingArtKind } from '../components/LandingArt'
import rav4 from '../assets/landing/rav4.webp'
import civic from '../assets/landing/civic.webp'
import f150 from '../assets/landing/f150.webp'
import conveyorCamry from '../assets/landing/conveyor/camry.jpg'
import conveyorCivic from '../assets/landing/conveyor/civic.jpg'
import conveyorCx5 from '../assets/landing/conveyor/cx5.jpg'
import conveyorF150 from '../assets/landing/conveyor/f150.jpg'
import conveyorRav4 from '../assets/landing/conveyor/rav4.jpg'
import conveyorTucson from '../assets/landing/conveyor/tucson.jpg'

const FEATURES: { title: string; text: string; art: LandingArtKind }[] = [
  { title: 'Vehicle inventory', text: 'Record every vehicle with the required fields, search and filter stock, and sell with a locked purchase history.', art: 'inventory' },
  { title: 'Customer records', text: 'Keep customer details in one place and link each customer to the vehicles they bought or are considering.', art: 'customers' },
  { title: 'Ad compliance', text: 'Check each ad against the cash, finance, and lease rules, then let AI review the copy before it can be exported.', art: 'compliance' },
  { title: 'Dealership assistant', text: 'Ask questions about your own stock and customers. The assistant reads data and never changes it.', art: 'assistant' },
  { title: 'Separate dealerships', text: 'Each dealership sees only its own records, and staff accounts are issued by the platform administrator.', art: 'tenants' },
  { title: 'Audit history', text: 'Every vehicle and customer change records who made it and when, newest first.', art: 'audit' },
]

const STEPS: { title: string; text: string; art: LandingArtKind }[] = [
  { title: 'Write the ad', text: 'Draft the listing for a vehicle in stock.', art: 'write' },
  { title: 'Run the check', text: 'Hard rules run first; a missing price or APR blocks the ad.', art: 'check' },
  { title: 'AI review', text: 'A real model reviews the copy. If it is unavailable, the ad is never shown as passed.', art: 'review' },
  { title: 'Export', text: 'Only a current passed check can be marked ready and exported.', art: 'export' },
]

type SampleRow = { label: string; result: CheckResult; note?: string }

// Illustrative ad checks for fictional vehicles: no dealership data is read (design/12). The row
// labels match the real ad-check checklist, so a visitor sees what a signed-in check shows.
const PREVIEW_ROWS: {
  vehicle: string; status: string; check: string; tone: string; photo: string
  ad: string; rows: SampleRow[]; verdict: string
}[] = [
  {
    vehicle: '2021 Toyota RAV4 XLE', status: 'In stock', check: 'Passed', tone: 'ok', photo: rav4,
    ad: 'Used 2021 Toyota RAV4 XLE, 48,200 km, accident-free. $31,900 plus HST and licensing. Example Motors, 403-555-0142.',
    rows: [
      { label: 'Dealership name and contacts', result: 'pass' },
      { label: 'New/used and year', result: 'pass' },
      { label: 'Price', result: 'pass' },
      { label: 'Condition', result: 'pass' },
      { label: 'AI review of the wording', result: 'pass' },
    ],
    verdict: 'Passed. The ad can be marked ready and exported.',
  },
  {
    vehicle: '2019 Honda Civic LX', status: 'In stock', check: 'Blocked', tone: 'bad', photo: civic,
    ad: 'Used 2019 Honda Civic LX. Drive it home for only $89 bi-weekly! Example Motors, 403-555-0142.',
    rows: [
      { label: 'Dealership name and contacts', result: 'pass' },
      { label: 'New/used and year', result: 'pass' },
      { label: 'APR', result: 'fail', note: 'A payment is quoted without the interest rate.' },
      { label: 'Finance term', result: 'fail', note: 'The number of payments is not stated.' },
      { label: 'Cash price or cost of borrowing', result: 'fail', note: 'Neither total is shown.' },
    ],
    verdict: 'Blocked. Add the three finance disclosures, then check again.',
  },
  {
    vehicle: '2022 Ford F-150 XLT', status: 'Sold', check: 'Stale', tone: 'warn', photo: f150,
    ad: 'Used 2022 Ford F-150 XLT, 36,000 km. Now $44,500 plus HST and licensing. Example Motors, 403-555-0142.',
    rows: [
      { label: 'Dealership name and contacts', result: 'pass' },
      { label: 'New/used and year', result: 'pass' },
      { label: 'Price', result: 'warn', note: 'The price was edited after the last check.' },
    ],
    verdict: 'Stale. An edit after the check voids the pass until the ad is checked again.',
  },
]

const SAMPLE_VIN = '1HGCM82633A004352'
// Decorative CTA conveyor: ads roll through the compliance gate and come out stamped. Stamps use
// the real check-status labels; an ad that does not pass shows why in place of its price.
const CTA_ADS: { car: string; price: string; tone: string; stamp: string; reason?: string; photo: string }[] = [
  { car: '2017 RAV4', price: '$21,900', tone: 'ok', stamp: 'Passed', photo: conveyorRav4 },
  { car: '2023 Civic', price: '$27,450', tone: 'bad', stamp: 'Blocked', reason: 'APR not stated', photo: conveyorCivic },
  { car: '2016 F-150', price: '$28,200', tone: 'ok', stamp: 'Passed', photo: conveyorF150 },
  { car: '2022 CX-5', price: '$31,800', tone: 'warn', stamp: 'Needs AI review', reason: 'Claim sent to AI', photo: conveyorCx5 },
  { car: '2017 Camry', price: '$17,100', tone: 'ok', stamp: 'Passed', photo: conveyorCamry },
  { car: '2022 Tucson', price: '$29,500', tone: 'ok', stamp: 'Passed', photo: conveyorTucson },
]
const CTA_STAGGER_S = 3


const VIN_FACTS = [
  ['Make', 'make'],
  ['Model', 'model'],
  ['Year', 'modelYear'],
  ['Body class', 'bodyClass'],
  ['Engine', 'engine'],
  ['Country', 'country'],
  ['Manufacturer', 'manufacturer'],
] as const satisfies readonly (readonly [string, keyof VinDecode])[]

function vinFacts(d: VinDecode) {
  return VIN_FACTS.map(([label, key]) => [label, d[key]] as const)
}

export default function LandingPage() {
  const role = useSessionStore(s => s.role)
  const setProfile = useSessionStore(s => s.setProfile)
  const [vin, setVin] = useState('')
  // The preview card whose sample check is open; clicking it again closes it.
  const [openSample, setOpenSample] = useState<number | null>(null)

  // The session store is filled by the route guard, so a fresh load of `/` with a stored token
  // has no role yet; load the profile here so the redirect below still applies (UI-02).
  const hasToken = !!accessToken()
  useEffect(() => {
    if (role || !hasToken) return
    let cancelled = false
    getMe().then(p => { if (!cancelled) setProfile(p) }).catch(() => { /* stay on the landing page */ })
    return () => { cancelled = true }
  }, [role, hasToken, setProfile])
  const [decoding, setDecoding] = useState(false)
  const [vinError, setVinError] = useState('')
  const [decoded, setDecoded] = useState<VinDecode>()

  async function decode(value?: string) {
    const v = (value ?? vin).trim()
    if (decoding) return
    if (!v) {
      setVinError('Enter a 17-character VIN.')
      return
    }
    setDecoding(true)
    setVinError('')
    try {
      setDecoded((await catalogApi.decodeVin(v)).data)
    } catch (err) {
      setDecoded(undefined)
      setVinError(vinDecodeError(err))
    } finally {
      setDecoding(false)
    }
  }

  function trySample() {
    setVin(SAMPLE_VIN)
    decode(SAMPLE_VIN)
  }

  function onVinSubmit(e: FormEvent) {
    e.preventDefault()
    decode()
  }

  // A signed-in user never sees the anonymous marketing page (UI-02). A dealer user with no
  // dealership goes to /dms as well, where the guard shows the activation notice (UI-03).
  if (role) return <Navigate to={roleHome(role)} replace />

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand"><BrandMark />Dealer Ops</div>
        <nav className="landing-links" aria-label="Sections">
          <a href="#features">Features</a>
          <a href="#vin">VIN decoder</a>
          <a href="#compliance">Compliance</a>
          <Link to="/shop">Shop vehicles</Link>
        </nav>
        <div className="landing-auth-links">
          <Link to="/register">Create account</Link>
          <Link to="/login"><button className="btn btn-primary">Sign in</button></Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">Dealership back office</span>
          <h1>Run your dealership with ads that are checked before they go out.</h1>
          <p className="muted">
            Dealer Ops brings vehicle inventory, customer records, and AI-reviewed ad compliance into one place
            for each dealership.
          </p>
          <div className="landing-actions">
            <Link to="/login"><button className="btn btn-primary btn-lg">Sign in</button></Link>
            <Link to="/register"><button className="btn btn-lg">Create account</button></Link>
            <a href="#vin"><button className="btn btn-lg">Decode a VIN</button></a>
          </div>
        </div>
        <div className="landing-preview" aria-label="Dashboard preview">
          <div className="landing-preview-head">
            <span>Inventory</span>
            <span className="muted">Sample ad checks · tap a car</span>
          </div>
          {PREVIEW_ROWS.map((row, i) => (
            <div key={row.vehicle}>
              <button type="button" className="landing-preview-row" aria-expanded={openSample === i}
                aria-controls={`sample-check-${i}`} onClick={() => setOpenSample(openSample === i ? null : i)}>
                <img src={row.photo} alt={`${row.vehicle}, front three-quarter view`} loading="lazy" />
                <div className="landing-preview-text">
                  <strong>{row.vehicle}</strong>
                  <span>{row.status}</span>
                </div>
                <span className={`landing-chip landing-chip-${row.tone}`}>{row.check}</span>
              </button>
              {openSample === i && (
                <div id={`sample-check-${i}`} className={`landing-sample landing-sample-${row.tone}`}>
                  <p className="landing-sample-ad">“{row.ad}”</p>
                  <ul>
                    {row.rows.map(r => (
                      <li key={r.label}>
                        <CheckMark result={r.result} />
                        <span>{r.label}{r.note && <span className="muted"> · {r.note}</span>}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="landing-sample-verdict">{row.verdict}</p>
                  <Link to="/login">Sign in to check your own ads →</Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="landing-section">
        <h2>Everything the back office needs</h2>
        <div className="landing-grid">
          {FEATURES.map(item => (
            <div key={item.title} className="card landing-card">
              <LandingArt kind={item.art} />
              <h3>{item.title}</h3>
              <p className="muted">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="vin" className="landing-section landing-vin">
        <div className="landing-vin-copy">
          <h2>Decode any VIN</h2>
          <p className="muted">
            Enter a VIN to look up the vehicle in the NHTSA vPIC catalog. Signed-in staff can decode a VIN in DMS to
            start a vehicle record with the make, model, and year filled in.
          </p>
          <form onSubmit={onVinSubmit} className="input-group">
            <input className="input" value={vin} onChange={e => setVin(e.target.value)}
              maxLength={17} placeholder="17-character VIN" aria-label="VIN" />
            <button type="submit" className="btn" disabled={decoding}>
              {decoding ? 'Decoding…' : 'Decode'}
            </button>
          </form>
          {vinError ? (
            <div className="danger-text landing-vin-hint">{vinError}</div>
          ) : (
            <div className="muted landing-vin-hint">
              No VIN handy?{' '}
              <button className="btn-link" onClick={trySample}>Try {SAMPLE_VIN}</button>
            </div>
          )}
        </div>
        <div className={`landing-vin-result${decoded ? '' : ' is-empty'}`} aria-live="polite">
          {decoded ? (
            <>
              <div className="landing-vin-head">
                <strong>{[decoded.modelYear, decoded.make, decoded.model].filter(Boolean).join(' ')}</strong>
                <span className="landing-chip landing-chip-ok">Decoded</span>
              </div>
              <dl className="landing-vin-facts">
                {vinFacts(decoded).map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value ?? 'Not reported'}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <div className="landing-vin-empty">
              <img src={f150} alt="" className="landing-vin-photo" />
              <span className="landing-eyebrow">Awaiting VIN</span>
              <strong className="landing-vin-title">Your vehicle, decoded</strong>
              <p className="landing-vin-lead">Vehicle details appear here:</p>
              <ul className="landing-vin-fields">
                {VIN_FACTS.map(([label]) => <li key={label}>{label}</li>)}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section id="compliance" className="landing-section">
        <h2>How an ad gets approved</h2>
        <ol className="landing-steps">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <LandingArt kind={step.art} />
              <span className="landing-step-num">{i + 1}</span>
              <h3>{step.title}</h3>
              <p className="muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-cta">
        <div className="cta-flow" aria-hidden="true">
          <div className="cta-gate"><span>Compliance check</span></div>
          {CTA_ADS.map((ad, i) => (
            <div key={ad.car} className={`cta-ad cta-ad-${ad.tone}`}
              style={{ '--d': `${-i * CTA_STAGGER_S}s` } as CSSProperties}>
              <img src={ad.photo} alt="" className="cta-ad-photo" />
              <strong>{ad.car}</strong>
              <span className="cta-ad-price">{ad.price}</span>
              {ad.reason && <span className="cta-ad-reason">{ad.reason}</span>}
              <span className="cta-ad-draft">Ad draft</span>
              <span className={`cta-ad-stamp landing-chip landing-chip-${ad.tone}`}>{ad.stamp}</span>
            </div>
          ))}
        </div>
        <h2>Ready to get started?</h2>
        <p className="muted">Sign in, or create an account and ask your platform administrator to add it to your dealership.</p>
        <Link to="/login"><button className="btn btn-primary btn-lg">Sign in</button></Link>{' '}
        <Link to="/register"><button className="btn btn-lg">Create account</button></Link>
      </section>

      <p className="landing-credit muted"><Link to="/disclaimer">Disclaimer</Link> · <Link to="/shop">Shop vehicles</Link></p>
      <p className="landing-credit muted">Vehicle photos by Stephen Andrews, Harrison Fitts, and Caleb White on Unsplash.
        Conveyor photos from Wikimedia Commons by HJUdall (CC0), and Elise240SX, ShangTW, MercurySable99 and Alexander Migl (CC BY-SA 4.0).</p>
    </div>
  )
}
