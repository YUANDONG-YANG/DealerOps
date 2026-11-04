import { http } from './http';
import type { Dealer } from './admin';
import type { DealerRole } from './me';

/**
 * A member of the caller's dealership. `GET /api/v1/members` stays open to every bound member for
 * the assignee pickers, so it returns the record fields only to a caller with team access (the
 * owner or a manager); for a sales member the backend omits them.
 */
export type MemberOption = {
  username: string;
  displayName: string;
  /** Team access only: how the account was created, or null when unknown. */
  source?: string | null;
  /** Team access only: the member's role inside the dealership. */
  dealerRole?: DealerRole;
  /** Team access only: the member's phone, or null. */
  phone?: string | null;
  /** Team access only: when the membership was created, UTC. */
  joinedAt?: string;
};

/** The full member record, as a caller with team access receives it (the Team members table). */
export type MemberRecord = MemberOption & { dealerRole: DealerRole; phone: string | null; joinedAt: string };

/** The member fields the owner or a manager may edit; a null phone clears it. */
export type MemberPatchBody = { displayName: string; phone: string | null };

/** The owner's edit of their own dealership; active status stays with the platform admin. */
export type DealerProfileBody = Pick<Dealer, 'legalName' | 'contactPhone' | 'contactEmail' | 'contactAddress' | 'logoDataUrl' | 'version'>;

const ACCOUNT_SOURCE_LABEL: Record<string, string> = {
  google: 'Google sign-in',
  firebase: 'Email sign-up',
  password: 'Registration form',
  admin: 'Added by admin',
};

/**
 * How an account was created. The backend sends null when the channel is unknown (seed data).
 *
 * @param source account source code, or null
 * @returns a display label, or "Not recorded" when the source is missing
 */
export function accountSourceLabel(source: string | null | undefined): string {
  return (source && ACCOUNT_SOURCE_LABEL[source]) || 'Not recorded';
}

/** Members of the caller's dealership, for assignee pickers and the Team page. */
export const membersApi = {
  /** Picker fields for every bound member; the record fields are absent without team access. */
  list: () => http.get<MemberOption[]>('/api/v1/members'),
  /** The same route read as full records; only the owner or a manager receives them. */
  listRecords: () => http.get<MemberRecord[]>('/api/v1/members'),
};

/** Team routes for the caller's own dealership: members for the owner or a manager, the profile for the owner (AUTH-27). */
export const teamApi = {
  remove: (username: string) => http.delete(`/api/v1/dealer/members/${encodeURIComponent(username)}`),
  setRole: (username: string, dealerRole: DealerRole) =>
    http.put(`/api/v1/dealer/members/${encodeURIComponent(username)}/role`, { dealerRole }),
  update: (username: string, body: MemberPatchBody) =>
    http.patch(`/api/v1/dealer/members/${encodeURIComponent(username)}`, body),
  profile: () => http.get<Dealer>('/api/v1/dealer/profile').then(r => r.data),
  saveProfile: (body: DealerProfileBody) => http.patch<Dealer>('/api/v1/dealer/profile', body).then(r => r.data),
};

/**
 * Picker label: "Display name (username)", or just the username when they match.
 *
 * @param m member row from the dealership list
 * @returns the label shown in assignee pickers
 */
export function memberLabel(m: MemberOption) {
  return m.displayName && m.displayName !== m.username ? `${m.displayName} (${m.username})` : m.username;
}
