import { dateTimeLocal } from '../format';

export type AuditRow = {
  entityType?: string;
  action?: string;
  actorUsername?: string;
  createdAt?: string;
  fieldSummary?: Record<string, unknown>;
  // Values the change replaced, keyed like fieldSummary; contact fields never appear here.
  previous?: Record<string, unknown> | null;
};

// A vehicle or customer history also holds rows of related records; name those so a work-order
// or photo CREATE is not read as a change to the vehicle itself.
const RELATED: Record<string, string> = {
  WORK_ORDER: 'Work order',
  VEHICLE_PHOTO: 'Photo',
  CUSTOMER_VEHICLE: 'Vehicle link',
};

/** The row's action label, prefixed with the related record kind (for example `Work order · CREATE`). */
export function actionText(row: AuditRow): string {
  const related = row.entityType ? RELATED[row.entityType] : undefined;
  return related ? `${related} · ${row.action ?? ''}` : row.action ?? '';
}

/**
 * One item per changed field: `key: before → after` when the old value is known, and
 * `key: was before` for fields that only have an old value (for example a removed payment).
 */
export function summaryText(raw: unknown, previous?: Record<string, unknown> | null): string {
  const summary = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const items = Object.entries(summary).map(([key, value]) => {
    const hasOld = previous != null && key in previous;
    if (value === true) {
      // A real boolean change (active, enabled) shows old → new. Otherwise `true` only flags that a
      // field changed (task, dates, cost), so show the replaced value when it is known.
      if (!hasOld) return key;
      if (typeof previous[key] !== 'boolean') return `${key}: was ${JSON.stringify(previous[key])}`;
    }
    const after = JSON.stringify(value);
    return hasOld ? `${key}: ${JSON.stringify(previous[key])} → ${after}` : `${key}: ${after}`;
  });
  Object.entries(previous ?? {})
    .filter(([key]) => !(key in summary))
    .forEach(([key, value]) => items.push(`${key}: was ${JSON.stringify(value)}`));
  return items.length ? items.join(', ') : 'No field changes';
}

/** A record's audit history, newest first as the API returns it, with optional paging. */
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
              <td>{summaryText(row.fieldSummary, row.previous)}</td>
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
