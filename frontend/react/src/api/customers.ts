import { http } from './http';

export const customersApi = {
  list(p: Record<string, unknown> = {}) {
    const params: Record<string, unknown> = { page: p.page ?? 0, size: p.size ?? 10 };
    if (p.q) params.q = p.q;
    if (p.linked === true || p.linked === false || p.linked === 'true' || p.linked === 'false') params.linked = p.linked;
    return http.get('/api/v1/customers', { params });
  },
  get: (id: number) => http.get(`/api/v1/customers/${id}`),
  create: (b: { name: string; email: string; phone: string; homeAddress: string }) =>
    http.post('/api/v1/customers', b),
  update: (id: number, b: { version: number; name: string; email: string; phone: string; homeAddress: string }) =>
    http.patch(`/api/v1/customers/${id}`, b),
  delete: (id: number) => http.delete(`/api/v1/customers/${id}`),
  link: (id: number, vehicleId: number) => http.put(`/api/v1/customers/${id}/vehicles/${vehicleId}`),
  unlink: (id: number, vehicleId: number) => http.delete(`/api/v1/customers/${id}/vehicles/${vehicleId}`),
};
