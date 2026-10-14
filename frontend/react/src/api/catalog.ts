import { http, apiError } from './http';

export type VinDecode = {
  make: string; model: string; modelYear: number | null;
  bodyClass: string | null; engine: string | null;
  country: string | null; manufacturer: string | null;
};

export const catalogApi = {
  decodeVin: (vin: string) => http.get<VinDecode>(`/api/v1/catalog/vin/${encodeURIComponent(vin)}`),
  makes: () => http.get<string[]>('/api/v1/catalog/makes'),
  models: (make: string) => http.get<string[]>(`/api/v1/catalog/makes/${encodeURIComponent(make)}/models`),
};

export function vinDecodeError(err: unknown): string {
  const { status, code } = apiError(err);
  if (code === 'VIN_INVALID') return 'VIN must be 17 characters (no I, O, Q).';
  if (code === 'VIN_NOT_FOUND') return 'VIN not found in the NHTSA catalog.';
  if (status === 502 || code === 'UPSTREAM_FAILED') return 'NHTSA catalog unavailable. Try again later.';
  return 'Could not decode VIN.';
}
