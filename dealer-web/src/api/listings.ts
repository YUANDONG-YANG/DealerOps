import { http } from './http'

export type CheckStatus = 'BLOCKED' | 'NEEDS_AI' | 'PASSED' | 'STALE' | 'AI_UNAVAILABLE'
export type AdKind = 'CASH' | 'FINANCE' | 'LEASE'
export type Medium = 'ONLINE' | 'RADIO_TV_BILLBOARD'

export interface RuleFinding {
  ruleId: string
  severity: string
  passed: boolean
  message: string
}

export interface CheckResult {
  id: number
  listingId: number
  contentVersion: number
  ruleFindings?: RuleFinding[] | null
  aiStatus?: string
  aiNotes?: { message: string }[] | null
  recommendation?: string
  checkStatus: CheckStatus
  createdAt?: string
}

export interface Listing {
  id: number | null
  vehicleId: number
  title: string
  body: string
  adKind: AdKind
  medium: Medium
  status: string
  contentVersion: number
  lastCheckId: number | null
  lastCheck: CheckResult | null
  checkStatus: CheckStatus | null
  version: number
}

export const CHECK_STATUS_LABEL: Record<CheckStatus, string> = {
  BLOCKED: 'Blocked',
  NEEDS_AI: 'Needs AI review',
  PASSED: 'Passed',
  STALE: 'Stale',
  AI_UNAVAILABLE: 'AI unavailable',
}

export function isCheckStatus(value: unknown): value is CheckStatus {
  return value === 'BLOCKED' || value === 'NEEDS_AI' || value === 'PASSED' || value === 'STALE' || value === 'AI_UNAVAILABLE'
}

export function checkStatusLabel(value: unknown): string {
  return isCheckStatus(value) ? CHECK_STATUS_LABEL[value] : ''
}

export function emptyListing(vehicleId = 0): Listing {
  return {
    id: null,
    vehicleId,
    title: '',
    body: '',
    adKind: 'CASH',
    medium: 'ONLINE',
    status: 'DRAFT',
    contentVersion: 1,
    lastCheckId: null,
    lastCheck: null,
    checkStatus: null,
    version: 0,
  }
}

/** POST /checks returns a Check. Merge status/findings only; never overwrite listing.id. */
export function applyCheckToListing(listing: Listing, check: CheckResult): Listing {
  return {
    ...listing,
    checkStatus: check.checkStatus,
    lastCheckId: check.id,
    lastCheck: check,
  }
}

export function apiError(error: unknown): { status?: number; code?: string; message?: string } {
  const err = error as { response?: { status?: number; data?: { code?: string; message?: string } | Blob } }
  const data = err.response?.data
  if (data instanceof Blob) {
    return { status: err.response?.status }
  }
  return {
    status: err.response?.status,
    code: data?.code,
    message: data?.message,
  }
}

export async function parseApiError(error: unknown): Promise<{ status?: number; code?: string; message?: string }> {
  const err = error as { response?: { status?: number; data?: { code?: string; message?: string } | Blob } }
  let data = err.response?.data
  if (data instanceof Blob) {
    try {
      data = JSON.parse(await data.text()) as { code?: string; message?: string }
    } catch {
      data = undefined
    }
  }
  return { status: err.response?.status, code: data?.code, message: data?.message }
}

function mapReadyExport({ status, code }: { status?: number; code?: string; message?: string }): string {
  if (code === 'CHECK_STALE') return 'Check is stale. Run check again'
  if (code === 'NOT_PASSED') return 'Check has not passed'
  if (code === 'VERSION_CONFLICT') return 'Refresh and retry'
  if (status === 404 || code === 'NOT_FOUND') return 'Vehicle not found'
  if (status === 403 || code === 'FORBIDDEN') return 'You do not have access to Ad compliance.'
  return 'Check has not passed'
}

export function readyExportMessage(error: unknown): string {
  return mapReadyExport(apiError(error))
}

export async function readyExportMessageAsync(error: unknown): Promise<string> {
  return mapReadyExport(await parseApiError(error))
}

export function saveMessage(error: unknown): string {
  const { status, code } = apiError(error)
  if (code === 'VERSION_CONFLICT') return 'Refresh and retry'
  if (code === 'VALIDATION' || status === 400) return 'Check required fields'
  if (status === 404 || code === 'NOT_FOUND') return 'Vehicle not found'
  if (status === 403 || code === 'FORBIDDEN') return 'You do not have access to Ad compliance.'
  return 'Could not load listing.'
}

export const listingsApi = {
  get: (vehicleId: number) => http.get<Listing>(`/api/v1/vehicles/${vehicleId}/listing`),
  save: (vehicleId: number, body: { version: number; title: string; body: string; adKind: AdKind; medium: Medium }) =>
    http.patch<Listing>(`/api/v1/vehicles/${vehicleId}/listing`, body),
  check: (listingId: number, body: { version: number }) =>
    http.post<CheckResult>(`/api/v1/listings/${listingId}/checks`, body, { timeout: 20000 }),
  ready: (listingId: number, body: { version: number }) =>
    http.post<Listing>(`/api/v1/listings/${listingId}/ready`, body),
  export: (listingId: number, body: { version: number }) =>
    http.post(`/api/v1/listings/${listingId}/exports`, body, {
      responseType: 'blob',
      timeout: 20000,
      headers: { Accept: 'text/plain' },
    }),
}
