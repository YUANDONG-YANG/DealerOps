/**
 * 16 FE-09 / AI-CODING-TESTS TEST-25 (Login four states) + FE-01 copy.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('LoginView four-state copy (TEST-25)', () => {
  it('uses FE-T04 login copy and username/password sign-in', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../LoginView.vue'), 'utf8')
    expect(src).toContain('Signing you in…')
    expect(src).toContain('Sign-in failed. Try again.')
    expect(src).toContain('Sign in')
    expect(src).toContain('PageState')
    expect(src).not.toMatch(/password|Forgot password|username/i)
  })
})
