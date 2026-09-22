/**
 * 16 FE-09 / AI-CODING-TESTS TEST-25
 * Six-page loading / empty / error / forbidden copy per 13 §10 / FE-T04.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PageState from '../PageState.vue'

const dir = dirname(fileURLToPath(import.meta.url))

function src(rel: string) {
  return readFileSync(join(dir, rel), 'utf8')
}

describe('FE-09 PageState four-state copy (TEST-25)', () => {
  it('renders loading, empty, error, and forbidden slots', () => {
    const loading = mount(PageState, { props: { loading: true, loadingText: 'Loading vehicles…' } })
    expect(loading.text()).toBe('Loading vehicles…')
    const empty = mount(PageState, { props: { empty: true, emptyText: 'No vehicles match.' } })
    expect(empty.text()).toBe('No vehicles match.')
    const error = mount(PageState, { props: { error: 'Could not load vehicles.' } })
    expect(error.text()).toBe('Could not load vehicles.')
    const forbidden = mount(PageState, {
      props: { forbidden: true, forbiddenText: 'You do not have access to DMS.' },
    })
    expect(forbidden.text()).toBe('You do not have access to DMS.')
  })

  it('keeps FE-T04 strings on all six pages and does not paint 403 as an empty table', () => {
    const login = src('../../views/LoginView.vue')
    const admin = src('../../views/AdminView.vue')
    const dms = src('../../views/DmsView.vue')
    const crm = src('../../views/CrmView.vue')
    const ads = src('../../views/AdsView.vue')
    const assistant = src('../../views/AssistantView.vue')
    const workspace = src('../AdWorkspace.vue')
    const listings = src('../../api/listings.ts')

    expect(login).toContain('Signing you in…')
    expect(login).toContain('Sign-in failed. Try again.')

    expect(admin).toContain('Loading dealerships…')
    expect(admin).toContain('No dealerships yet.')
    expect(admin).toContain('Could not load dealerships.')
    expect(admin).toContain('You do not have access to Admin.')

    expect(dms).toContain('Loading vehicles…')
    expect(dms).toContain('No vehicles match.')
    expect(dms).toContain('Could not load vehicles.')
    expect(dms).toContain('You do not have access to DMS.')

    expect(crm).toContain('Loading customers…')
    expect(crm).toContain('No customers match.')
    expect(crm).toContain('Could not load customers.')
    expect(crm).toContain('You do not have access to CRM.')

    expect(ads).toContain('Loading listing…')
    expect(ads).toContain('No vehicles to advertise.')
    expect(ads).toContain('Could not load listing.')
    expect(ads).toContain('You do not have access to Ad compliance.')
    expect(workspace).toContain('Select a vehicle to start.')
    expect(ads).toContain('AI_UNAVAILABLE')
    expect(listings).toContain('AI unavailable')

    expect(assistant).toContain('Asking…')
    expect(assistant).toContain('Ask a question about this dealership.')
    expect(assistant).toContain('Could not ask assistant.')
    expect(assistant).toContain('You do not have access to Assistant.')
    expect(assistant).toContain('Smart summary unavailable')
    expect(assistant).not.toMatch(/Smart explanation/)

    expect(admin + dms + crm + ads).toContain(':forbidden')
  })
})
