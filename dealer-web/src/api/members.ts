import { http } from './http'

/** Active members of the caller's dealership, for owner and assignee pickers. */
export type MemberOption = { username: string; displayName: string }

export const membersApi = {
  list: () => http.get<MemberOption[]>('/api/v1/members'),
}

export function memberLabel(m: MemberOption) {
  return m.displayName && m.displayName !== m.username ? `${m.displayName} (${m.username})` : m.username
}
