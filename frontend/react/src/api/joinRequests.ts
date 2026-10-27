import { http } from './http';

export type JoinRequest = {
  username: string;
  displayName: string;
  email: string | null;
  createdAt: string;
  source: string | null;
};

/** Manager actions on accounts waiting to join the caller's dealership. */
export const joinRequestsApi = {
  list: () => http.get<JoinRequest[]>('/api/v1/dealer/join-requests').then(r => r.data),
  approve: (username: string) =>
    http.post<void>(`/api/v1/dealer/join-requests/${encodeURIComponent(username)}/approve`),
  reject: (username: string) =>
    http.post<void>(`/api/v1/dealer/join-requests/${encodeURIComponent(username)}/reject`),
};
