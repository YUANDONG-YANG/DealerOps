import { http } from './http';

export type MemberOption = { username: string; displayName: string };

export const membersApi = {
  list: () => http.get<MemberOption[]>('/api/v1/members'),
};

export function memberLabel(m: MemberOption) {
  return m.displayName && m.displayName !== m.username ? `${m.displayName} (${m.username})` : m.username;
}
