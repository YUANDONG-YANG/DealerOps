import { defineStore } from 'pinia'
import type { LocalAccount } from '../auth/login'
export type Role = 'Platform.Admin' | 'Dealer.User' | null
export const useSessionStore = defineStore('session', {
  state: () => ({
    account: null as LocalAccount | null,
    role: null as Role,
    dealerId: null as number | null,
    dealerLegalName: null as string | null,
    dealerContactPhone: null as string | null,
    dealerContactEmail: null as string | null,
    dealerContactAddress: null as string | null,
    dealerLogoDataUrl: null as string | null,
    displayName: '',
    username: '',
  }),
  getters: {
    hasBusinessAccess: (s) => s.role === 'Platform.Admin' || (s.role === 'Dealer.User' && s.dealerId !== null),
  },
  actions: {
    setProfile(p: any) {
      this.role = p.role
      this.dealerId = p.active === false ? null : (p.dealerId ?? null)
      this.dealerLegalName = p.dealerLegalName ?? null
      this.dealerContactPhone = p.dealerContactPhone ?? null
      this.dealerContactEmail = p.dealerContactEmail ?? null
      this.dealerContactAddress = p.dealerContactAddress ?? null
      this.dealerLogoDataUrl = p.dealerLogoDataUrl ?? null
      this.displayName = p.displayName ?? ''
      this.username = p.username ?? ''
    },
    clear() {
      this.account = null
      this.role = null
      this.dealerId = null
      this.dealerLegalName = null
      this.dealerContactPhone = null
      this.dealerContactEmail = null
      this.dealerContactAddress = null
      this.dealerLogoDataUrl = null
      this.displayName = ''
      this.username = ''
    },
  },
})
