/**
 * 16 FE-09 / AI-CODING-TESTS TEST-25 (CRM four states).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('CrmView four-state copy (TEST-25)', () => {
  it('uses FE-T04 CRM copy and Unlink confirm', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../CrmView.vue'), 'utf8')
    expect(src).toContain('Loading customers…')
    expect(src).toContain('No customers match.')
    expect(src).toContain('Could not load customers.')
    expect(src).toContain('You do not have access to CRM.')
    expect(src).toContain('Sold vehicles cannot be unlinked')
    expect(src).toContain('Vehicle already linked')
    expect(src).toContain('Refresh and retry')
  })
})
