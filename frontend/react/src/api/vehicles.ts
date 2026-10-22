import { http } from './http';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function vehicleWriteBody(b: any) {
  const body: Record<string, unknown> = {
    make: b.make,
    model: b.model,
    modelYear: b.modelYear === '' || b.modelYear == null ? b.modelYear : Number(b.modelYear),
    vin: b.vin,
    source: b.source,
    purchaseCost: b.purchaseCost === '' || b.purchaseCost == null ? b.purchaseCost : Number(b.purchaseCost),
    addedOn: b.addedOn,
    conditionCode: b.conditionCode,
    repairCost: b.repairCost === '' || b.repairCost == null ? null : Number(b.repairCost),
    carfaxUrl: b.carfaxUrl === '' ? null : b.carfaxUrl,
    mileageKm: b.mileageKm === '' || b.mileageKm == null ? null : Number(b.mileageKm),
    exteriorColor: b.exteriorColor === '' ? null : b.exteriorColor,
    fuelType: b.fuelType === '' ? null : b.fuelType,
    stockNumber: b.stockNumber === '' ? null : b.stockNumber,
    listPrice: b.listPrice === '' || b.listPrice == null ? null : Number(b.listPrice),
  };
  // Omitted body type lets the API default a new vehicle to OTHER (VIN-03).
  if (b.bodyType) body.bodyType = b.bodyType;
  return body;
}

export const vehiclesApi = {
  list(p: Record<string, unknown> = {}) {
    const params: Record<string, unknown> = { page: p.page ?? 0, size: p.size ?? 10 };
    if (p.q) params.q = p.q;
    if (p.status) params.status = p.status;
    if (p.condition) params.condition = p.condition;
    if (p.bodyType) params.bodyType = p.bodyType;
    if (p.make) params.make = p.make;
    if (p.model) params.model = p.model;
    if (p.modelYear) params.modelYear = p.modelYear;
    if (p.unlinkedOnly) params.unlinkedOnly = true;
    if (p.adKind) params.adKind = p.adKind;
    if (p.medium) params.medium = p.medium;
    if (p.checkStatus) params.checkStatus = p.checkStatus;
    if (p.buyerSite) params.buyerSite = p.buyerSite;
    return http.get('/api/v1/vehicles', { params });
  },
  get: (id: number) => http.get(`/api/v1/vehicles/${id}`),
  create: (b: object) => http.post('/api/v1/vehicles', vehicleWriteBody(b)),
  update: (id: number, b: object & { version?: number }) =>
    http.patch(`/api/v1/vehicles/${id}`, { ...vehicleWriteBody(b), version: b.version }),
  sell: (id: number, b: { soldOn: string; soldPrice: unknown; version: number }) =>
    http.post(`/api/v1/vehicles/${id}/sell`, {
      soldOn: b.soldOn,
      soldPrice: b.soldPrice === '' || b.soldPrice == null ? b.soldPrice : Number(b.soldPrice),
      version: b.version,
    }),
  delete: (id: number) => http.delete(`/api/v1/vehicles/${id}`),
};
