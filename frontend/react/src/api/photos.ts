import { http } from './http';

/** Wire values of the backend PhotoPreset enum (serialized SCREAMING_SNAKE_CASE). */
export type PhotoPreset = 'AUTO' | 'BRIGHTEN' | 'SHARPEN';

export type PhotoVariant = 'original' | 'enhanced';

export const PHOTO_PRESETS: { value: PhotoPreset; label: string }[] = [
  { value: 'AUTO', label: 'Auto fix' },
  { value: 'BRIGHTEN', label: 'Brighten' },
  { value: 'SHARPEN', label: 'Sharpen' },
];

export function presetLabel(preset: string) {
  return PHOTO_PRESETS.find((p) => p.value === preset)?.label ?? preset;
}

export const PHOTO_MAX_SIZE = 2 * 1024 * 1024;

export const PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png'];

export interface PhotoItem {
  id: number;
  vehicleId: number;
  contentType: string;
  enhancement: PhotoPreset | null;
  uploadedBy: string;
  createdAt: string;
}

const base = (vehicleId: number) => `/api/v1/vehicles/${vehicleId}/photos`;

export const photosApi = {
  list: (vehicleId: number) => http.get<PhotoItem[]>(base(vehicleId)),

  upload: (vehicleId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return http.post<PhotoItem>(base(vehicleId), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Image bytes as a blob: an <img> tag cannot send the bearer token. */
  content: (vehicleId: number, photoId: number, variant: PhotoVariant = 'original') =>
    http.get<Blob>(`${base(vehicleId)}/${photoId}/content`, {
      params: { variant },
      responseType: 'blob',
    }),

  enhance: (vehicleId: number, photoId: number, preset: PhotoPreset) =>
    http.post<PhotoItem>(`${base(vehicleId)}/${photoId}/enhance`, { preset }),

  delete: (vehicleId: number, photoId: number) =>
    http.delete(`${base(vehicleId)}/${photoId}`),
};
