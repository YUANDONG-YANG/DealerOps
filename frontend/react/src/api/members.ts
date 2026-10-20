import { http } from './http';

export type MemberOption = { username: string; displayName: string; source: string | null };

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

export function memberLabel(m: MemberOption) {
  return m.displayName && m.displayName !== m.username ? `${m.displayName} (${m.username})` : m.username;
}
