import { apiError, http, parseApiError } from './http';
import { describeError } from './errors';

export { apiError };

export type CheckStatus = 'BLOCKED' | 'NEEDS_AI' | 'PASSED' | 'STALE' | 'AI_UNAVAILABLE';
export type AdKind = 'CASH' | 'FINANCE' | 'LEASE';
export type Medium = 'ONLINE' | 'RADIO_TV_BILLBOARD';
export type PriorUse = 'POLICE_EMERGENCY' | 'TAXI_LIMO' | 'DAILY_RENTAL' | 'OTHER';

export interface RuleFinding {
  ruleId: string;
  severity: string;
  passed: boolean;
  message: string;
}

/** One stored compliance check of an ad. */
export interface CheckResult {
  id: number;
  listingId: number;
  contentVersion: number;
  ruleFindings?: RuleFinding[] | null;
  aiStatus?: string;
  aiNotes?: { code?: string | null; severity?: string | null; explanation?: string | null; message: string }[] | null;
  recommendation?: string;
  checkStatus: CheckStatus;
  createdAt?: string;
}

/** A vehicle's advertisement; `id` is null until the first draft is saved. */
export interface Listing {
  id: number | null;
  vehicleId: number;
  title: string;
  body: string;
  adKind: AdKind;
  medium: Medium;
  priorUse: PriorUse | null;
  warrantyTerms: string | null;
  annualKmAllowance: number | null;
  status: string;
  contentVersion: number;
  lastCheckId: number | null;
  lastCheck: CheckResult | null;
  checkStatus: CheckStatus | null;
  version: number;
}

const CHECK_STATUS_LABEL: Record<CheckStatus, string> = {
  BLOCKED: 'Blocked',
  NEEDS_AI: 'Needs AI review',
  PASSED: 'Passed',
  STALE: 'Stale',
  AI_UNAVAILABLE: 'AI unavailable',
};

/** True when the value is one of the known check statuses. */
export function isCheckStatus(value: unknown): value is CheckStatus {
  return value === 'BLOCKED' || value === 'NEEDS_AI' || value === 'PASSED' || value === 'STALE' || value === 'AI_UNAVAILABLE';
}

/** Display label of a check status; empty for unknown values. */
export function checkStatusLabel(value: unknown): string {
  return isCheckStatus(value) ? CHECK_STATUS_LABEL[value] : '';
}

/** An unsaved cash, online draft for the vehicle. */
export function emptyListing(vehicleId = 0): Listing {
  return {
    id: null, vehicleId, title: '', body: '', adKind: 'CASH', medium: 'ONLINE',
    priorUse: null, warrantyTerms: null, annualKmAllowance: null,
    status: 'DRAFT', contentVersion: 1, lastCheckId: null, lastCheck: null, checkStatus: null, version: 0,
  };
}

/** The listing with a fresh check result applied, used when the listing itself cannot be reloaded. */
export function applyCheckToListing(listing: Listing, check: CheckResult): Listing {
  return { ...listing, checkStatus: check.checkStatus, lastCheckId: check.id, lastCheck: check };
}

/** User message for a rejected Mark ready or Export call. */
function mapReadyExport({ status, code }: { status?: number; code?: string; message?: string }): string {
  if (code === 'CHECK_STALE') return 'Check is stale: the ad was edited after its last compliance check. Click Run check again.';
  if (code === 'NOT_PASSED') return 'Check has not passed: fix the blocking findings listed under the check result, save, and run the check again.';
  if (code === 'VERSION_CONFLICT') return 'Refresh and retry: someone else changed this record after you opened it. Reopen it to load the latest version, then make your change again.';
  if (status === 404 || code === 'NOT_FOUND') return 'Vehicle not found. It may have been deleted; refresh the list.';
  if (status === 403 || code === 'FORBIDDEN') return 'You do not have access to Ad compliance.';
  return 'Check has not passed: run the compliance check and fix any blocking findings first.';
}

/** Reads the error body (a blob for exports) and maps it to a Mark ready / Export message. */
export async function readyExportMessageAsync(error: unknown): Promise<string> {
  return mapReadyExport(await parseApiError(error));
}

/** User message for a rejected Save draft call. */
export function saveMessage(error: unknown): string {
  const { status, code } = apiError(error);
  if (code === 'VERSION_CONFLICT') return 'Refresh and retry: someone else changed this record after you opened it. Reopen it to load the latest version, then make your change again.';
  if (code === 'VALIDATION' || status === 400) return `Check required fields: ${apiError(error).message || 'the title and body cannot be empty.'}`;
  if (status === 404 || code === 'NOT_FOUND') return 'Vehicle not found. It may have been deleted; refresh the list.';
  if (status === 403 || code === 'FORBIDDEN') return 'You do not have access to Ad compliance.';
  return describeError(error, 'save the ad');
}

/** Ad listing endpoints, called through the gateway. */
export const listingsApi = {
  get: (vehicleId: number) => http.get<Listing>(`/api/v1/vehicles/${vehicleId}/listing`),
  save: (vehicleId: number, body: { version: number; title: string; body: string; adKind: AdKind; medium: Medium; priorUse: string | null; warrantyTerms: string | null; annualKmAllowance: number | null }) =>
    http.patch<Listing>(`/api/v1/vehicles/${vehicleId}/listing`, body),
  check: (listingId: number, body: { version: number }) =>
    http.post<CheckResult>(`/api/v1/listings/${listingId}/checks`, body, { timeout: 20000 }),
  ready: (listingId: number, body: { version: number }) =>
    http.post<Listing>(`/api/v1/listings/${listingId}/ready`, body),
  export: (listingId: number, body: { version: number }) =>
    http.post(`/api/v1/listings/${listingId}/exports`, body, {
      responseType: 'blob', timeout: 20000, headers: { Accept: 'text/plain' },
    }),
};
