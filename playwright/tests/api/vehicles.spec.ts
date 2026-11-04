import { test, expect } from '../../support/fixtures';
import { expectError, expectStatus, randomVin, today, uniqueSuffix, vehicleBody, type Api, type Vehicle } from '../../support/api';
import { env } from '../../support/env';

// Requirements §3 (DMS-01..16) and acceptance cases AT-05..AT-08, plus the 2026-11-03 change
// request: sold by / sold to / date sold (C1), the required sale buyer (D8), the sortable DMS
// columns (C7) and the vehicle lead count (R1).

/** A sale body with the "Other" buyer, which is the smallest sale the API accepts (D8). */
function sellBody(v: Vehicle, overrides: Record<string, unknown> = {}) {
  return { soldOn: today(), soldPrice: 18900, version: v.version, buyerName: 'E2E Walk-in Buyer', ...overrides };
}

/** Sells a vehicle, naming the buyer the API now requires. */
async function sell(api: Api, v: Vehicle, overrides: Record<string, unknown> = {}) {
  const res = await api.post(`/api/v1/vehicles/${v.id}/sell`, sellBody(v, overrides));
  await expectStatus(res, 200);
  return (await res.json()) as Vehicle;
}

async function listIds(api: Api, params: Record<string, string | number>) {
  const res = await api.get('/api/v1/vehicles', params);
  await expectStatus(res, 200);
  return ((await res.json()) as { items: Vehicle[] }).items;
}

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
  const vin = randomVin(2020);
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
  await sell(staffApi, asIs);

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

test('CR-D8 / DMS-10: a sale needs a CRM customer or Other with a typed buyer name', async ({ staffApi }) => {
  const v = await staffApi.createVehicle();

  // Neither a customer nor a typed name.
  const none = await staffApi.post(`/api/v1/vehicles/${v.id}/sell`, sellBody(v, { buyerName: null }));
  const text = await none.text();
  expect(none.status(), text).toBe(400);
  expect(JSON.parse(text).fieldErrors?.buyerName, text).toBeTruthy();

  // Blank is not a name.
  const blank = await staffApi.post(`/api/v1/vehicles/${v.id}/sell`, sellBody(v, { buyerName: '   ' }));
  expect(blank.status(), await blank.text()).toBe(400);

  // A customer id that is not a customer of this dealership.
  const other = await staffApi.createCustomer();
  const wrong = await staffApi.post(`/api/v1/vehicles/${v.id}/sell`,
    sellBody(v, { buyerName: null, buyerCustomerId: other.id + 1_000_000 }));
  const wrongText = await wrong.text();
  expect(wrong.status(), wrongText).toBe(400);
  expect(JSON.parse(wrongText).fieldErrors?.buyerCustomerId, wrongText).toBeTruthy();

  // Nothing was sold by any of the refused attempts.
  expect((await staffApi.getVehicle(v.id)).status).toBe('IN_STOCK');
});

test('CR-C1 / DMS-10: a sale records sold by, sold to and date sold, for a CRM buyer and for Other', async ({
  staffApi,
}) => {
  const soldOn = today();

  const walkIn = await staffApi.createVehicle();
  const res = await staffApi.post(`/api/v1/vehicles/${walkIn.id}/sell`, sellBody(walkIn, { soldOn }));
  await expectStatus(res, 200);
  const sold = (await res.json()) as Vehicle & { soldBy: string | null; soldToName: string | null };
  expect(sold.status).toBe('SOLD');
  expect(sold.soldBy).toBe(env.staff.username);
  expect(sold.soldToName).toBe('E2E Walk-in Buyer');
  expect(sold.soldOn).toBe(soldOn);
  expect(sold.linkedCustomer ?? null).toBeNull();

  // A CRM buyer is linked by the sale itself and shown through linkedCustomer, not soldToName.
  const buyer = await staffApi.createCustomer();
  const crm = await staffApi.createVehicle();
  const linked = await staffApi.post(`/api/v1/vehicles/${crm.id}/sell`,
    sellBody(crm, { soldOn, buyerName: null, buyerCustomerId: buyer.id }));
  await expectStatus(linked, 200);
  const crmSold = (await linked.json()) as Vehicle & { soldBy: string | null; soldToName: string | null };
  expect(crmSold.linkedCustomer?.id).toBe(buyer.id);
  expect(crmSold.soldToName ?? null).toBeNull();
  expect(crmSold.soldBy).toBe(env.staff.username);
});

test('CR-D7 / L6: a sale closes the buyer lead as WON and the other open leads as LOST', async ({ staffApi }) => {
  const v = await staffApi.createVehicle();
  const buyer = await staffApi.createCustomer();
  const otherShopper = await staffApi.createCustomer();

  const leadIds: Record<string, number> = {};
  for (const [key, customer] of [['buyer', buyer], ['other', otherShopper]] as const) {
    const created = await staffApi.post('/api/v1/leads', { customerId: customer.id, vehicleId: v.id });
    await expectStatus(created, 201);
    leadIds[key] = ((await created.json()) as { id: number }).id;
  }

  await expectStatus(await staffApi.post(`/api/v1/vehicles/${v.id}/sell`,
    sellBody(v, { buyerName: null, buyerCustomerId: buyer.id })), 200);

  const lead = async (id: number) => {
    const res = await staffApi.get(`/api/v1/leads/${id}`);
    await expectStatus(res, 200);
    return (await res.json()) as { stage: string; lostReason: string | null };
  };
  expect(await lead(leadIds.buyer)).toMatchObject({ stage: 'WON' });
  expect(await lead(leadIds.other)).toMatchObject({ stage: 'LOST', lostReason: 'Vehicle sold' });
});

test('CR-R1 / DMS-19: a vehicle reports how many leads it has', async ({ staffApi }) => {
  const v = await staffApi.createVehicle();
  expect((await staffApi.getVehicle(v.id)) as Vehicle & { leadCount: number }).toMatchObject({ leadCount: 0 });

  for (let i = 0; i < 2; i++) {
    const customer = await staffApi.createCustomer();
    await expectStatus(await staffApi.post('/api/v1/leads', { customerId: customer.id, vehicleId: v.id }), 201);
  }
  const withLeads = (await staffApi.getVehicle(v.id)) as Vehicle & { leadCount: number };
  expect(withLeads.leadCount).toBe(2);
});

test('CR-C7 / DMS-06: the list sorts by list price, lead count and the sold columns', async ({ staffApi }) => {
  const make = `Srt${uniqueSuffix()}`.slice(0, 30);
  const prices = [300, 100, 200];
  const created: Vehicle[] = [];
  // Sequential: the default order is newest first, which the sorted order must override.
  for (const listPrice of prices) created.push(await staffApi.createVehicle({ make, listPrice }));

  const priced = async (sort: string) =>
    (await listIds(staffApi, { q: make, sort })).map((v) => (v as Vehicle & { listPrice: number }).listPrice);
  expect(await priced('listPrice,asc')).toEqual([100, 200, 300]);
  expect(await priced('listPrice,desc')).toEqual([300, 200, 100]);

  // Lead count: only the second vehicle has a lead.
  const customer = await staffApi.createCustomer();
  await expectStatus(await staffApi.post('/api/v1/leads', { customerId: customer.id, vehicleId: created[1].id }), 201);
  const byLeads = await listIds(staffApi, { q: make, sort: 'leadCount,desc' });
  expect(byLeads[0].id).toBe(created[1].id);

  // Sold columns: one of the three is sold to a named buyer today.
  await expectStatus(await staffApi.post(`/api/v1/vehicles/${created[2].id}/sell`,
    sellBody(created[2], { buyerName: 'Zz Last Buyer' })), 200);
  const bySoldOn = await listIds(staffApi, { q: make, sort: 'soldOn,desc' });
  expect(bySoldOn[0].id).toBe(created[2].id);
  const bySoldBy = await listIds(staffApi, { q: make, sort: 'soldBy,desc' });
  expect(bySoldBy[0].id).toBe(created[2].id);
  const bySoldTo = await listIds(staffApi, { q: make, sort: 'soldToName,desc' });
  expect(bySoldTo[0].id).toBe(created[2].id);

  // An unknown sort field is a field error, not a silent default order.
  const bad = await staffApi.get('/api/v1/vehicles', { q: make, sort: 'nosuchfield,asc' });
  const badText = await bad.text();
  expect(bad.status(), badText).toBe(400);
  expect(JSON.parse(badText).fieldErrors?.sort, badText).toBeTruthy();
});

test('CR-C7 / DMS-06: a blank sort value stays last in both directions', async ({ staffApi }) => {
  const make = `Bnk${uniqueSuffix()}`.slice(0, 30);
  // One vehicle carries each sortable blank-able value; the other two leave them unset.
  const withValue = await staffApi.createVehicle({ make, listPrice: 500, stockNumber: `BNK${uniqueSuffix()}` });
  await staffApi.createVehicle({ make, listPrice: null, stockNumber: null });
  await staffApi.createVehicle({ make, listPrice: null, stockNumber: null });
  await sell(staffApi, withValue, { buyerName: 'Blank Order Buyer' });

  // Each of these columns is blank on two of the three rows; the filled row leads either way.
  for (const field of ['listPrice', 'stockNumber', 'soldOn', 'soldBy', 'soldToName']) {
    for (const dir of ['asc', 'desc']) {
      const items = await listIds(staffApi, { q: make, sort: `${field},${dir}` });
      expect(items, `${field},${dir} returns all three rows`).toHaveLength(3);
      expect(items[0].id, `${field},${dir} keeps the blanks last`).toBe(withValue.id);
    }
  }
});

test('CR-C1: the buyer of a sold vehicle cannot be deleted, so "Sold to" keeps its name', async ({ staffApi }) => {
  const buyer = await staffApi.createCustomer();
  const v = await staffApi.createVehicle();
  await sell(staffApi, v, { buyerName: null, buyerCustomerId: buyer.id });

  // Deleting the buyer would blank the DMS "Sold to" column, so it is refused (409 SOLD_LOCKED).
  await expectError(await staffApi.delete(`/api/v1/customers/${buyer.id}`), 409, 'SOLD_LOCKED');
  // Unlinking the sold vehicle is refused for the same reason.
  await expectError(await staffApi.delete(`/api/v1/customers/${buyer.id}/vehicles/${v.id}`), 409, 'SOLD_LOCKED');

  const after = await staffApi.getVehicle(v.id);
  expect(after.linkedCustomer?.name).toBe(buyer.name);

  // A customer who bought nothing still deletes.
  const bystander = await staffApi.createCustomer();
  await expectStatus(await staffApi.delete(`/api/v1/customers/${bystander.id}`), 204);
});

test('CR-D4 / DMS-07: the list filters on model year and on vehicles with open work orders', async ({ staffApi }) => {
  const make = `Flt${uniqueSuffix()}`.slice(0, 30);
  const busy = await staffApi.createVehicle({ make, modelYear: 2019 });
  const quiet = await staffApi.createVehicle({ make, modelYear: 2021 });
  await expectStatus(await staffApi.post(`/api/v1/vehicles/${busy.id}/work-orders`, { task: 'Brake job' }), 201);

  const byYear = await listIds(staffApi, { q: make, modelYear: 2019 });
  expect(byYear.map((v) => v.id)).toEqual([busy.id]);

  const open = await listIds(staffApi, { q: make, openWorkOrdersOnly: 'true' });
  expect(open.map((v) => v.id)).toEqual([busy.id]);
  expect((open[0] as Vehicle & { openWorkOrders: number }).openWorkOrders).toBe(1);

  const all = await listIds(staffApi, { q: make });
  expect(all.map((v) => v.id).sort()).toEqual([busy.id, quiet.id].sort());
});

test('DMS edge case: selling below cost is allowed and sets SOLD', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle({ purchaseCost: 20000 });
  const sold = await sell(staffApi, vehicle, { soldPrice: 1000 });
  expect(sold.status).toBe('SOLD');
  expect(sold.soldPrice).toBe(1000);
});

test('AT-08 / DMS-11 / DMS-12: purchase fields lock after sale; selling again is SOLD_LOCKED', async ({
  staffApi,
}) => {
  const sold = await sell(staffApi, await staffApi.createVehicle());
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
  await sell(staffApi, (await res.json()) as Vehicle);

  const audit = await staffApi.get('/api/v1/audit', { entityType: 'VEHICLE', entityId: vehicle.id });
  await expectStatus(audit, 200);
  const items = (await audit.json()).items as { action: string; actorUsername: string; createdAt: string }[];
  expect(items.map((i) => i.action)).toEqual(['SELL', 'UPDATE', 'CREATE']);
  for (const item of items) {
    expect(item.actorUsername).toBe(env.staff.username);
    expect(Date.parse(item.createdAt)).not.toBeNaN();
  }
});

test('ROLE / AUD-17: a sales member cannot read a vehicle record history', async ({ staffApi, staff2Api }) => {
  const vehicle = await staffApi.createVehicle();
  const params = { entityType: 'VEHICLE', entityId: vehicle.id };
  // The record history is owner-or-manager (role spec §3), while the vehicle itself is shared.
  await expectStatus(await staff2Api.get(`/api/v1/vehicles/${vehicle.id}`), 200);
  await expectError(await staff2Api.get('/api/v1/audit', params), 403, 'FORBIDDEN');
  await expectStatus(await staffApi.get('/api/v1/audit', params), 200);
});
