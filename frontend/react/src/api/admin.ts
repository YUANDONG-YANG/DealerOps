import { http } from './http';
import type { DealerRole } from './me';

export type Dealer = {
  id: number; legalName: string; contactPhone: string; contactEmail: string;
  contactAddress: string; logoDataUrl: string | null; active: boolean; staffCount?: number; version: number;
};

/** `password`: a DealerOps password an admin can reset. `google` / `firebase`: that provider owns the password. */
export type SignInMethod = 'password' | 'google' | 'firebase';

export type Member = {
  username: string; displayName: string; role: string; active: boolean; signInMethod: SignInMethod;
  email: string | null; phone: string | null; dealerRole: DealerRole;
};

export type Page<T> = { items: T[]; page: number; size: number; totalElements: number };

export type CreateDealerBody = { legalName: string; contactPhone: string; contactEmail: string; contactAddress: string };

export type PatchDealerBody = CreateDealerBody & { version: number; active: boolean; logoDataUrl: string | null };

export type BindMemberBody = {
  username: string; displayName?: string; password?: string; email?: string | null; phone?: string | null;
};

export type PendingUser = {
  username: string; displayName: string; email: string | null; phone: string | null; createdAt: string;
  /** The dealership this account has a pending join request at. */
  requestedDealerId: number | null; requestedDealerName: string | null;
};

export type MemberContactBody = { email: string | null; phone: string | null };

export type UpdatePendingUserBody ={ username: string; email: string | null; phone: string | null };

/** 202 body of `bind` when the dealership already has a manager: a join request was filed instead. */
export type JoinRequestSent = { username: string; dealerId: number; joinRequested: true; message: string };

/** Platform-admin endpoints; every list is paged through the gateway. */
export const adminApi = {
  dealers: (p: { q?: string; page?: number; size?: number } = {}) =>
    http.get<Page<Dealer>>('/api/v1/admin/dealers', { params: { ...p, size: p.size ?? 10 } }),
  createDealer: (body: CreateDealerBody) => http.post<Dealer>('/api/v1/admin/dealers', body),
  patchDealer: (id: number, body: PatchDealerBody) => http.patch<Dealer>(`/api/v1/admin/dealers/${id}`, body),
  members: (id: number, p: { q?: string; page?: number; size?: number } = {}) =>
    http.get<Page<Member>>(`/api/v1/admin/dealers/${id}/members`, { params: { ...p, size: p.size ?? 10 } }),
  /** 201 with the member while the dealership has no manager (first manager); otherwise 202 with a join request. */
  bind: (id: number, body: BindMemberBody) =>
    http.post<Member | JoinRequestSent>(`/api/v1/admin/dealers/${id}/members`, body),
  pendingUsers: (p: { q?: string; page?: number } = {}) =>
    http.get<Page<PendingUser>>('/api/v1/admin/pending-users', { params: { ...p, size: 10 } }),
  updatePending: (username: string, body: UpdatePendingUserBody) =>
    http.patch<PendingUser>(`/api/v1/admin/pending-users/${encodeURIComponent(username)}`, body),
  deletePending: (username: string) =>
    http.delete(`/api/v1/admin/pending-users/${encodeURIComponent(username)}`),
  /** Sets a temporary password. The password is sent to the gateway and is not written to the client log. */
  resetPassword: (id: number, username: string, password: string) =>
    http.put(`/api/v1/admin/dealers/${id}/members/${encodeURIComponent(username)}/password`, { password }),
  setRole: (id: number, username: string, dealerRole: DealerRole) =>
    http.put(`/api/v1/admin/dealers/${id}/members/${encodeURIComponent(username)}/role`, { dealerRole }),
  unbind: (id: number, username: string) =>
    http.delete(`/api/v1/admin/dealers/${id}/members/${encodeURIComponent(username)}`),
  /** Soft-deletes the dealership and unbinds its members; the UI confirms by typed name. */
  deleteDealer: (id: number) => http.delete(`/api/v1/admin/dealers/${id}`),
  /** Edits a member's sign-in email and phone with the registration rules. */
  updateMemberContact: (id: number, username: string, body: MemberContactBody) =>
    http.patch<Member>(`/api/v1/admin/dealers/${id}/members/${encodeURIComponent(username)}`, body),
  /** Soft-deletes a member's account; the UI confirms by typed username. */
  deleteMemberAccount: (id: number, username: string) =>
    http.delete(`/api/v1/admin/dealers/${id}/members/${encodeURIComponent(username)}/account`),
};

/** True when `bind` filed a join request instead of binding the login. */
export const isJoinRequestSent = (data: Member | JoinRequestSent): data is JoinRequestSent =>
  'joinRequested' in data && data.joinRequested === true;
