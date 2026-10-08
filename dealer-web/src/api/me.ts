import { http } from './http'

export type Profile = {
  username: string
  displayName: string
  role: 'Platform.Admin' | 'Dealer.User'
  dealerId: number | null
  dealerLegalName: string | null
  dealerContactPhone: string | null
  dealerContactEmail: string | null
  dealerContactAddress: string | null
  dealerLogoDataUrl: string | null
}

export async function getMe() {
  return (await http.get<Profile>('/api/v1/me')).data
}
