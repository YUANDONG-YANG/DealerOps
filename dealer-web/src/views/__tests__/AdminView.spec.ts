/**
 * 16 FE-07 / TEST-23 / classroom CL-1 (Admin dual tabs).
 * See: Dealerships (Name, Contact, Staff count, Actions; New dealership) and
 * Members (Entra ID/email, Dealership, Status, Actions). One /admin route only.
 * Do not see: /admin/members, Edit dealership, vehicles tab, business menus.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import AdminView from '../AdminView.vue'

const adminApi = {
  dealers: vi.fn(),
  createDealer: vi.fn(),
  members: vi.fn(),
  bind: vi.fn(),
  unbind: vi.fn(),
}

vi.mock('../../api/admin', () => ({
  adminApi,
  adminErrorCode: () => undefined,
  adminErrorStatus: () => undefined,
}))

vi.mock('../../layouts/AppLayout.vue', () => ({
  default: { name: 'AppLayout', template: '<div class="app-layout"><slot /></div>' },
}))

const dealer = {
  id: 1,
  legalName: 'Prairie Auto Ltd.',
  contactPhone: '403-555-0100',
  contactEmail: 'desk@prairie.example',
  contactAddress: '100 1 Ave SW, Calgary',
  active: true,
  staffCount: 1,
  version: 0,
}

const member = {
  entraOid: '22222222-2222-2222-2222-222222222222',
  displayName: 'Alex Dealer',
  role: 'Dealer.User',
  active: true,
}

function envelope<T>(items: T[]) {
  return { data: { items, page: 0, size: 10, total: items.length } }
}

function mountAdmin() {
  return mount(AdminView, { global: { plugins: [ElementPlus] } })
}

function headersOf(wrapper: ReturnType<typeof mountAdmin>) {
  return wrapper.findAll('th').map((n) => n.text())
}

function clickNamed(wrapper: ReturnType<typeof mountAdmin>, label: string) {
  const btn = wrapper.findAll('button').find((b) => b.text().trim() === label)
  if (!btn) throw new Error(`button not found: ${label}`)
  return btn.trigger('click')
}

describe('FE-07 Admin dual tabs (TEST-23)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminApi.dealers.mockResolvedValue(envelope([dealer]))
    adminApi.members.mockResolvedValue(envelope([member]))
    adminApi.createDealer.mockResolvedValue({ data: dealer })
    adminApi.bind.mockResolvedValue({ data: member })
    adminApi.unbind.mockResolvedValue({})
  })

  it('renders Dealerships and Members on the same /admin page', async () => {
    const wrapper = mountAdmin()
    await flushPromises()
    const tabs = wrapper.findAll('.el-tabs__item').map((n) => n.text())
    expect(tabs).toEqual(['Dealerships', 'Members'])
    expect(wrapper.text()).not.toMatch(/Vehicles/)
    expect(wrapper.text()).not.toMatch(/Edit dealership/)
  })

  it('Dealerships has Name, Contact, Staff count, Actions, store-name filter, and New dealership', async () => {
    const wrapper = mountAdmin()
    await flushPromises()
    const headers = headersOf(wrapper).join(' | ')
    expect(headers).toContain('Name')
    expect(headers).toContain('Contact')
    expect(headers).toContain('Staff count')
    expect(headers).toContain('Actions')
    expect(wrapper.find('input[placeholder="Dealership name"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('New dealership')
    expect(wrapper.text()).toContain('Prairie Auto Ltd.')
    expect(wrapper.text()).toContain('Staff')
    expect(adminApi.dealers).toHaveBeenCalledWith(expect.objectContaining({ q: '', page: 0, size: 10 }))
  })

  it('Members flattens each store’s members via 14 APIs, not GET /admin/members', async () => {
    const wrapper = mountAdmin()
    await flushPromises()
    const memberTab = wrapper.findAll('.el-tabs__item').find((n) => n.text() === 'Members')
    expect(memberTab).toBeTruthy()
    await memberTab!.trigger('click')
    await flushPromises()
    expect(adminApi.dealers).toHaveBeenCalled()
    expect(adminApi.members).toHaveBeenCalledWith(1, expect.objectContaining({ q: '', page: 0, size: 10 }))
    expect(adminApi.members.mock.calls.every((c) => typeof c[0] === 'number')).toBe(true)
    expect(wrapper.find('input[placeholder="Staff email"]').exists()).toBe(true)
    const headers = headersOf(wrapper).join(' | ')
    expect(headers).toContain('Entra ID / email')
    expect(headers).toContain('Dealership')
    expect(headers).toContain('Status')
    expect(headers).toContain('Actions')
    expect(wrapper.text()).toContain(member.entraOid)
    expect(wrapper.text()).toContain('Prairie Auto Ltd.')
    expect(wrapper.text()).toContain('Unbind')
  })

  it('Staff and Unbind use GET/DELETE /admin/dealers/{id}/members from 14', async () => {
    const wrapper = mountAdmin()
    await flushPromises()
    await clickNamed(wrapper, 'Staff')
    await flushPromises()
    expect(adminApi.members).toHaveBeenCalledWith(1, expect.objectContaining({ page: 0, size: 10 }))
    await clickNamed(wrapper, 'Unbind')
    await flushPromises()
    await clickNamed(wrapper, 'Confirm')
    await flushPromises()
    expect(adminApi.unbind).toHaveBeenCalledWith(1, member.entraOid)
  })

  it('bans a second Admin child route, Edit dealership, Vehicles tab, and invented /admin/members', () => {
    const dir = dirname(fileURLToPath(import.meta.url))
    const viewSrc = readFileSync(join(dir, '../AdminView.vue'), 'utf8')
    const apiSrc = readFileSync(join(dir, '../../api/admin.ts'), 'utf8')
    const routerSrc = readFileSync(join(dir, '../../router/index.ts'), 'utf8')
    expect(routerSrc).toMatch(/path:\s*['"]\/admin['"]/)
    expect(routerSrc).not.toMatch(/\/admin\/members/)
    expect(apiSrc).not.toMatch(/['"`]\/api\/v1\/admin\/members/)
    expect(apiSrc).not.toMatch(/http\.patch\(/)
    expect(viewSrc).not.toMatch(/Edit dealership/)
    expect(viewSrc).not.toMatch(/Vehicles/)
    expect(viewSrc).toContain('openMembers')
  })
})
