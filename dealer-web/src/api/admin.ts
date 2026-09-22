import { http } from './http'

export type Dealer = {
  id: number
  legalName: string
  contactPhone: string
  contactEmail: string
  contactAddress: string
  active: boolean
  staffCount?: number
  version: number
}

export type Member = {
  entraOid: string
  displayName: string
  role: string
  active: boolean
}

export type Page<T> = { items: T[]; page: number; size: number; total: number }

export type CreateDealerBody = {
  legalName: string
  contactPhone: string
  contactEmail: string
  contactAddress: string
}

export type BindMemberBody = { entraOid: string; displayName: string }

export type AdminErrorCode = 'DUP_MEMBER' | 'VALIDATION' | 'FORBIDDEN' | 'NOT_FOUND' | string

type ApiErr = { response?: { status?: number; data?: { code?: string; message?: string } } }

export function adminErrorCode(error: unknown): AdminErrorCode | undefined {
  return (error as ApiErr).response?.data?.code
}

export function adminErrorStatus(error: unknown): number | undefined {
  return (error as ApiErr).response?.status
}

/** Course UI does not Edit dealership — no GET/PATCH /admin/dealers/{id}. */
export const adminApi = {
  dealers: (p: { q?: string; page?: number; size?: number } = {}) =>
    http.get<Page<Dealer>>('/api/v1/admin/dealers', { params: { ...p, size: p.size ?? 10 } }),
  createDealer: (body: CreateDealerBody) => http.post<Dealer>('/api/v1/admin/dealers', body),
  members: (id: number, p: { q?: string; page?: number; size?: number } = {}) =>
    http.get<Page<Member>>(`/api/v1/admin/dealers/${id}/members`, {
      params: { ...p, size: p.size ?? 10 },
    }),
  bind: (id: number, body: BindMemberBody) =>
    http.post<Member>(`/api/v1/admin/dealers/${id}/members`, body),
  unbind: (id: number, oid: string) =>
    http.delete(`/api/v1/admin/dealers/${id}/members/${encodeURIComponent(oid)}`),
}
