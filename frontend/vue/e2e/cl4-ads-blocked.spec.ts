/**
 * 16 CL-4 / AI-CODING-TESTS TEST-27
 * Classroom: FX-01 / FX-03 Blocked is HTTP 200; browser must not call /internal/v1/ad-check.
 * Live cloud run is Review 2; this file locks the SPA wiring.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const dir = dirname(fileURLToPath(import.meta.url))

describe('CL-4 ads blocked (TEST-27)', () => {
  it('empty draft copy, Blocked UI, no browser /internal, Ready only when Passed', () => {
    const ads = readFileSync(join(dir, '../src/views/AdsView.vue'), 'utf8')
    const workspace = readFileSync(join(dir, '../src/components/AdWorkspace.vue'), 'utf8')
    const listings = readFileSync(join(dir, '../src/api/listings.ts'), 'utf8')
    const http = readFileSync(join(dir, '../src/api/http.ts'), 'utf8')
    const gateway = readFileSync(join(dir, '../src/api/gateway.ts'), 'utf8')

    expect(workspace).toContain('Select a vehicle to start.')
    expect(ads).toContain('No vehicles to advertise.')
    expect(listings).toContain("BLOCKED: 'Blocked'")
    expect(listings).toMatch(/\/api\/v1\/listings\/\$\{listingId\}\/checks/)
    expect(ads + listings + http + gateway).not.toMatch(/\/internal\/v1/)
    expect(ads + listings + http).not.toMatch(/8081|8082/)
    expect(ads).toContain("listing.value.checkStatus === 'PASSED'")
  })
})
