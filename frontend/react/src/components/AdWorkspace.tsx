import type { ReactNode } from 'react';
import { useSessionStore } from '../store/session';
import { checkStatusLabel, isCheckStatus, type Listing, type RuleFinding } from '../api/listings';
import StatusTag from './StatusTag';

type ChecklistItem = { label: string; codes: string[] };

function buildChecklist(listing: Listing): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { label: 'Dealership name and contacts', codes: ['DEALER_NAME_MISSING', 'DEALER_CONTACT_MISSING', 'DEALER_CONTACT_INCOMPLETE'] },
    { label: 'Prior use (when applicable)', codes: ['PRIOR_USE_UNCLEAR'] },
    { label: 'New/used and year', codes: ['YEAR_NOT_IN_COPY', 'YEAR_NEW_USED_CONTRADICTION'] },
    { label: 'Extended warranty (if any)', codes: ['WARRANTY_CLAIM_NEEDS_REVIEW'] },
    { label: 'Price', codes: ['PRICE_MISSING'] },
    { label: 'Condition', codes: ['CONDITION_MISMATCH', 'CONDITION_UNDISCLOSED', 'CERTIFIED_NOT_IN_COPY'] },
  ];
  if (listing.adKind === 'FINANCE') {
    items.push(
      { label: 'APR', codes: ['APR_MISSING', 'APR_INVALID', 'FINANCE_APR_MISSING'] },
      { label: 'Finance term', codes: ['FINANCE_TERM_MISSING', 'FINANCE_TERM_INVALID'] },
      { label: 'Cash price', codes: ['PRICE_MISSING'] },
    );
    if (listing.medium !== 'RADIO_TV_BILLBOARD') {
      items.push({ label: 'Rate shown next to the APR', codes: ['FINANCE_APR_PROXIMITY'] });
    }
  }
  if (listing.adKind === 'LEASE') {
    items.push(
      { label: 'Lease statement', codes: ['LEASE_STATEMENT_MISSING'] },
      { label: 'Lease term', codes: ['LEASE_TERM_MISSING', 'LEASE_TERM_INVALID'] },
      { label: 'Rent / payment', codes: ['LEASE_RENT_MISSING', 'LEASE_PAYMENT_MISSING', 'LEASE_PAYMENT_INVALID'] },
      { label: 'APR', codes: ['LEASE_APR_MISSING', 'LEASE_RATE_MISSING', 'LEASE_RATE_INVALID'] },
      { label: 'Down payment', codes: ['LEASE_DOWN_MISSING'] },
      { label: 'Low-km excess charges', codes: ['LEASE_EXCESS_KM_MISSING', 'LEASE_ALLOWANCE_UNSTATED'] },
    );
  }
  return items;
}

function checklistIcon(item: ChecklistItem, findings: RuleFinding[]): string {
  if (!findings.length) return '';
  const failed = findings.filter((f) => !f.passed && item.codes.includes(f.ruleId));
  if (failed.some((f) => f.severity === 'BLOCK' || f.severity === 'HARD_BLOCK')) return '❌';
  return failed.length ? '⚠️' : '✅';
}

function findingIcon(finding: RuleFinding): string {
  if (finding.passed) return '✅';
  return finding.severity === 'BLOCK' || finding.severity === 'HARD_BLOCK' ? '❌' : '⚠️';
}

function conditionLabel(code?: string): string {
  const s = String(code || '').split('_').join(' ').toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
}

interface Props {
  listing: Listing;
  onChange: (listing: Listing) => void;
  vehicle?: Record<string, unknown> | null;
  readOnly?: boolean;
  pickerSlot?: ReactNode;
  actionsSlot?: ReactNode;
}

export default function AdWorkspace({ listing, onChange, vehicle, readOnly, pickerSlot, actionsSlot }: Props) {
  const session = useSessionStore();
  const hasSelection = !!vehicle;
  const findings = listing.lastCheck?.ruleFindings || [];
  const aiNotes = listing.lastCheck?.aiNotes || [];
  const checklist = buildChecklist(listing);
  const statusLabel = checkStatusLabel(listing.checkStatus);
  const statusType = listing.checkStatus === 'PASSED' ? 'tag-success'
    : listing.checkStatus === 'BLOCKED' ? 'tag-danger'
    : listing.checkStatus === 'NEEDS_AI' ? 'tag-info'
    : 'tag-warning';
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
                Year {String(vehicle?.modelYear ?? '—')} · Condition {conditionLabel(vehicle?.conditionCode as string)} · Dealership {session.dealerLegalName || '—'}
              </p>
              <p className="muted">
                Contact {session.dealerContactPhone || '—'} · {session.dealerContactEmail || '—'}
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
        <p className="muted" style={{ fontSize: 13 }}>This check is not legal advice and is not an OMVIC approval.</p>
        {!hasSelection ? (
          <div className="state">Select a vehicle to start.</div>
        ) : (
          <>
            {isCheckStatus(listing.checkStatus) && (
              <div style={{ marginBottom: 12 }}><StatusTag status={listing.checkStatus} tone={statusType.replace('tag-', '') as 'success' | 'danger' | 'warning' | 'info'}>{statusLabel}</StatusTag></div>
            )}
            <h4 style={{ margin: '16px 0 8px', fontSize: 15, fontWeight: 600 }}>Checklist</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {checklist.map((item) => (
                <li key={item.label} style={{ padding: '4px 0' }}>
                  {checklistIcon(item, findings)} {item.label}
                </li>
              ))}
            </ul>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Display only. Marks show the last server check; pass or block comes from the server, not this list.
            </p>
            <h4 style={{ margin: '16px 0 8px', fontSize: 15, fontWeight: 600 }}>Rule findings</h4>
            {findings.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {findings.map((f, i) => (
                  <li key={i} style={{ padding: '4px 0' }}>
                    {findingIcon(f)} <strong>{f.passed ? 'Pass' : f.severity === 'BLOCK' || f.severity === 'HARD_BLOCK' ? 'Block' : 'Review'} · {f.ruleId}</strong>: {f.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No rule findings yet. Save a draft and run check.</p>
            )}
            {aiNotes.length > 0 && (
              <>
                <h4 style={{ margin: '16px 0 8px', fontSize: 15, fontWeight: 600 }}>AI notes</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {aiNotes.map((n, i) => <li key={i} style={{ padding: '4px 0' }}>{n.message}</li>)}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
