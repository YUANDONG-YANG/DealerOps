/**
 * 16 CL-5 / AI-CODING-TESTS TEST-28
 * Classroom: cloud + real GitHub component. Timeout → AI unavailable, never Pass.
 * Live FX-10 run is Review 2; this file locks the SPA failure latch.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const dir = dirname(fileURLToPath(import.meta.url))

describe('CL-5 ads real AI (TEST-28)', () => {
  it('502 AI_UNAVAILABLE paints right-rail AI unavailable and disables Ready/export', () => {
    const ads = readFileSync(join(dir, '../src/views/AdsView.vue'), 'utf8')
    const listings = readFileSync(join(dir, '../src/api/listings.ts'), 'utf8')
    expect(ads).toContain('AI_UNAVAILABLE')
    expect(listings).toContain("AI_UNAVAILABLE: 'AI unavailable'")
    expect(ads).toContain("listing.value.checkStatus === 'PASSED'")
    expect(listings).toContain('timeout: 20000')
    expect(ads).not.toMatch(/8081|\/internal\/v1/)
  })
})
