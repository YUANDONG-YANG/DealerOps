/**
 * 16 FE-10 / AI-CODING-TESTS TEST-26
 * Model-down 200 → Smart summary unavailable; 5xx → Could not ask assistant.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import AssistantView from '../AssistantView.vue'

const assistantApi = { ask: vi.fn() }

vi.mock('../../api/assistant', () => ({ assistantApi }))
vi.mock('../../api/http', async () => {
  const actual = await vi.importActual<typeof import('../../api/http')>('../../api/http')
  return actual
})
vi.mock('../../layouts/AppLayout.vue', () => ({
  default: { name: 'AppLayout', template: '<div class="app-layout"><slot /></div>' },
}))

const cards = [
  { kind: 'VEHICLE', id: 10, label: '2020 Toyota Camry', status: 'IN_STOCK' },
  { kind: 'CUSTOMER', id: 7, label: 'Pat Buyer' },
  { kind: 'LISTING', id: 3, label: 'Camry ad', vehicleId: 10, checkStatus: 'PASSED' },
]

function clickAsk(wrapper: ReturnType<typeof mount>) {
  const btn = wrapper.findAll('button').find((b) => b.text().trim() === 'Ask')
  if (!btn) throw new Error('Ask not found')
  return btn.trigger('click')
}

describe('FE-10 Assistant failure (TEST-26)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('model down but HTTP 200 still shows Smart summary unavailable and cards', async () => {
    assistantApi.ask.mockResolvedValue({
      data: { summary: null, summaryAvailable: false, cards },
    })
    const wrapper = mount(AssistantView, {
      global: { plugins: [ElementPlus], stubs: { AssistantCard: { props: ['card'], template: '<div class="card">{{ card.label }}</div>' } } },
    })
    await wrapper.find('input').setValue('Which Camry is in stock?')
    await clickAsk(wrapper)
    await flushPromises()
    expect(wrapper.text()).toContain('Smart summary unavailable')
    expect(wrapper.text()).toContain('2020 Toyota Camry')
    expect(wrapper.text()).not.toMatch(/Smart explanation/)
  })

  it('whole-page 5xx shows Could not ask assistant', async () => {
    assistantApi.ask.mockRejectedValue({ response: { status: 502 } })
    const wrapper = mount(AssistantView, { global: { plugins: [ElementPlus] } })
    await wrapper.find('input').setValue('Any unsold trucks?')
    await clickAsk(wrapper)
    await flushPromises()
    expect(wrapper.text()).toContain('Could not ask assistant.')
  })

  it('cards stay ≤5, read-only, and jump /dms /crm /ads; no phone on cards', () => {
    const dir = dirname(fileURLToPath(import.meta.url))
    const view = readFileSync(join(dir, '../AssistantView.vue'), 'utf8')
    const card = readFileSync(join(dir, '../../components/AssistantCard.vue'), 'utf8')
    expect(view).toContain('slice(0, 5)')
    expect(view).toContain("path: '/dms'")
    expect(view).toContain("path: '/crm'")
    expect(view).toContain("path: '/ads'")
    expect(view).not.toMatch(/\/internal\/v1/)
    expect(card).not.toMatch(/phone|email|homeAddress/)
    expect(view).not.toMatch(/assistantApi\.(create|update|delete)/)
  })
})
