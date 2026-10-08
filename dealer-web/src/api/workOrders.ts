import { http } from './http'

/** Reconditioning work orders (design/21-Feature-Extensions.md §4). */
export type WorkOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'

export type WorkOrder = {
  id: number
  vehicleId: number
  task: string
  assigneeUsername: string | null
  status: WorkOrderStatus
  dueOn: string | null
  cost: number | null
  completionNote: string | null
  completedOn: string | null
  createdAt: string
  version: number
}

export type WorkOrderPatch = {
  status: WorkOrderStatus
  task: string
  assigneeUsername: string | null
  dueOn: string | null
  cost?: number | null
  completionNote?: string | null
  version: number
}

export const workOrdersApi = {
  list: (vehicleId: number) => http.get<WorkOrder[]>(`/api/v1/vehicles/${vehicleId}/work-orders`),
  create: (vehicleId: number, b: { task: string; assigneeUsername: string | null; dueOn: string | null }) =>
    http.post<WorkOrder>(`/api/v1/vehicles/${vehicleId}/work-orders`, b),
  patch: (id: number, b: WorkOrderPatch) => http.patch<WorkOrder>(`/api/v1/work-orders/${id}`, b),
}
