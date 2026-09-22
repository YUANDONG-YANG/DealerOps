/**
 * 16 FE-09 / AI-CODING-TESTS TEST-25 (Ads four states + AI unavailable).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('AdsView four-state copy (TEST-25)', () => {
  it('keeps harvested FE-T04 Ads copy and 502 AI unavailable (not Passed)', () => {
    const dir = dirname(fileURLToPath(import.meta.url))
    const ads = readFileSync(join(dir, '../AdsView.vue'), 'utf8')
    const workspace = readFileSync(join(dir, '../../components/AdWorkspace.vue'), 'utf8')
    const listings = readFileSync(join(dir, '../../api/listings.ts'), 'utf8')
    expect(ads).toContain('No vehicles to advertise.')
    expect(ads).toContain('Loading listing…')
    expect(ads).toContain('Could not load listing.')
    expect(ads).toContain('You do not have access to Ad compliance.')
    expect(workspace).toContain('Select a vehicle to start.')
    expect(ads).toContain("checkStatus: 'AI_UNAVAILABLE'")
    expect(listings).toContain('AI unavailable')
    expect(ads).not.toMatch(/\/internal\/v1/)
    expect(ads).not.toMatch(/8081/)
  })
})
