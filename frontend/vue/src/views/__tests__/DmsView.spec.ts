/**
 * 16 FE-09 / AI-CODING-TESTS TEST-25 (DMS four states) + FE-T07 typed errors.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('DmsView four-state and typed errors (TEST-25)', () => {
  it('uses FE-T04 DMS copy and handbook write errors', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../DmsView.vue'), 'utf8')
    expect(src).toContain('Loading vehicles…')
    expect(src).toContain('No vehicles match.')
    expect(src).toContain('Could not load vehicles.')
    expect(src).toContain('You do not have access to DMS.')
    expect(src).toContain('VIN already in this dealership')
    expect(src).toContain('Purchase fields are locked')
    expect(src).toContain('Refresh and retry')
    expect(src).toContain('Sold date and price are required together')
    expect(src).toContain('ConfirmDialog')
    expect(src).toContain('Confirm sale')
  })
})
