/**
 * 16 FE-02 / AI-CODING-TESTS TEST-18
 * Staff opening /admin is sent back to /dms.
 */
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { account } from '../../auth/login'
import { getMe } from '../../api/me'
import router from '../index'

vi.mock('../../auth/login', () => ({ account: vi.fn() }))
vi.mock('../../api/me', () => ({ getMe: vi.fn() }))

const staff = {
  username: 'staff-a',
  displayName: 'Alex Dealer',
  role: 'Dealer.User' as const,
  dealerId: 1,
  dealerLegalName: 'Prairie Auto Ltd.',
}

describe('FE-02 admin guard (TEST-18)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(account).mockReturnValue({ homeAccountId: 'staff-a' } as never)
    vi.mocked(getMe).mockResolvedValue(staff)
  })

  it('blocks Staff A from /admin back to /dms', async () => {
    await router.push('/admin')
    expect(router.currentRoute.value.path).toBe('/dms')
  })
})
