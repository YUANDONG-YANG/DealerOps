/**
 * 16 FE-08 / AI-CODING-TESTS TEST-24
 * Unlink uses ConfirmDialog; cancel sends no request; confirm DELETE .../vehicles/{id}.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import CrmView from '../CrmView.vue'

const customersApi = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  link: vi.fn(),
  unlink: vi.fn(),
}

vi.mock('../../api/customers', () => ({ customersApi }))
vi.mock('../../api/vehicles', () => ({
  vehiclesApi: { list: vi.fn().mockResolvedValue({ data: { items: [], total: 0 } }) },
  errorCode: (e: { response?: { data?: { code?: string } } }) => e.response?.data?.code || '',
  errorStatus: (e: { response?: { status?: number } }) => e.response?.status ?? 0,
}))
vi.mock('../../api/audit', () => ({
  auditApi: { list: vi.fn().mockResolvedValue({ data: { items: [] } }) },
}))
vi.mock('../../layouts/AppLayout.vue', () => ({
  default: { name: 'AppLayout', template: '<div class="app-layout"><slot /></div>' },
}))

const customer = {
  id: 7,
  name: 'Pat Buyer',
  email: 'pat@example.com',
  phone: '403-555-0100',
  homeAddress: '100 1 Ave SW',
  version: 1,
  linkedVehicle: { id: 10, modelYear: 2020, make: 'Toyota', model: 'Camry', status: 'IN_STOCK' },
  linkedVehicles: [{ id: 10, modelYear: 2020, make: 'Toyota', model: 'Camry', status: 'IN_STOCK' }],
}

function clickNamed(wrapper: ReturnType<typeof mount>, label: string) {
  const btn = wrapper.findAll('button').find((b) => b.text().trim() === label)
  if (!btn) throw new Error(`button not found: ${label}`)
  return btn.trigger('click')
}

describe('FE-08 CRM Unlink (TEST-24)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    customersApi.list.mockResolvedValue({ data: { items: [customer], page: 0, size: 10, total: 1 } })
    customersApi.get.mockResolvedValue({ data: customer })
    customersApi.unlink.mockResolvedValue({})
  })

  it('opens ConfirmDialog first; cancel sends no DELETE', async () => {
    const wrapper = mount(CrmView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await clickNamed(wrapper, 'Edit')
    await flushPromises()
    await clickNamed(wrapper, 'Unlink')
    await flushPromises()
    expect(wrapper.text()).toContain('Remove this vehicle link?')
    await clickNamed(wrapper, 'Cancel')
    await flushPromises()
    expect(customersApi.unlink).not.toHaveBeenCalled()
  })

  it('confirm calls DELETE /customers/{id}/vehicles/{vehicleId}', async () => {
    const wrapper = mount(CrmView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await clickNamed(wrapper, 'Edit')
    await flushPromises()
    await clickNamed(wrapper, 'Unlink')
    await flushPromises()
    await clickNamed(wrapper, 'Confirm')
    await flushPromises()
    expect(customersApi.unlink).toHaveBeenCalledWith(7, 10)
  })

  it('sold copy and no empty PUT unlink', () => {
    const dir = dirname(fileURLToPath(import.meta.url))
    const view = readFileSync(join(dir, '../CrmView.vue'), 'utf8')
    const api = readFileSync(join(dir, '../../api/customers.ts'), 'utf8')
    expect(view).toContain('Sold vehicles cannot be unlinked')
    expect(view).toContain('ConfirmDialog')
    expect(api).toMatch(/http\.delete\(`\/api\/v1\/customers\/\$\{id\}\/vehicles\/\$\{vehicleId\}`\)/)
    expect(api).not.toMatch(/http\.put\([^)]*vehicles/)
    expect(view).not.toMatch(/not yet provided|not provided yet/)
  })
})
