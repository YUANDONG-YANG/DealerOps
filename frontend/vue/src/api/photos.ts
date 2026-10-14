import { http } from './http'

export type PhotoPreset = 'AUTO' | 'BRIGHTEN' | 'SHARPEN'

export type PhotoItem = {
  id: number
  vehicleId: number
  contentType: string
  enhancement: PhotoPreset | null
  uploadedBy: string
  createdAt: string
}

export type PhotoVariant = 'original' | 'enhanced'

/** Same limit as dealer-core spring.servlet.multipart.max-file-size (PHOTO_MAX_FILE_SIZE). */
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024

/** Image Studio photos of one vehicle (design/21-Feature-Extensions.md §6). */
export const photosApi = {
  list: (vehicleId: number) => http.get<PhotoItem[]>(`/api/v1/vehicles/${vehicleId}/photos`),
  upload(vehicleId: number, file: File) {
    const form = new FormData()
    form.append('file', file)
    // multipart, not the client's JSON default; the browser adds the boundary.
    return http.post<PhotoItem>(`/api/v1/vehicles/${vehicleId}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  /** Image bytes as a Blob: an <img> cannot send the bearer token, so the page makes an object URL. */
  content: (vehicleId: number, photoId: number, variant: PhotoVariant) =>
    http.get<Blob>(`/api/v1/vehicles/${vehicleId}/photos/${photoId}/content`, {
      params: { variant },
      responseType: 'blob',
    }),
  enhance: (vehicleId: number, photoId: number, preset: PhotoPreset) =>
    http.post<PhotoItem>(`/api/v1/vehicles/${vehicleId}/photos/${photoId}/enhance`, { preset }),
  remove: (vehicleId: number, photoId: number) =>
    http.delete(`/api/v1/vehicles/${vehicleId}/photos/${photoId}`),
}
