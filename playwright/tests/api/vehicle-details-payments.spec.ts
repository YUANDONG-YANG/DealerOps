import { test, expect } from '../../support/fixtures';
import { type Api, expectError, expectStatus, randomDigits, vehicleBody, type Vehicle } from '../../support/api';

// Listing details on a vehicle (design/21 DMS-18) and the payment ledger of a sold vehicle
// (design/21 PAY-01 to PAY-04, contract §4.1 and §4.3c).

type Details = Vehicle & {
  mileageKm: number | null; exteriorColor: string | null; fuelType: string | null;
  stockNumber: string | null; listPrice: number | null;
};

type Ledger = {
  soldPrice: number; paidTotal: number; balanceDue: number;
  items: { id: number; amount: number; method: string; paidOn: string; note: string | null }[];
};

type AuditPage = { items: { action: string; fieldSummary: Record<string, unknown> | null }[] };

const SOLD_ON = '2026-10-15';

function stock() {
  return `E2E${randomDigits(8)}`;
}

function patchBody(v: Details, overrides: Record<string, unknown> = {}) {
  return {
    make: v.make, model: v.model, modelYear: v.modelYear, vin: v.vin, source: v.source,
    purchaseCost: v.purchaseCost, addedOn: v.addedOn, conditionCode: v.conditionCode,
    repairCost: v.repairCost, carfaxUrl: v.carfaxUrl, mileageKm: v.mileageKm,
    exteriorColor: v.exteriorColor, fuelType: v.fuelType, stockNumber: v.stockNumber,
    listPrice: v.listPrice, version: v.version, ...overrides,
  };
}

test.describe('DMS-18: listing details', () => {
  test('create, search and edit stock number, mileage, colour, fuel type and list price', async ({ staffApi }) => {
    const stockNumber = stock();
    const v = (await staffApi.createVehicle({
      mileageKm: 45210, exteriorColor: 'Blue', fuelType: 'PLUGIN_HYBRID', stockNumber, listPrice: 18995.5,
    })) as Details;
    expect(v).toMatchObject({ mileageKm: 45210, exteriorColor: 'Blue', fuelType: 'PLUGIN_HYBRID', stockNumber, listPrice: 18995.5 });

    const search = await staffApi.get('/api/v1/vehicles', { q: stockNumber });
    await expectStatus(search, 200);
    const found = (await search.json()) as { items: { id: number }[] };
    expect(found.items.map((i) => i.id)).toEqual([v.id]);

    const res = await staffApi.patch(`/api/v1/vehicles/${v.id}`, patchBody(v, { mileageKm: 46000, fuelType: 'HYBRID', listPrice: 18500 }));
    await expectStatus(res, 200);
    expect(await res.json()).toMatchObject({ mileageKm: 46000, fuelType: 'HYBRID', listPrice: 18500, exteriorColor: 'Blue' });

    const audit = await staffApi.get('/api/v1/audit', { entityType: 'VEHICLE', entityId: v.id });
    await expectStatus(audit, 200);
    const update = ((await audit.json()) as AuditPage).items.find((a) => a.action === 'UPDATE');
    expect(update?.fieldSummary).toMatchObject({ mileageKm: 46000, fuelType: 'HYBRID', listPrice: 18500 });
  });

  test('the details are optional and a patch without them clears them', async ({ staffApi }) => {
    const v = (await staffApi.createVehicle({ mileageKm: 1000, stockNumber: stock() })) as Details;
    const res = await staffApi.patch(`/api/v1/vehicles/${v.id}`, patchBody(v, {
      mileageKm: null, exteriorColor: null, fuelType: null, stockNumber: null, listPrice: null,
    }));
    await expectStatus(res, 200);
    const cleared = (await res.json()) as Details;
    expect(cleared.mileageKm ?? null).toBeNull();
    expect(cleared.stockNumber ?? null).toBeNull();
  });

  test('invalid details are rejected field by field', async ({ staffApi }) => {
    const stockNumber = stock();
    await staffApi.createVehicle({ stockNumber });

    for (const [field, value] of [['mileageKm', -1], ['listPrice', 1.234], ['listPrice', -5], ['stockNumber', stockNumber]] as const) {
      const res = await staffApi.post('/api/v1/vehicles', vehicleBody({ [field]: value }));
      const text = await res.text();
      expect(res.status(), `${field}=${value} → ${text}`).toBe(400);
      expect(JSON.parse(text).fieldErrors?.[field], text).toBeTruthy();
    }
  });

  test('a stock number in another dealership does not clash', async ({ staffApi, rivalApi }) => {
    const stockNumber = stock();
    await staffApi.createVehicle({ stockNumber });
    const rival = (await rivalApi.createVehicle({ stockNumber })) as Details;
    expect(rival.stockNumber).toBe(stockNumber);
  });

  test('the details are locked once the vehicle is sold', async ({ staffApi }) => {
    const v = (await staffApi.createVehicle({ mileageKm: 30000 })) as Details;
    const sold = (await staffApi.sellVehicle(v, 18000, SOLD_ON)) as Details;
    await expectError(await staffApi.patch(`/api/v1/vehicles/${v.id}`, patchBody(sold, { mileageKm: 1 })), 409, 'SOLD_LOCKED');
  });
});

async function soldVehicle(api: Api) {
  const v = await api.createVehicle();
  return api.sellVehicle(v, 18000, SOLD_ON);
}

test.describe('PAY-01 to PAY-04: payments on a sold vehicle', () => {
  test('PAY-01: an unsold vehicle takes no payments', async ({ staffApi }) => {
    const v = await staffApi.createVehicle();
    const res = await staffApi.post(`/api/v1/vehicles/${v.id}/payments`, { amount: 100, method: 'CASH', paidOn: SOLD_ON });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('PAY-02: payments reduce the balance due; removing one restores it', async ({ staffApi }) => {
    const v = await soldVehicle(staffApi);
    const path = `/api/v1/vehicles/${v.id}/payments`;

    const empty = await staffApi.get(path);
    await expectStatus(empty, 200);
    expect(await empty.json()).toMatchObject({ soldPrice: 18000, paidTotal: 0, balanceDue: 18000, items: [] });

    const first = await staffApi.post(path, { amount: 5000, method: 'BANK_TRANSFER', paidOn: SOLD_ON, note: 'Deposit' });
    await expectStatus(first, 201);
    expect(await first.json()).toMatchObject({ paidTotal: 5000, balanceDue: 13000 });

    const second = await staffApi.post(path, { amount: 13000, method: 'FINANCING', paidOn: '2026-10-16' });
    await expectStatus(second, 201);
    const settled = (await second.json()) as Ledger;
    expect(settled.balanceDue).toBe(0);
    expect(settled.items).toHaveLength(2);

    const financing = settled.items.find((i) => i.method === 'FINANCING')!;
    const removed = await staffApi.delete(`${path}/${financing.id}`);
    await expectStatus(removed, 200);
    expect(await removed.json()).toMatchObject({ paidTotal: 5000, balanceDue: 13000 });
  });

  test('PAY-03: overpayment and out-of-range dates are rejected', async ({ staffApi }) => {
    const v = await soldVehicle(staffApi);
    const path = `/api/v1/vehicles/${v.id}/payments`;
    const cases: [Record<string, unknown>, string][] = [
      [{ amount: 18000.01, method: 'CASH', paidOn: SOLD_ON }, 'amount'],
      [{ amount: 10, method: 'CASH', paidOn: '2026-10-14' }, 'paidOn'],
      [{ amount: 10, method: 'CASH', paidOn: '2099-01-01' }, 'paidOn'],
      [{ amount: 0, method: 'CASH', paidOn: SOLD_ON }, 'amount'],
    ];
    for (const [body, field] of cases) {
      const res = await staffApi.post(path, body);
      const text = await res.text();
      expect(res.status(), `${JSON.stringify(body)} → ${text}`).toBe(400);
      expect(JSON.parse(text).fieldErrors?.[field], text).toBeTruthy();
    }
    const ledger = (await (await staffApi.get(path)).json()) as Ledger;
    expect(ledger.items).toHaveLength(0);
  });

  test('PAY-04: payments are audited on the vehicle and hidden from other dealerships', async ({ staffApi, rivalApi }) => {
    const v = await soldVehicle(staffApi);
    const path = `/api/v1/vehicles/${v.id}/payments`;
    const added = (await (await staffApi.post(path, { amount: 2500, method: 'CASH', paidOn: SOLD_ON })).json()) as Ledger;
    await expectStatus(await staffApi.delete(`${path}/${added.items[0].id}`), 200);

    const audit = await staffApi.get('/api/v1/audit', { entityType: 'VEHICLE', entityId: v.id });
    const summaries = ((await audit.json()) as AuditPage).items.map((a) => a.fieldSummary ?? {});
    expect(summaries.some((s) => s.paymentAdded === 2500 && s.paymentMethod === 'CASH')).toBe(true);
    expect(summaries.some((s) => s.paymentRemoved === 2500)).toBe(true);

    await expectError(await rivalApi.get(path), 404, 'NOT_FOUND');
    await expectError(await rivalApi.post(path, { amount: 1, method: 'CASH', paidOn: SOLD_ON }), 404, 'NOT_FOUND');
  });
});
