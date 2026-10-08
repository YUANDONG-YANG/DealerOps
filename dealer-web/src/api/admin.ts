import { codeOf, http, statusOf } from './http'

export type Dealer = {
  id: number
  legalName: string
  contactPhone: string
  contactEmail: string
  contactAddress: string
  logoDataUrl: string | null
  active: boolean
  staffCount?: number
  version: number
}

export type Member = {
  username: string
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

export type PatchDealerBody = CreateDealerBody & {
  version: number
  active: boolean
  logoDataUrl: string | null
}

export type BindMemberBody = { username: string; displayName: string; password: string }

export type AdminErrorCode = 'DUP_MEMBER' | 'VALIDATION' | 'FORBIDDEN' | 'NOT_FOUND' | string

export function adminErrorCode(error: unknown): AdminErrorCode | undefined {
  return codeOf(error)
}

export function adminErrorStatus(error: unknown): number | undefined {
  return statusOf(error)
}

export const adminApi = {
  dealers: (p: { q?: string; page?: number; size?: number } = {}) =>
    http.get<Page<Dealer>>('/api/v1/admin/dealers', { params: { ...p, size: p.size ?? 10 } }),
  createDealer: (body: CreateDealerBody) => http.post<Dealer>('/api/v1/admin/dealers', body),
  patchDealer: (id: number, body: PatchDealerBody) =>
    http.patch<Dealer>(`/api/v1/admin/dealers/${id}`, body),
  members: (id: number, p: { q?: string; page?: number; size?: number } = {}) =>
    http.get<Page<Member>>(`/api/v1/admin/dealers/${id}/members`, {
      params: { ...p, size: p.size ?? 10 },
    }),
  bind: (id: number, body: BindMemberBody) =>
    http.post<Member>(`/api/v1/admin/dealers/${id}/members`, body),
  unbind: (id: number, username: string) =>
    http.delete(`/api/v1/admin/dealers/${id}/members/${encodeURIComponent(username)}`),
}
