/**
 * 16 FE-03 / AI-CODING-TESTS TEST-19
 * Admin opening /dms is sent back to /admin.
 */
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { account } from '../../auth/login'
import { getMe } from '../../api/me'
import router from '../index'

vi.mock('../../auth/login', () => ({ account: vi.fn() }))
vi.mock('../../api/me', () => ({ getMe: vi.fn() }))

const admin = {
  username: 'admin',
  displayName: 'Pat Admin',
  role: 'Platform.Admin' as const,
  dealerId: null,
  dealerLegalName: null,
}

describe('FE-03 DMS guard (TEST-19)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(account).mockReturnValue({ homeAccountId: 'admin' } as never)
    vi.mocked(getMe).mockResolvedValue(admin)
  })

  it('blocks Admin from /dms back to /admin', async () => {
    await router.push('/dms')
    expect(router.currentRoute.value.path).toBe('/admin')
  })
})
