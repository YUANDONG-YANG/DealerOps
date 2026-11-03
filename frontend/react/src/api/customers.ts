import { http } from './http';

const DUPLICATE_FIELD_LABELS: Record<string, string> = {
  name: 'name', email: 'email', phone: 'phone', homeAddress: 'address',
};

/**
 * Confirm text for a customer whose fields match another one, e.g.
 * "A customer with this name and phone already exists. Create anyway?".
 *
 * @param fields matching fields from {@link customersApi.duplicates}
 * @param verb "Create" for a new customer, "Save" for an edit
 */
export function duplicateCustomerMessage(fields: string[], verb: 'Create' | 'Save' = 'Create'): string {
  const labels = fields.map((f) => DUPLICATE_FIELD_LABELS[f] ?? f);
  const joined = labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}` : labels[0];
  return `A customer with this ${joined} already exists. ${verb} anyway?`;
}

/** CRM customers for the signed-in dealership, including linking and unlinking a vehicle. */
export const customersApi = {
  list(p: Record<string, unknown> = {}) {
    const params: Record<string, unknown> = { page: p.page ?? 0, size: p.size ?? 10 };
    if (p.q) params.q = p.q;
    if (p.linked === true || p.linked === false || p.linked === 'true' || p.linked === 'false') params.linked = p.linked;
    return http.get('/api/v1/customers', { params });
  },
  get: (id: number) => http.get(`/api/v1/customers/${id}`),
  /** Fields (name, email, phone, homeAddress) that match another customer; excludeId skips the one being edited. */
  duplicates: (b: { name: string; email: string; phone: string; homeAddress: string }, excludeId?: number) =>
    http.get<{ fields: string[] }>('/api/v1/customers/duplicates', {
      params: { name: b.name, email: b.email, phone: b.phone, homeAddress: b.homeAddress, excludeId },
    }),
  create: (b: { name: string; email: string; phone: string; homeAddress: string; notes?: string }) =>
    http.post('/api/v1/customers', b),
  update: (id: number, b: { version: number; name: string; email: string; phone: string; homeAddress: string; notes?: string }) =>
    http.patch(`/api/v1/customers/${id}`, b),
  delete: (id: number) => http.delete(`/api/v1/customers/${id}`),
  link: (id: number, vehicleId: number) => http.put(`/api/v1/customers/${id}/vehicles/${vehicleId}`),
  unlink: (id: number, vehicleId: number) => http.delete(`/api/v1/customers/${id}/vehicles/${vehicleId}`),
};
