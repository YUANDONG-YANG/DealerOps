import { http } from './http';
import type { Dealer } from './admin';
import type { DealerRole } from './me';

export type MemberOption = { username: string; displayName: string; source: string | null; dealerRole: DealerRole };

/** A manager's edit of their own dealership; active status stays with the platform admin. */
export type DealerProfileBody = Pick<Dealer, 'legalName' | 'contactPhone' | 'contactEmail' | 'contactAddress' | 'logoDataUrl' | 'version'>;

const ACCOUNT_SOURCE_LABEL: Record<string, string> = {
  google: 'Google sign-in',
  firebase: 'Email sign-up',
  password: 'Registration form',
  admin: 'Added by admin',
};

/** How an account was created; the backend sends null when the channel is unknown (seed data). */
export function accountSourceLabel(source: string | null | undefined): string {
  return (source && ACCOUNT_SOURCE_LABEL[source]) || '—';
}

export const membersApi = {
  list: () => http.get<MemberOption[]>('/api/v1/members'),
};

/** Manager-only routes for the caller's own dealership (AUTH-27). */
export const teamApi = {
  remove: (username: string) => http.delete(`/api/v1/dealer/members/${encodeURIComponent(username)}`),
  profile: () => http.get<Dealer>('/api/v1/dealer/profile').then(r => r.data),
  saveProfile: (body: DealerProfileBody) => http.patch<Dealer>('/api/v1/dealer/profile', body).then(r => r.data),
};

export function memberLabel(m: MemberOption) {
  return m.displayName && m.displayName !== m.username ? `${m.displayName} (${m.username})` : m.username;
}
