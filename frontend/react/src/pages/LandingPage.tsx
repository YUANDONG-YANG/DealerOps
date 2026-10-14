import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { catalogApi, vinDecodeError, type VinDecode } from '../api/catalog'
import BrandMark from '../components/BrandMark'
import LandingArt, { type LandingArtKind } from '../components/LandingArt'

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

const PREVIEW_ROWS = [
  { vehicle: '2021 Toyota RAV4 XLE', status: 'In stock', check: 'Passed', tone: 'ok', color: '#1e3a5f' },
  { vehicle: '2019 Honda Civic LX', status: 'In stock', check: 'Blocked', tone: 'bad', color: '#3b1f2b' },
  { vehicle: '2022 Ford F-150 XLT', status: 'Sold', check: 'Stale', tone: 'warn', color: '#2f3320' },
]

const SAMPLE_VIN = '1HGCM82633A004352'

function vinFacts(d: VinDecode) {
  return [
    ['Make', d.make],
    ['Model', d.model],
    ['Year', d.modelYear],
    ['Body class', d.bodyClass],
    ['Engine', d.engine],
    ['Country', d.country],
    ['Manufacturer', d.manufacturer],
  ] as const
}

export default function LandingPage() {
  const [vin, setVin] = useState('')
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

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand"><BrandMark />Dealer Ops</div>
        <nav className="landing-links" aria-label="Sections">
          <a href="#features">Features</a>
          <a href="#vin">VIN decoder</a>
          <a href="#compliance">Compliance</a>
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
            <span className="muted">Preview</span>
          </div>
          {PREVIEW_ROWS.map(row => (
            <Link key={row.vehicle} to="/login" className="landing-preview-row"
              style={{ background: row.color }}>
              <div className="landing-preview-text">
                <strong>{row.vehicle}</strong>
                <span>{row.status}</span>
              </div>
              <span className={`landing-chip landing-chip-${row.tone}`}>{row.check}</span>
            </Link>
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
              maxLength={17} placeholder="17-character VIN" />
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
        <div className="landing-vin-result" aria-live="polite">
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
                    <dd>{value ?? '—'}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <div className="landing-vin-empty muted">
              Vehicle details appear here: make, model, year, body class, engine, country, and manufacturer.
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
        <h2>Ready to get started?</h2>
        <p>Sign in, or create an account and ask your platform administrator to add it to your dealership.</p>
        <Link to="/login"><button className="btn btn-lg">Sign in</button></Link>{' '}
        <Link to="/register"><button className="btn btn-lg">Create account</button></Link>
      </section>

      <p className="landing-credit muted">Vehicle photos by Stephen Andrews, Harrison Fitts, and Caleb White on Unsplash.</p>
    </div>
  )
}
