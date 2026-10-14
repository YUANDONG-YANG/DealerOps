import type { ReactNode } from 'react';
import { useSessionStore } from '../store/session';
import { checkStatusLabel, isCheckStatus, type Listing, type RuleFinding } from '../api/listings';

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
      { label: 'APR', codes: ['APR_MISSING', 'APR_INVALID'] },
      { label: 'Finance term', codes: ['FINANCE_TERM_MISSING', 'FINANCE_TERM_INVALID'] },
      { label: 'Monthly payment', codes: ['PAYMENT_MISSING', 'PAYMENT_INVALID'] },
    );
  }
  if (listing.adKind === 'LEASE') {
    items.push(
      { label: 'Lease rate', codes: ['LEASE_RATE_MISSING', 'LEASE_RATE_INVALID'] },
      { label: 'Lease term', codes: ['LEASE_TERM_MISSING', 'LEASE_TERM_INVALID'] },
      { label: 'Lease payment', codes: ['LEASE_PAYMENT_MISSING', 'LEASE_PAYMENT_INVALID'] },
      { label: 'Residual', codes: ['RESIDUAL_MISSING', 'RESIDUAL_INVALID'] },
    );
  }
  return items;
}

function checklistStatus(item: ChecklistItem, findings: RuleFinding[]): 'pass' | 'block' | 'review' | 'pending' {
  if (!findings.length) return 'pending';
  const matched = findings.filter((f) => item.codes.includes(f.ruleId));
  if (!matched.length) return 'pass';
  if (matched.some((f) => f.severity === 'HARD_BLOCK' && !f.passed)) return 'block';
  if (matched.some((f) => !f.passed)) return 'review';
  return 'pass';
}

const statusColor: Record<string, string> = {
  pass: 'tag-success', block: 'tag-danger', review: 'tag-warning', pending: '',
};
const statusText: Record<string, string> = {
  pass: 'Pass', block: 'Blocked', review: 'Review', pending: '—',
};

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

  return (
    <div className="ad-grid">
      <div>{pickerSlot}</div>
      <div>
        {hasSelection ? (
          <>
            <div className="form-item"><label>Title</label>
              <input className="input" value={listing.title} disabled={readOnly}
                onChange={(e) => onChange({ ...listing, title: e.target.value })} />
            </div>
            <div className="form-item"><label>Body</label>
              <textarea className="textarea" rows={8} value={listing.body} disabled={readOnly}
                onChange={(e) => onChange({ ...listing, body: e.target.value })} />
            </div>
            <div className="filters" style={{ marginBottom: 12 }}>
              <div className="form-item" style={{ flex: 1 }}><label>Ad type</label>
                <select className="select" value={listing.adKind} disabled={readOnly}
                  onChange={(e) => onChange({ ...listing, adKind: e.target.value as 'CASH' | 'FINANCE' | 'LEASE' })}>
                  <option value="CASH">Cash</option><option value="FINANCE">Finance</option><option value="LEASE">Lease</option>
                </select>
              </div>
              <div className="form-item" style={{ flex: 1 }}><label>Medium</label>
                <select className="select" value={listing.medium} disabled={readOnly}
                  onChange={(e) => onChange({ ...listing, medium: e.target.value as 'ONLINE' | 'RADIO_TV_BILLBOARD' })}>
                  <option value="ONLINE">Online</option><option value="RADIO_TV_BILLBOARD">Radio / TV / Billboard</option>
                </select>
              </div>
            </div>
            <div className="muted" style={{ marginBottom: 8 }}>
              Dealer: {session.dealerLegalName || 'Unknown'} · {session.dealerContactPhone} · {session.dealerContactEmail}
            </div>
            {listing.checkStatus && (
              <div style={{ marginBottom: 12 }}><span className={`tag ${statusType}`}>{statusLabel}</span></div>
            )}
            <div style={{ marginBottom: 12 }}>
              <div className="muted" style={{ marginBottom: 4 }}>Compliance checklist</div>
              {checklist.map((item) => {
                const s = checklistStatus(item, findings);
                return (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>{item.label}</span>
                    <span className={`tag ${statusColor[s]}`}>{statusText[s]}</span>
                  </div>
                );
              })}
            </div>
            {findings.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className="muted" style={{ marginBottom: 4 }}>Rule findings</div>
                {findings.map((f, i) => (
                  <div key={i} className={f.passed ? '' : 'danger-text'} style={{ padding: '4px 0' }}>
                    {f.ruleId}: {f.message} {f.passed ? '(passed)' : `(${f.severity})`}
                  </div>
                ))}
              </div>
            )}
            {aiNotes.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className="muted" style={{ marginBottom: 4 }}>AI notes</div>
                {aiNotes.map((n, i) => <div key={i} style={{ padding: '4px 0' }}>{n.message}</div>)}
              </div>
            )}
            {actionsSlot}
          </>
        ) : (
          <div className="state">Select a vehicle to edit its ad.</div>
        )}
      </div>
    </div>
  );
}
