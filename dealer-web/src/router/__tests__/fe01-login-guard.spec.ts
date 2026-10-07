/**
 * 16 FE-01 / AI-CODING-TESTS TEST-17
 * Unauthenticated /dms → /login; only Sign in.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { account } from '../../auth/login'
import router from '../index'

vi.mock('../../auth/login', () => ({ account: vi.fn(() => undefined) }))
vi.mock('../../api/me', () => ({ getMe: vi.fn() }))

describe('FE-01 login guard (TEST-17)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(account).mockReturnValue(undefined as never)
  })

  it('sends an unauthenticated /dms visit to /login', async () => {
    await router.push('/dms')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('login copy is Sign in only; no password box or business table', () => {
    const dir = dirname(fileURLToPath(import.meta.url))
    const login = readFileSync(join(dir, '../../views/LoginView.vue'), 'utf8')
    expect(login).toContain('Sign in')
    expect(login).not.toMatch(/password|Forgot password|username/i)
    expect(login).not.toMatch(/el-table|Dealerships|VIN/)
  })
})
