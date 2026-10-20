import { dateTimeLocal } from '../format';

interface AuditRow {
  entityType?: string;
  action?: string;
  actorUsername?: string;
  createdAt?: string;
  fieldSummary?: Record<string, unknown>;
}

// Contact fields are recorded by name only — never by value (AUD-04 / CRM-12).
const REDACTED = /email|phone|address/i;

// A vehicle or customer history also holds rows of related records; name those so a work-order
// or photo CREATE is not read as a change to the vehicle itself.
const RELATED: Record<string, string> = {
  WORK_ORDER: 'Work order',
  VEHICLE_PHOTO: 'Photo',
  CUSTOMER_VEHICLE: 'Vehicle link',
};

function actionText(row: AuditRow): string {
  const related = row.entityType ? RELATED[row.entityType] : undefined;
  return related ? `${related} · ${row.action ?? ''}` : row.action ?? '';
}

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

export default function AuditTrail({
  rows, page = 0, total, onPage,
}: {
  rows: AuditRow[];
  page?: number;
  total?: number;
  onPage?: (page: number) => void;
}) {
  const count = total ?? rows.length;
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  if (!rows.length && count === 0) return null;
  return (
    <div className="detail-audit">
      <div className="muted">Audit</div>
      <table className="table" style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <th style={{ width: 170 }}>Action</th>
            <th>Actor</th>
            <th>When</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{actionText(row)}</td>
              <td>{row.actorUsername}</td>
              <td>{dateTimeLocal(row.createdAt)}</td>
              <td>{summaryText(row.fieldSummary)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {onPage && pageCount > 1 && (
        <div className="toolbar">
          <span className="muted">{count} events</span>
          <div className="pagination">
            <button type="button" disabled={page <= 0} onClick={() => onPage(page - 1)}>&lsaquo;</button>
            <span className="muted">{page + 1} / {pageCount}</span>
            <button type="button" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)}>&rsaquo;</button>
          </div>
        </div>
      )}
    </div>
  );
}
