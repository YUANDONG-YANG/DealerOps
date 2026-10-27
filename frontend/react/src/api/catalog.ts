import { http, apiError } from './http';
import { describeError } from './errors';

export type VinDecode = {
  make: string; model: string | null; modelYear: number | null;
  bodyClass: string | null; bodyType: string | null; engine: string | null;
  country: string | null; manufacturer: string | null;
};

/** Vehicle catalog, and the anonymous VIN decode used by the landing page and the DMS form. */
export const catalogApi = {
  decodeVin: (vin: string) => http.get<VinDecode>(`/api/v1/catalog/vin/${encodeURIComponent(vin)}`),
  makes: () => http.get<string[]>('/api/v1/catalog/makes'),
  models: (make: string) => http.get<string[]>('/api/v1/catalog/models', { params: { make } }),
};

/**
 * User message for a rejected VIN decode. A catalog outage stays distinct from a VIN the catalog does not know.
 *
 * @param err rejection from `catalogApi.decodeVin`
 * @returns text safe to show next to the VIN field
 */
export function vinDecodeError(err: unknown): string {
  const { status, code } = apiError(err);
  if (code === 'VALIDATION') return 'VIN must be 17 characters (no I, O, Q).';
  if (code === 'NOT_FOUND') return 'VIN not found in the NHTSA catalog. Double-check the 17 characters, or enter the vehicle details yourself.';
  if (status === 502 || code === 'CATALOG_UNAVAILABLE') return 'NHTSA catalog unavailable. Try again in a minute, or enter the make, model and year yourself.';
  return describeError(err, 'decode VIN');
}
