import { http } from './http';

export interface WorkOrder {
  id: number;
  vehicleId: number;
  task: string;
  assigneeUsername: string | null;
  status: string;
  dueOn: string | null;
  cost: number | null;
  completionNote: string | null;
  completedOn: string | null;
  createdAt: string;
  version: number;
}

export type CreateWorkOrderBody = {
  task: string;
  assigneeUsername: string | null;
  dueOn: string | null;
};

// PATCH /api/v1/work-orders/{id} takes the full editable state, so every call
// resends the fields it does not change (21-Feature-Extensions.md §4).
export interface PatchWorkOrderBody {
  status: string;
  task: string;
  assigneeUsername: string | null;
  dueOn: string | null;
  cost: number | null;
  completionNote: string | null;
  version: number;
}

export const workOrdersApi = {
  list: (vehicleId: number) => http.get<WorkOrder[]>(`/api/v1/vehicles/${vehicleId}/work-orders`),
  create: (vehicleId: number, body: CreateWorkOrderBody) =>
    http.post<WorkOrder>(`/api/v1/vehicles/${vehicleId}/work-orders`, body),
  patch: (id: number, body: PatchWorkOrderBody) => http.patch<WorkOrder>(`/api/v1/work-orders/${id}`, body),
};
