import { http, statusOf } from './http'

export type VinDecode = {
  vin: string
  make: string
  model: string | null
  modelYear: number | null
  bodyClass: string | null
  engine: string | null
  country: string | null
  manufacturer: string | null
}

/** Make/model options and VIN decoding from the NHTSA vPIC catalog, proxied by dealer-core (design/14-Backend-API-Contract.md). */
export const catalogApi = {
  makes: () => http.get<string[]>('/api/v1/vehicle-catalog/makes'),
  models: (make: string) => http.get<string[]>('/api/v1/vehicle-catalog/models', { params: { make } }),
  /** Public: works signed out (landing page). */
  decodeVin: (vin: string) => http.get<VinDecode>(`/api/v1/vehicle-catalog/vin/${encodeURIComponent(vin)}`),
}

/** Shared copy for VIN decode failures (landing page and DMS create form). */
export function vinDecodeError(err: unknown) {
  const status = statusOf(err)
  if (status === 400) return 'VIN must be 17 letters or digits, without I, O or Q.'
  if (status === 404) return 'No vehicle found for this VIN.'
  return 'VIN decoder is unavailable. Try again later.'
}
