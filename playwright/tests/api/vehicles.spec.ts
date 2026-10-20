import { test, expect } from '../../support/fixtures';
import { expectError, expectStatus, randomVin, today, vehicleBody } from '../../support/api';
import { env } from '../../support/env';

// Requirements §3 (DMS-01..16) and acceptance cases AT-05..AT-08.

test('AT-05 / DMS-01: each missing required field is rejected with a field error', async ({ staffApi }) => {
  const required = ['make', 'model', 'modelYear', 'vin', 'source', 'purchaseCost', 'addedOn', 'conditionCode'];
  for (const field of required) {
    const body: Record<string, unknown> = vehicleBody();
    delete body[field];
    const res = await staffApi.post('/api/v1/vehicles', body);
    const text = await res.text();
    expect(res.status(), `missing ${field}: ${text}`).toBe(400);
    const error = JSON.parse(text);
    expect(error.code).toBe('VALIDATION');
    expect(Object.keys(error.fieldErrors ?? {}), `fieldErrors for missing ${field}`).toContain(field);
  }
});

test('DMS-02: repair cost and Carfax URL are optional; status starts IN_STOCK', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle({ repairCost: null, carfaxUrl: null });
  expect(vehicle.status).toBe('IN_STOCK');
  expect(vehicle.soldOn ?? null).toBeNull();
  expect(vehicle.soldPrice ?? null).toBeNull();
});

test('DMS-02: sold fields and status on create are ignored', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle({ status: 'SOLD', soldOn: today(), soldPrice: 100 });
  expect(vehicle.status).toBe('IN_STOCK');
  expect(vehicle.soldOn ?? null).toBeNull();
});

test('DMS-04: VIN is upper-cased; wrong length or I/O/Q is rejected', async ({ staffApi }) => {
  const vin = randomVin();
  const vehicle = await staffApi.createVehicle({ vin: vin.toLowerCase() });
  expect(vehicle.vin).toBe(vin);

  for (const bad of [vin.slice(0, 16), `${vin}1`, `I${vin.slice(1)}`, `O${vin.slice(1)}`, `Q${vin.slice(1)}`]) {
    await expectError(await staffApi.post('/api/v1/vehicles', vehicleBody({ vin: bad })), 400, 'VALIDATION');
  }
});

test('AT-06 / DMS-03: duplicate VIN in a dealer is VIN_DUP; another dealer may reuse it', async ({
  staffApi, rivalApi,
}) => {
  const vehicle = await staffApi.createVehicle();
  await expectError(await staffApi.post('/api/v1/vehicles', vehicleBody({ vin: vehicle.vin })), 400, 'VIN_DUP');
  const rival = await rivalApi.createVehicle({ vin: vehicle.vin });
  expect(rival.vin).toBe(vehicle.vin);
});

test('DMS-05: source and condition accept only enum values', async ({ staffApi }) => {
  await expectError(await staffApi.post('/api/v1/vehicles', vehicleBody({ source: 'GIFT' })), 400, 'VALIDATION');
  await expectError(
    await staffApi.post('/api/v1/vehicles', vehicleBody({ conditionCode: 'LIKE_NEW' })), 400, 'VALIDATION');
});

test('DMS edge cases: year bounds, zero cost, future date, Carfax URL', async ({ staffApi }) => {
  const year = new Date().getFullYear();
  await staffApi.createVehicle({ modelYear: year + 1 });
  await staffApi.createVehicle({ modelYear: 1900 });
  await staffApi.createVehicle({ purchaseCost: 0 });
  await staffApi.createVehicle({ carfaxUrl: 'https://www.carfax.ca/report/1' });

  const rejected = [
    { modelYear: year + 2 },
    { modelYear: 1899 },
    { purchaseCost: -1 },
    { repairCost: -1 },
    { addedOn: '2999-01-01' },
    { carfaxUrl: 'ftp://example.com/x' },
    { carfaxUrl: `https://example.com/${'a'.repeat(500)}` },
    { make: 'x'.repeat(51) },
  ];
  for (const overrides of rejected) {
    const res = await staffApi.post('/api/v1/vehicles', vehicleBody(overrides));
    expect(res.status(), `${JSON.stringify(overrides).slice(0, 80)} → ${await res.text()}`).toBe(400);
  }
});

test('DMS-01 / DMS-10: money with more than two decimals is refused, not rounded', async ({ staffApi }) => {
  for (const [field, value] of [['purchaseCost', 14200.555], ['repairCost', 99.999]] as const) {
    const res = await staffApi.post('/api/v1/vehicles', vehicleBody({ [field]: value }));
    await expectError(res, 400, 'VALIDATION');
  }
  const created = await staffApi.createVehicle({ purchaseCost: 14200.55 });
  expect(created.purchaseCost).toBe(14200.55);

  const edit = await staffApi.patch(`/api/v1/vehicles/${created.id}`, {
    ...vehicleBody({ vin: created.vin }), version: created.version, purchaseCost: 1.001,
  });
  await expectError(edit, 400, 'VALIDATION');

  const sell = await staffApi.post(`/api/v1/vehicles/${created.id}/sell`, {
    soldOn: today(), soldPrice: 18900.125, version: created.version,
  });
  await expectError(sell, 400, 'VALIDATION');
});

test('DMS-06 / NFR-01: list pages 10 per page by default, newest first', async ({ staffApi }) => {
  for (let i = 0; i < 11; i++) await staffApi.createVehicle();

  const res = await staffApi.get('/api/v1/vehicles');
  await expectStatus(res, 200);
  const page = await res.json();
  expect(page.size).toBe(10);
  expect(page.items).toHaveLength(10);
  // Other specs create vehicles in parallel, so check the order rather than a specific row.
  const ids = page.items.map((v: { id: number }) => v.id);
  expect(ids).toEqual([...ids].sort((a, b) => b - a));
});

test('DMS-07: search by VIN / make / model and filter by status and condition', async ({ staffApi }) => {
  const make = `Mk${Date.now().toString(36)}`;
  const certified = await staffApi.createVehicle({ make, conditionCode: 'CERTIFIED' });
  const asIs = await staffApi.createVehicle({ make, conditionCode: 'AS_IS' });
  await staffApi.sellVehicle(asIs);

  const ids = async (params: Record<string, string>) =>
    (await (await staffApi.get('/api/v1/vehicles', params)).json()).items.map((v: { id: number }) => v.id);

  expect(await ids({ q: certified.vin })).toEqual([certified.id]);
  expect((await ids({ q: make })).sort()).toEqual([certified.id, asIs.id].sort());
  expect(await ids({ q: make, status: 'SOLD' })).toEqual([asIs.id]);
  expect(await ids({ q: make, condition: 'CERTIFIED' })).toEqual([certified.id]);
});

test('DMS-09: an in-stock vehicle can be edited', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle();
  const res = await staffApi.patch(`/api/v1/vehicles/${vehicle.id}`, {
    ...vehicleBody({ vin: vehicle.vin }), model: 'Corolla', purchaseCost: 15000, version: vehicle.version,
  });
  await expectStatus(res, 200);
  const updated = await res.json();
  expect(updated.model).toBe('Corolla');
  expect(updated.purchaseCost).toBe(15000);
});

test('AT-07 / DMS-10: sold date and price must be sent together', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle();
  const sell = (body: object) => staffApi.post(`/api/v1/vehicles/${vehicle.id}/sell`, { ...body, version: vehicle.version });

  await expectError(await sell({ soldOn: today() }), 400, 'SOLD_PAIR_REQUIRED');
  await expectError(await sell({ soldPrice: 18900 }), 400, 'SOLD_PAIR_REQUIRED');
  await expectError(await sell({ soldOn: today(), soldPrice: 0 }), 400, 'SOLD_PAIR_REQUIRED');
  await expectError(await sell({ soldOn: '2026-08-01', soldPrice: 18900 }), 400, 'VALIDATION'); // before addedOn
  await expectError(await sell({ soldOn: '2999-01-01', soldPrice: 18900 }), 400, 'VALIDATION');
});

test('DMS edge case: selling below cost is allowed and sets SOLD', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle({ purchaseCost: 20000 });
  const sold = await staffApi.sellVehicle(vehicle, 1000);
  expect(sold.status).toBe('SOLD');
  expect(sold.soldPrice).toBe(1000);
});

test('AT-08 / DMS-11 / DMS-12: purchase fields lock after sale; selling again is SOLD_LOCKED', async ({
  staffApi,
}) => {
  const sold = await staffApi.sellVehicle(await staffApi.createVehicle());
  const base = {
    make: sold.make, model: sold.model, modelYear: sold.modelYear, vin: sold.vin, source: sold.source,
    purchaseCost: sold.purchaseCost, addedOn: sold.addedOn, conditionCode: sold.conditionCode,
    repairCost: sold.repairCost, carfaxUrl: sold.carfaxUrl, version: sold.version,
  };
  const lockedChanges = [
    { purchaseCost: 1 }, { make: 'Honda' }, { model: 'Civic' }, { modelYear: 2019 }, { vin: randomVin() },
    { source: 'TRADE_IN' }, { addedOn: '2026-08-15' }, { repairCost: 1 }, { carfaxUrl: 'https://example.com/c' },
  ];
  for (const change of lockedChanges) {
    await expectError(await staffApi.patch(`/api/v1/vehicles/${sold.id}`, { ...base, ...change }), 409, 'SOLD_LOCKED');
  }

  await expectError(
    await staffApi.post(`/api/v1/vehicles/${sold.id}/sell`, { soldOn: today(), soldPrice: 100, version: sold.version }),
    409, 'SOLD_LOCKED');
});

test('DMS-13: a stale version returns VERSION_CONFLICT', async ({ staffApi, staff2Api }) => {
  const vehicle = await staffApi.createVehicle();
  const edit = { ...vehicleBody({ vin: vehicle.vin }), version: vehicle.version };
  await expectStatus(await staff2Api.patch(`/api/v1/vehicles/${vehicle.id}`, { ...edit, model: 'A' }), 200);
  await expectError(await staffApi.patch(`/api/v1/vehicles/${vehicle.id}`, { ...edit, model: 'B' }), 409, 'VERSION_CONFLICT');
});

test('AT-11 / DMS-14 / AUD-01 / AUD-06: create, edit and sell are audited newest first', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle();
  const res = await staffApi.patch(`/api/v1/vehicles/${vehicle.id}`, {
    ...vehicleBody({ vin: vehicle.vin }), model: 'Corolla', version: vehicle.version,
  });
  await expectStatus(res, 200);
  await staffApi.sellVehicle(await res.json());

  const audit = await staffApi.get('/api/v1/audit', { entityType: 'VEHICLE', entityId: vehicle.id });
  await expectStatus(audit, 200);
  const items = (await audit.json()).items as { action: string; actorUsername: string; createdAt: string }[];
  expect(items.map((i) => i.action)).toEqual(['SELL', 'UPDATE', 'CREATE']);
  for (const item of items) {
    expect(item.actorUsername).toBe(env.staff.username);
    expect(Date.parse(item.createdAt)).not.toBeNaN();
  }
});
