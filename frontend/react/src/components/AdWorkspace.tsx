import type { ReactNode } from 'react';
import { useState } from 'react';
import { useSessionStore } from '../store/session';
import { checkStatusLabel, isCheckStatus, type Listing, type PriorUse, type RuleFinding } from '../api/listings';
import StatusTag from './StatusTag';
import FormDrawer from './FormDrawer';
import { DisclaimerSections } from '../pages/DisclaimerPage';
import { enumLabel } from '../format';

type ChecklistItem = { label: string; codes: string[] };

// Mirrors the rate / payment patterns in OmvicRuleEngine so the displayed checklist
// matches the finance rules the server will apply (spec 04 section 6).
const RATE_PATTERN = /\d+(?:\.\d+)?\s*%\s*(?:apr|annual percentage rate|financing|interest|rate)|(?:apr|financing|interest|rates?)\b[^.\n%]{0,20}?\d+(?:\.\d+)?\s*%/i;
const PAYMENT_PATTERN = /\$?\d[\d,]*(?:\.\d{2})?\s*(?:per\s+month|a\s+month|\/\s*mo(?:nth)?\b|monthly|bi-?weekly|weekly|per\s+week|\/\s*wk\b)|(?:monthly|bi-?weekly|weekly)\s+payments?\s*(?:of|from|:)?\s*\$\s*\d/i;

/** True when the finance disclosure rows apply: a finance ad, or a cash ad quoting a rate or payment. */
function financeTriggered(listing: Listing): boolean {
  if (listing.adKind === 'FINANCE') return true;
  if (listing.adKind !== 'CASH') return false;
  const text = `${listing.title || ''}\n${listing.body || ''}`;
  return RATE_PATTERN.test(text) || PAYMENT_PATTERN.test(text);
}

/** The disclosure checklist for this ad type and medium, each row tied to the rule codes that fail it. */
function buildChecklist(listing: Listing): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { label: 'Dealership name and contacts', codes: ['DEALER_NAME_MISSING', 'DEALER_CONTACT_MISSING', 'DEALER_CONTACT_INCOMPLETE'] },
    { label: 'Prior use (when applicable)', codes: ['PRIOR_USE_UNCLEAR'] },
    { label: 'New/used and year', codes: ['NEW_USED_NOT_STATED', 'YEAR_NOT_IN_COPY', 'YEAR_NEW_USED_CONTRADICTION'] },
    { label: 'Extended warranty (if any)', codes: ['WARRANTY_CLAIM_NEEDS_REVIEW', 'WARRANTY_TERMS_MISSING'] },
    { label: 'Price', codes: ['PRICE_MISSING'] },
    { label: 'Condition', codes: ['CONDITION_MISMATCH', 'CONDITION_UNDISCLOSED', 'CERTIFIED_NOT_IN_COPY'] },
  ];
  if (financeTriggered(listing)) {
    items.push(
      { label: 'APR', codes: ['FINANCE_APR_MISSING'] },
      { label: 'Finance term', codes: ['FINANCE_TERM_MISSING'] },
      { label: 'Cash price or cost of borrowing', codes: ['FINANCE_CASH_PRICE_MISSING'] },
    );
    if (listing.medium !== 'RADIO_TV_BILLBOARD') {
      items.push({ label: 'APR shown as prominently as the payment amount', codes: ['FINANCE_APR_PROXIMITY'] });
    }
  }
  if (listing.adKind === 'LEASE') {
    items.push(
      { label: 'Lease statement', codes: ['LEASE_STATEMENT_MISSING'] },
      { label: 'Lease term', codes: ['LEASE_TERM_MISSING'] },
      { label: 'Rent / payment', codes: ['LEASE_RENT_MISSING'] },
      { label: 'APR', codes: ['LEASE_APR_MISSING'] },
      { label: 'Down payment', codes: ['LEASE_DOWN_MISSING'] },
      { label: 'Annual kilometre allowance and excess charges', codes: ['LEASE_EXCESS_KM_MISSING', 'LEASE_ALLOWANCE_UNSTATED', 'LEASE_ALLOWANCE_NOT_IN_COPY', 'LEASE_ALLOWANCE_MISMATCH'] },
    );
  }
  return items;
}

// The engine only emits failures, so a pass is derived: after a completed check a row
// with no matching finding passed.
function checklistIcon(item: ChecklistItem, findings: RuleFinding[], evaluated: boolean): string {
  const matched = findings.filter((f) => item.codes.includes(f.ruleId));
  if (matched.some((f) => f.severity === 'BLOCK')) return '❌';
  if (matched.length) return '⚠️';
  return evaluated ? '✅' : '';
}

function findingIcon(finding: RuleFinding): string {
  return finding.severity === 'BLOCK' ? '❌' : '⚠️';
}

function emptyFindingsText(status: Listing['checkStatus']): string {
  if (status === 'AI_UNAVAILABLE') return 'AI review did not complete, so no findings are available. Run the check again.';
  if (status === 'PASSED') return 'No rule findings. Every checklist item passed.';
  return 'No rule findings yet. Save a draft and run check.';
}

interface Props {
  listing: Listing;
  onChange: (listing: Listing) => void;
  vehicle?: Record<string, unknown> | null;
  readOnly?: boolean;
  pickerSlot?: ReactNode;
  actionsSlot?: ReactNode;
}

/** The ad editor beside its last check result; the page supplies the vehicle picker and action buttons. */
export default function AdWorkspace({ listing, onChange, vehicle, readOnly, pickerSlot, actionsSlot }: Props) {
  const session = useSessionStore();
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const hasSelection = !!vehicle;
  const findings = listing.lastCheck?.ruleFindings || [];
  const aiNotes = listing.lastCheck?.aiNotes || [];
  const checklist = buildChecklist(listing);
  const statusLabel = checkStatusLabel(listing.checkStatus);
  const evaluated = listing.checkStatus === 'PASSED' || listing.checkStatus === 'BLOCKED';
  const formDisabled = !hasSelection || readOnly;

  return (
    <div className="ad-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {pickerSlot}
        <div className="card">
          <div className="card-header">Advertisement</div>
          {hasSelection ? (
            <>
              <p className="muted">
                Year {String(vehicle?.modelYear ?? 'not set')} · Condition {enumLabel(vehicle?.conditionCode) || 'not set'} · Dealership {session.dealerLegalName || 'not set'}
              </p>
              <p className="muted">
                Contact {session.dealerContactPhone || 'phone not set'} · {session.dealerContactEmail || 'email not set'} · {session.dealerContactAddress || 'address not set'}
              </p>
              <div className="form-item"><label className="form-label">Title</label>
                <input className="input" value={listing.title} disabled={formDisabled}
                  onChange={(e) => onChange({ ...listing, title: e.target.value })} />
              </div>
              <div className="form-item"><label className="form-label">Body</label>
                <textarea className="input" rows={10} value={listing.body} disabled={formDisabled}
                  onChange={(e) => onChange({ ...listing, body: e.target.value })} />
              </div>
              <div className="form-item"><label className="form-label">Type</label>
                <select className="select" value={listing.adKind} disabled={formDisabled}
                  onChange={(e) => onChange({ ...listing, adKind: e.target.value as 'CASH' | 'FINANCE' | 'LEASE' })}>
                  <option value="CASH">Cash</option><option value="FINANCE">Finance</option><option value="LEASE">Lease</option>
                </select>
              </div>
              <div className="form-item"><label className="form-label">Medium</label>
                <select className="select" value={listing.medium} disabled={formDisabled}
                  onChange={(e) => onChange({ ...listing, medium: e.target.value as 'ONLINE' | 'RADIO_TV_BILLBOARD' })}>
                  <option value="ONLINE">Online</option><option value="RADIO_TV_BILLBOARD">Radio / TV / Billboard</option>
                </select>
              </div>
              <div className="form-item"><label className="form-label">Previous use</label>
                <select className="select" value={listing.priorUse ?? ''} disabled={formDisabled}
                  onChange={(e) => onChange({ ...listing, priorUse: (e.target.value || null) as PriorUse | null })}>
                  <option value="">Not applicable / unknown</option>
                  <option value="POLICE_EMERGENCY">Police or emergency vehicle</option>
                  <option value="TAXI_LIMO">Taxi or limousine</option>
                  <option value="DAILY_RENTAL">Daily lease or rental</option>
                  <option value="OTHER">Other prior use</option>
                </select>
              </div>
              <div className="form-item"><label className="form-label">Extended warranty terms (if offered)</label>
                <textarea className="input" rows={3} maxLength={2000} value={listing.warrantyTerms ?? ''} disabled={formDisabled}
                  onChange={(e) => onChange({ ...listing, warrantyTerms: e.target.value || null })} />
              </div>
              {listing.adKind === 'LEASE' && <div className="form-item"><label className="form-label">Annual kilometre allowance</label>
                <input className="input" type="number" min={1} max={1000000} value={listing.annualKmAllowance ?? ''} disabled={formDisabled}
                  onChange={(e) => onChange({ ...listing, annualKmAllowance: e.target.value ? Number(e.target.value) : null })} />
              </div>}
              {readOnly && <p className="muted">This vehicle is sold. The advertisement is read-only.</p>}
              {actionsSlot}
            </>
          ) : (
            <div className="state">Select a vehicle to start.</div>
          )}
        </div>
      </div>
      <div className="card result-pane">
        <div className="card-header">Check result</div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>This check is not legal advice and is not an OMVIC approval.</p>
        <button type="button" className="btn-link" style={{ fontSize: 13, display: 'inline-block', marginBottom: 12 }}
          onClick={() => setDisclaimerOpen(true)}>Read the full disclaimer</button>
        <FormDrawer title="Disclaimer" open={disclaimerOpen} onClose={() => setDisclaimerOpen(false)}>
          <DisclaimerSections />
        </FormDrawer>
        {!hasSelection ? (
          <div className="state">Select a vehicle to start.</div>
        ) : (
          <>
            {isCheckStatus(listing.checkStatus) && (
              <div style={{ marginBottom: 12 }}><StatusTag status={listing.checkStatus}>{statusLabel}</StatusTag></div>
            )}
            <h4 style={{ margin: '16px 0 8px', fontSize: 15, fontWeight: 600 }}>Checklist</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {checklist.map((item) => (
                <li key={item.label} style={{ padding: '4px 0' }}>
                  {checklistIcon(item, findings, evaluated)} {item.label}
                </li>
              ))}
            </ul>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Marks show the last server check; pass or block comes from the server, not this list. The previous-use, warranty and kilometre answers on the left are part of that check.
            </p>
            <h4 style={{ margin: '16px 0 8px', fontSize: 15, fontWeight: 600 }}>Rule findings</h4>
            {findings.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {findings.map((f, i) => (
                  <li key={i} style={{ padding: '4px 0' }}>
                    {findingIcon(f)} <strong>{f.severity === 'BLOCK' ? 'Block' : 'Review'} · {f.ruleId}</strong>: {f.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{emptyFindingsText(listing.checkStatus)}</p>
            )}
            {aiNotes.length > 0 && (
              <>
                <h4 style={{ margin: '16px 0 8px', fontSize: 15, fontWeight: 600 }}>AI notes</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {aiNotes.map((n, i) => (
                    <li key={i} style={{ padding: '4px 0' }}>
                      <strong>{n.severity || 'Note'}{n.code ? ` · ${n.code}` : ''}</strong>: {n.message}
                      {n.explanation && n.explanation !== n.message && (
                        <div className="muted">{n.explanation}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
