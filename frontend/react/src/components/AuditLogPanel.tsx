import { useEffect, useState } from 'react';
import DataTable from './DataTable';
import PageState from './PageState';
import { actionText, summaryText } from './AuditTrail';
import type { AuditLogFilter, AuditLogRow } from '../api/audit';
import { messageOf } from '../api/http';
import { dateTimeLocal } from '../format';
import SearchSuggest, { type Suggestion } from './SearchSuggest';
import { sortParam, type SortState } from './TableSort';

const ENTITY_TYPES = ['APP_USER', 'DEALER', 'MEMBERSHIP', 'VEHICLE', 'CUSTOMER', 'CUSTOMER_VEHICLE', 'LEAD',
  'WORK_ORDER', 'VEHICLE_PHOTO', 'LISTING', 'RULE_OVERRIDE'];
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'SELL', 'LINK', 'UNLINK', 'NOTE', 'LOGIN', 'LOGIN_FAILED', 'CHECK', 'EXPORT'];

/**
 * Filterable audit log, newest first (AUD-10, AUD-11). The admin page passes the platform log
 * and shows the dealership column; the Team page passes the caller's own dealership log.
 */
export default function AuditLogPanel({ load, showDealer = false, suggestActors }: {
  load: (filter: AuditLogFilter, page: number) => Promise<{ items: AuditLogRow[]; totalElements: number }>;
  showDealer?: boolean;
  /** Usernames for the actor box; the API matches any part of the username, ignoring case. */
  suggestActors: (q: string) => Promise<Suggestion[]>;
}) {
  const [draft, setDraft] = useState<AuditLogFilter>({});
  const [filter, setFilter] = useState<AuditLogFilter>({});
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortState | null>(null);
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    load({ ...filter, sort: sortParam(sort) }, page)
      .then((data) => { if (live) { setRows(data.items); setTotal(data.totalElements); } })
      .catch((e) => { if (live) setError(messageOf(e, 'Could not load the audit log.')); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [load, filter, page, sort]);

  function set<K extends keyof AuditLogFilter>(key: K, value: AuditLogFilter[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <>
      {/* Inputs follow the column order: When, Actor, Action, Record, Dealership, Changes. */}
      <div className="filters">
        <label className="filter-date">From date
          <input className="input" type="date" lang="en" value={draft.from ?? ''} onChange={(e) => set('from', e.target.value)} />
        </label>
        <label className="filter-date">To date
          <input className="input" type="date" lang="en" value={draft.to ?? ''} onChange={(e) => set('to', e.target.value)} />
        </label>
        <SearchSuggest placeholder="Actor username" ariaLabel="Actor username" value={draft.actor ?? ''}
          onChange={(v) => set('actor', v)}
          suggest={suggestActors}
          onPick={(s) => { const next = { ...draft, actor: s.value }; setDraft(next); setPage(0); setFilter(next); }}
          onEnter={() => { setPage(0); setFilter({ ...draft }); }} />
        <select className="select" aria-label="Action" value={draft.action ?? ''} onChange={(e) => set('action', e.target.value)}>
          <option value="">All actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="select" aria-label="Record type" value={draft.entityType ?? ''} onChange={(e) => set('entityType', e.target.value)}>
          <option value="">All records</option>
          {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {showDealer && (
          <input className="input" type="number" placeholder="Dealership id" aria-label="Dealership id" value={draft.dealerId ?? ''}
            onChange={(e) => set('dealerId', e.target.value ? Number(e.target.value) : undefined)} />
        )}
        <input className="input" placeholder="Search changes" aria-label="Search changes" value={draft.q ?? ''}
          onChange={(e) => set('q', e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); setFilter({ ...draft }); } }} />
        <button className="btn" onClick={() => { setPage(0); setFilter({ ...draft }); }}>Search</button>
        <button className="btn" onClick={() => { setDraft({}); setPage(0); setFilter({}); }}>Reset</button>
      </div>
      <PageState loading={loading} error={error} empty={!loading && !error && !rows.length}
        emptyText="No audit events match." loadingText="Loading the audit log…">
        <DataTable rows={rows} total={total} page={page} onPage={setPage}
          sort={sort} onSort={(key, dir) => { setSort({ key, dir }); setPage(0); }}
          columns={[
            { key: 'createdAt', label: 'When', sortable: true, render: (r) => dateTimeLocal(r.createdAt) },
            { label: 'Actor', key: 'actorUsername', sortable: true },
            { key: 'action', label: 'Action', sortable: true, render: (r) => actionText(r) },
            { key: 'entityType', label: 'Record', sortable: true, render: (r) => `${r.entityType} #${r.entityId}` },
            ...(showDealer ? [{ key: 'dealerId', label: 'Dealership', sortable: true, render: (r: AuditLogRow) => r.dealerId == null ? 'Platform' : String(r.dealerId) }] : []),
            { label: 'Changes', render: (r) => summaryText(r.fieldSummary, r.previous) },
            { key: 'clientIp', label: 'Source IP', sortable: true, render: (r) => r.clientIp ?? 'Not recorded' },
            { key: 'clientLocation', label: 'Location', sortable: true, render: (r) => r.clientLocation ?? (r.clientIp ? 'Unavailable' : 'Not recorded') },
          ]}
        />
      </PageState>
    </>
  );
}
