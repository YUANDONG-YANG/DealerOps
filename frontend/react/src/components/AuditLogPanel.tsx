import { useEffect, useState } from 'react';
import DataTable from './DataTable';
import PageState from './PageState';
import { actionText, summaryText } from './AuditTrail';
import type { AuditLogFilter, AuditLogRow } from '../api/audit';
import { messageOf } from '../api/http';
import { dateTimeLocal } from '../format';

const ENTITY_TYPES = ['APP_USER', 'DEALER', 'MEMBERSHIP', 'VEHICLE', 'CUSTOMER', 'CUSTOMER_VEHICLE', 'LEAD',
  'WORK_ORDER', 'VEHICLE_PHOTO', 'LISTING', 'RULE_OVERRIDE'];
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'SELL', 'LINK', 'UNLINK', 'NOTE', 'LOGIN', 'LOGIN_FAILED', 'CHECK', 'EXPORT'];

/**
 * Filterable audit log, newest first (AUD-10, AUD-11). The admin page passes the platform log
 * and shows the dealership column; the Team page passes the manager's own dealership log.
 */
export default function AuditLogPanel({ load, showDealer = false }: {
  load: (filter: AuditLogFilter, page: number) => Promise<{ items: AuditLogRow[]; totalElements: number }>;
  showDealer?: boolean;
}) {
  const [draft, setDraft] = useState<AuditLogFilter>({});
  const [filter, setFilter] = useState<AuditLogFilter>({});
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    load(filter, page)
      .then((data) => { if (live) { setRows(data.items); setTotal(data.totalElements); } })
      .catch((e) => { if (live) setError(messageOf(e, 'Could not load the audit log.')); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [load, filter, page]);

  function set<K extends keyof AuditLogFilter>(key: K, value: AuditLogFilter[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <>
      <div className="filters">
        <select className="select" aria-label="Record type" value={draft.entityType ?? ''} onChange={(e) => set('entityType', e.target.value)}>
          <option value="">All records</option>
          {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="select" aria-label="Action" value={draft.action ?? ''} onChange={(e) => set('action', e.target.value)}>
          <option value="">All actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input className="input" placeholder="Actor username" aria-label="Actor username" value={draft.actor ?? ''}
          onChange={(e) => set('actor', e.target.value)} />
        {showDealer && (
          <input className="input" type="number" placeholder="Dealership id" aria-label="Dealership id" value={draft.dealerId ?? ''}
            onChange={(e) => set('dealerId', e.target.value ? Number(e.target.value) : undefined)} />
        )}
        <input className="input" type="date" aria-label="From" value={draft.from ?? ''} onChange={(e) => set('from', e.target.value)} />
        <input className="input" type="date" aria-label="To" value={draft.to ?? ''} onChange={(e) => set('to', e.target.value)} />
        <button className="btn" onClick={() => { setPage(0); setFilter({ ...draft }); }}>Search</button>
        <button className="btn" onClick={() => { setDraft({}); setPage(0); setFilter({}); }}>Reset</button>
      </div>
      <PageState loading={loading} error={error} empty={!loading && !error && !rows.length}
        emptyText="No audit events match." loadingText="Loading the audit log…">
        <DataTable rows={rows} total={total} page={page} onPage={setPage}
          columns={[
            { label: 'When', render: (r) => dateTimeLocal(r.createdAt) },
            { label: 'Actor', key: 'actorUsername' },
            { label: 'Action', render: (r) => actionText(r) },
            { label: 'Record', render: (r) => `${r.entityType} #${r.entityId}` },
            ...(showDealer ? [{ label: 'Dealership', render: (r: AuditLogRow) => r.dealerId == null ? '—' : String(r.dealerId) }] : []),
            { label: 'Changes', render: (r) => summaryText(r.fieldSummary, r.previous) },
            { label: 'Source IP', render: (r) => r.clientIp ?? '—' },
          ]}
        />
      </PageState>
    </>
  );
}
