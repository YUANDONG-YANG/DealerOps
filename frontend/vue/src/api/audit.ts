import { http } from './http'

export const auditApi = {
  list(p: { entityType: string; entityId: number; page?: number; size?: number }) {
    return http.get('/api/v1/audit', {
      params: {
        entityType: p.entityType,
        entityId: p.entityId,
        page: p.page ?? 0,
        size: p.size ?? 10,
      },
    })
  },
}
