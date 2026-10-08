import { http } from './http'

/** Lead follow-up (design/21-Feature-Extensions.md §3). */
export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST'

export const LEAD_STAGES: { value: LeadStage; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
]

export function stageLabel(stage: string) {
  return LEAD_STAGES.find((s) => s.value === stage)?.label ?? stage
}

export function isClosedStage(stage: string) {
  return stage === 'WON' || stage === 'LOST'
}

export type LeadFilters = { q?: string; stage?: string; owner?: string; overdue?: boolean; customerId?: number }

export type NewCustomer = { name: string; email: string; phone: string; homeAddress: string }

export type CreateLeadBody = {
  customerId?: number
  newCustomer?: NewCustomer
  vehicleId?: number
  ownerUsername?: string
  nextFollowUpOn?: string
  note?: string
}

export type PatchLeadBody = {
  stage: LeadStage
  ownerUsername: string | null
  nextFollowUpOn: string | null
  vehicleId: number | null
  lostReason: string | null
  version: number
}

const blankToUndefined = (value?: string) => (value && value.trim() ? value.trim() : undefined)

export const leadsApi = {
  list(p: LeadFilters & { page?: number; size?: number } = {}) {
    const params: Record<string, unknown> = { page: p.page ?? 0, size: p.size ?? 10 }
    if (p.q) params.q = p.q
    if (p.stage) params.stage = p.stage
    if (p.owner) params.owner = p.owner
    if (p.overdue) params.overdue = true
    if (p.customerId != null) params.customerId = p.customerId
    return http.get('/api/v1/leads', { params })
  },
  get: (id: number) => http.get(`/api/v1/leads/${id}`),
  create: (b: CreateLeadBody) =>
    http.post('/api/v1/leads', {
      customerId: b.customerId,
      newCustomer: b.newCustomer,
      vehicleId: b.vehicleId,
      ownerUsername: blankToUndefined(b.ownerUsername),
      nextFollowUpOn: blankToUndefined(b.nextFollowUpOn),
      note: blankToUndefined(b.note),
    }),
  update: (id: number, b: PatchLeadBody) => http.patch(`/api/v1/leads/${id}`, b),
  addNote: (id: number, body: string) => http.post(`/api/v1/leads/${id}/notes`, { body }),
}
