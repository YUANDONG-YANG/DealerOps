import { http } from './http';
import type { AuditRow } from '../components/AuditTrail';

/** A row of the admin or dealership audit log; those logs also carry the dealership and source IP. */
export type AuditLogRow = AuditRow & { id: number; entityId: number; dealerId?: number | null; clientIp?: string | null };

/** Optional filters of the audit logs; `from` and `to` are inclusive `YYYY-MM-DD` days in the viewer's time zone. */
export type AuditLogFilter = {
  entityType?: string; action?: string; actor?: string; dealerId?: number; from?: string; to?: string;
};

type AuditLogPage = { items: AuditLogRow[]; totalElements: number };

// Start of a local day as an ISO instant, `days` after the given date.
function localDayStart(day: string, days = 0) {
  const d = new Date(`${day}T00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// Empty filter values are dropped so the API does not see blank parameters. The local From/To
// days become instants: from the start of From up to (not including) the day after To.
function logParams(filter: AuditLogFilter, page: number) {
  const params: Record<string, string | number> = { page, size: 10 };
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== '') params[key] = value;
  }
  if (filter.from) params.from = localDayStart(filter.from);
  if (filter.to) params.to = localDayStart(filter.to, 1);
  return params;
}

export const auditApi = {
  /** History of one record, newest first. */
  list(p: { entityType: string; entityId: number; page?: number; size?: number }) {
    return http.get('/api/v1/audit', {
      params: { entityType: p.entityType, entityId: p.entityId, page: p.page ?? 0, size: p.size ?? 10 },
    });
  },
  /** Every audit row on the platform, newest first (admin only). */
  platformLog: (filter: AuditLogFilter, page: number) =>
    http.get<AuditLogPage>('/api/v1/admin/audit', { params: logParams(filter, page) }).then(r => r.data),
  /** Every audit row of the caller's dealership, newest first (manager only). */
  dealershipLog: (filter: AuditLogFilter, page: number) =>
    http.get<AuditLogPage>('/api/v1/dealer/audit', { params: logParams(filter, page) }).then(r => r.data),
};
