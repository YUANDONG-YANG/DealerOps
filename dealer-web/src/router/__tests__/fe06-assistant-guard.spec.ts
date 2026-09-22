/**
 * 16 FE-06 / AI-CODING-TESTS TEST-22
 * Admin opening /assistant is sent back to /admin.
 */
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { account } from '../../auth/msal'
import { getMe } from '../../api/me'
import router from '../index'

vi.mock('../../auth/msal', () => ({ account: vi.fn() }))
vi.mock('../../api/me', () => ({ getMe: vi.fn() }))

describe('FE-06 assistant guard (TEST-22)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(account).mockReturnValue({ homeAccountId: 'admin' } as never)
    vi.mocked(getMe).mockResolvedValue({
      entraOid: 'admin',
      displayName: 'Pat Admin',
      role: 'Platform.Admin',
      dealerId: null,
      dealerLegalName: null,
    })
  })

  it('blocks Admin from /assistant back to /admin', async () => {
    await router.push('/assistant')
    expect(router.currentRoute.value.path).toBe('/admin')
  })
})
