import { dateTimeLocal } from '../format';

interface AuditRow {
  action?: string;
  actorUsername?: string;
  createdAt?: string;
  fieldSummary?: Record<string, unknown>;
}

// Contact fields are recorded by name only — never by value (AUD-04 / CRM-12).
const REDACTED = /email|phone|address/i;

function summaryText(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return '—';
  const entries = Object.entries(raw as Record<string, unknown>);
  if (!entries.length) return '—';
  return entries
    .map(([key, value]) =>
      REDACTED.test(key) || value === true ? key : `${key}: ${JSON.stringify(value)}`,
    )
    .join(', ');
}

export default function AuditTrail({ rows }: { rows: AuditRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="detail-audit">
      <div className="muted">Audit</div>
      <table className="table" style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <th style={{ width: 110 }}>Action</th>
            <th>Actor</th>
            <th>When</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{row.action}</td>
              <td>{row.actorUsername}</td>
              <td>{dateTimeLocal(row.createdAt)}</td>
              <td>{summaryText(row.fieldSummary)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
