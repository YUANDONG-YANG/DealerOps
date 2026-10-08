import { http } from './http'

/** Make/model options from the NHTSA vPIC catalog, proxied by dealer-core (design/14-Backend-API-Contract.md). */
export const catalogApi = {
  makes: () => http.get<string[]>('/api/v1/vehicle-catalog/makes'),
  models: (make: string) => http.get<string[]>('/api/v1/vehicle-catalog/models', { params: { make } }),
}
