import { http } from './http';

export const photosApi = {
  list: (vehicleId: number) =>
    http.get(`/api/v1/vehicles/${vehicleId}/photos`),

  upload: (vehicleId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return http.post(`/api/v1/vehicles/${vehicleId}/photos`, form);
  },

  content: (vehicleId: number, photoId: number, variant = 'original') =>
    http.get(
      `/api/v1/vehicles/${vehicleId}/photos/${photoId}/content`,
      { params: { variant }, responseType: 'blob' },
    ),

  enhance: (vehicleId: number, photoId: number, preset: string) =>
    http.post(
      `/api/v1/vehicles/${vehicleId}/photos/${photoId}/enhance`,
      { preset },
    ),

  delete: (vehicleId: number, photoId: number) =>
    http.delete(`/api/v1/vehicles/${vehicleId}/photos/${photoId}`),
};
