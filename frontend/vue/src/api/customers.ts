import { http } from './http'

export const customersApi = {
  list(p: Record<string, unknown> = {}) {
    const params: Record<string, unknown> = { page: p.page ?? 0, size: p.size ?? 10 }
    if (p.q) params.q = p.q
    if (p.linked === true || p.linked === false || p.linked === 'true' || p.linked === 'false') params.linked = p.linked
    return http.get('/api/v1/customers', { params })
  },
  get: (id: number) => http.get(`/api/v1/customers/${id}`),
  create: (b: Record<string, unknown>) =>
    http.post('/api/v1/customers', {
      name: b.name,
      email: b.email,
      phone: b.phone,
      homeAddress: b.homeAddress,
    }),
  update: (id: number, b: Record<string, unknown>) =>
    http.patch(`/api/v1/customers/${id}`, {
      version: b.version,
      name: b.name,
      email: b.email,
      phone: b.phone,
      homeAddress: b.homeAddress,
    }),
  link: (id: number, vehicleId: number) => http.put(`/api/v1/customers/${id}/vehicles/${vehicleId}`),
  unlink: (id: number, vehicleId: number) => http.delete(`/api/v1/customers/${id}/vehicles/${vehicleId}`),
}
