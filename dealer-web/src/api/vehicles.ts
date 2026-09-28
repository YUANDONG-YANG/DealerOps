import { codeOf, http, statusOf } from './http'

export function errorStatus(error: unknown): number {
  return statusOf(error) ?? 0
}

export function errorCode(error: unknown): string {
  return codeOf(error) || ''
}

function vehicleWriteBody(b: Record<string, unknown>) {
  return {
    make: b.make,
    model: b.model,
    modelYear: b.modelYear === '' || b.modelYear == null ? b.modelYear : Number(b.modelYear),
    vin: b.vin,
    source: b.source,
    purchaseCost: b.purchaseCost === '' || b.purchaseCost == null ? b.purchaseCost : Number(b.purchaseCost),
    addedOn: b.addedOn,
    conditionCode: b.conditionCode,
    repairCost: b.repairCost === '' || b.repairCost == null ? null : Number(b.repairCost),
    carfaxUrl: b.carfaxUrl === '' ? null : b.carfaxUrl,
  }
}

export const vehiclesApi = {
  list(p: Record<string, unknown> = {}) {
    const params: Record<string, unknown> = { page: p.page ?? 0, size: p.size ?? 10 }
    if (p.q) params.q = p.q
    if (p.status) params.status = p.status
    if (p.condition) params.condition = p.condition
    return http.get('/api/v1/vehicles', { params })
  },
  get: (id: number) => http.get(`/api/v1/vehicles/${id}`),
  create: (b: Record<string, unknown>) => http.post('/api/v1/vehicles', vehicleWriteBody(b)),
  update: (id: number, b: Record<string, unknown>) =>
    http.patch(`/api/v1/vehicles/${id}`, { ...vehicleWriteBody(b), version: b.version }),
  sell: (id: number, b: { soldOn: string; soldPrice: unknown; version: number }) =>
    http.post(`/api/v1/vehicles/${id}/sell`, {
      soldOn: b.soldOn,
      soldPrice: b.soldPrice === '' || b.soldPrice == null ? b.soldPrice : Number(b.soldPrice),
      version: b.version,
    }),
}
