import { http } from './http'

export type Profile = {
  entraOid: string
  displayName: string
  role: 'Platform.Admin' | 'Dealer.User'
  dealerId: number | null
  dealerLegalName: string | null
}

export async function getMe() {
  return (await http.get<Profile>('/api/v1/me')).data
}
