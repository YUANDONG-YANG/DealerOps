import { test, expect } from '../../support/fixtures';
import {
  customerBody, expectError, expectStatus, randomDigits, today, uniqueSuffix, type Api, type Vehicle,
} from '../../support/api';

// Requirements §4 (CRM-01..12), §7 (AUD-02/04) and acceptance cases AT-09, AT-10, AT-25, AT-26, AT-29.
// The 2026-11-03 change request adds R1 (lead count), R3 (customer notes) and R4 (nothing about a
// customer is unique; a match only warns through GET /customers/duplicates).

/**
 * Sells a vehicle. A sale needs a buyer since the change request (D8): a CRM customer or "Other"
 * with a typed name, so the shared `Api.sellVehicle` helper cannot be used.
 */
async function sell(api: Api, v: Vehicle, buyerCustomerId: number | null = null) {
  const res = await api.post(`/api/v1/vehicles/${v.id}/sell`, {
    soldOn: today(),
    soldPrice: 18900,
    version: v.version,
    buyerCustomerId,
    buyerName: buyerCustomerId == null ? 'Walk-in buyer' : null,
  });
  await expectStatus(res, 200);
  return (await res.json()) as Vehicle;
}

test('AT-26 / CRM-01: each of the four required fields is rejected when blank', async ({ staffApi }) => {
  for (const field of ['name', 'email', 'phone', 'homeAddress']) {
    const res = await staffApi.post('/api/v1/customers', customerBody({ [field]: '' }));
    const text = await res.text();
    expect(res.status(), `blank ${field}: ${text}`).toBe(400);
    expect(Object.keys(JSON.parse(text).fieldErrors ?? {}), `fieldErrors for blank ${field}`).toContain(field);
  }
});

test('CRM-01: field formats are validated; email is stored lower case', async ({ staffApi }) => {
  const customer = await staffApi.createCustomer({ email: `E2E.UPPER.${Date.now()}@Example.COM` });
  expect(customer.email).toBe(customer.email.toLowerCase());

  for (const overrides of [
    { email: 'not-an-email' },
    { phone: '12345' }, // fewer than 7 digits
    { phone: '403-555-abcd' },
    { name: 'x'.repeat(101) },
    { homeAddress: 'x'.repeat(301) },
  ]) {
    const res = await staffApi.post('/api/v1/customers', customerBody(overrides));
    expect(res.status(), `${JSON.stringify(overrides)} → ${await res.text()}`).toBe(400);
  }
});

test('AT-26 / CRM-02: edits persist', async ({ staffApi }) => {
  const customer = await staffApi.createCustomer();
  const res = await staffApi.patch(`/api/v1/customers/${customer.id}`, {
    ...customerBody(), name: `${customer.name} Edited`, version: customer.version,
  });
  await expectStatus(res, 200);
  const reread = await (await staffApi.get(`/api/v1/customers/${customer.id}`)).json();
  expect(reread.name).toBe(`${customer.name} Edited`);
});

test('CRM-03: search by name, email and phone', async ({ staffApi }) => {
  const customer = await staffApi.createCustomer();
  for (const q of [customer.name, customer.email, customer.phone]) {
    const page = await (await staffApi.get('/api/v1/customers', { q })).json();
    expect(page.items.map((c: { id: number }) => c.id), `search ${q}`).toContain(customer.id);
    expect(page.size).toBe(10);
  }
});

test('CRM-04 / CRM-05 / CRM-10: linking shows the vehicle on the customer and the customer on the vehicle', async ({
  staffApi,
}) => {
  const vehicle = await staffApi.createVehicle();
  const customer = await staffApi.createCustomer();
  await expectStatus(await staffApi.put(`/api/v1/customers/${customer.id}/vehicles/${vehicle.id}`), 200);

  const detail = await (await staffApi.get(`/api/v1/customers/${customer.id}`)).json();
  expect(detail.linkedVehicles).toEqual([
    expect.objectContaining({ id: vehicle.id, vin: vehicle.vin, make: vehicle.make, status: 'IN_STOCK' }),
  ]);
  const v = await staffApi.getVehicle(vehicle.id);
  expect(v.linkedCustomer).toEqual({ id: customer.id, name: customer.name });
});

test('AT-09 / CRM-07: a vehicle linked to one customer cannot be linked to another', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle();
  const first = await staffApi.createCustomer();
  const second = await staffApi.createCustomer();
  await expectStatus(await staffApi.put(`/api/v1/customers/${first.id}/vehicles/${vehicle.id}`), 200);
  await expectError(
    await staffApi.put(`/api/v1/customers/${second.id}/vehicles/${vehicle.id}`), 409, 'VEHICLE_ALREADY_LINKED');
  await expectError(
    await staffApi.put(`/api/v1/customers/${first.id}/vehicles/${vehicle.id}`), 409, 'VEHICLE_ALREADY_LINKED');
});

test('CRM-08: an in-stock vehicle can be unlinked and linked again', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle();
  const customer = await staffApi.createCustomer();
  const link = `/api/v1/customers/${customer.id}/vehicles/${vehicle.id}`;
  await expectStatus(await staffApi.put(link), 200);
  await expectStatus(await staffApi.delete(link), 204);
  expect((await staffApi.getVehicle(vehicle.id)).linkedCustomer ?? null).toBeNull();
  await expectStatus(await staffApi.put(link), 200);
});

test('AT-10 / AT-25 / CRM-08: a vehicle sold before linking can be linked once and never unlinked', async ({
  staffApi,
}) => {
  const sold = await sell(staffApi, await staffApi.createVehicle());
  const customer = await staffApi.createCustomer();
  const other = await staffApi.createCustomer();

  await expectStatus(await staffApi.put(`/api/v1/customers/${customer.id}/vehicles/${sold.id}`), 200);
  await expectError(
    await staffApi.put(`/api/v1/customers/${other.id}/vehicles/${sold.id}`), 409, 'VEHICLE_ALREADY_LINKED');
  await expectError(
    await staffApi.delete(`/api/v1/customers/${customer.id}/vehicles/${sold.id}`), 409, 'SOLD_LOCKED');
});

test('AT-29 / CRM-06 / CRM-09: cross-dealer ids and missing links return 404', async ({ staffApi, rivalApi }) => {
  const customer = await staffApi.createCustomer();
  const ownVehicle = await staffApi.createVehicle();
  const rivalVehicle = await rivalApi.createVehicle();
  const rivalCustomer = await rivalApi.createCustomer();

  await expectError(await staffApi.put(`/api/v1/customers/${customer.id}/vehicles/${rivalVehicle.id}`), 404, 'NOT_FOUND');
  await expectError(await staffApi.put(`/api/v1/customers/${rivalCustomer.id}/vehicles/${ownVehicle.id}`), 404, 'NOT_FOUND');
  await expectError(await staffApi.get(`/api/v1/customers/${rivalCustomer.id}`), 404, 'NOT_FOUND');
  await expectError(await staffApi.delete(`/api/v1/customers/${customer.id}/vehicles/${ownVehicle.id}`), 404, 'NOT_FOUND');
});

test('CRM-11 / AUD-02 / AUD-04 / CRM-12: customer history records changes with contact values', async ({
  staffApi,
}) => {
  const vehicle = await staffApi.createVehicle();
  const customer = await staffApi.createCustomer();
  const newContact = customerBody({ name: customer.name });
  await expectStatus(await staffApi.patch(`/api/v1/customers/${customer.id}`, {
    ...newContact, version: customer.version,
  }), 200);
  const link = `/api/v1/customers/${customer.id}/vehicles/${vehicle.id}`;
  await expectStatus(await staffApi.put(link), 200);
  await expectStatus(await staffApi.delete(link), 204);

  const res = await staffApi.get('/api/v1/audit', { entityType: 'CUSTOMER', entityId: customer.id });
  await expectStatus(res, 200);
  const text = await res.text();
  const actions = JSON.parse(text).items.map((i: { action: string }) => i.action);
  expect(actions).toEqual(['UNLINK', 'LINK', 'UPDATE', 'CREATE']);

  // AUD-04 (changed 2026-10-21): contact values are recorded, new and replaced.
  for (const value of [customer.email, customer.phone, newContact.email, newContact.phone]) {
    expect(text, 'audit records contact values').toContain(value);
  }
});

test('AUD-02: a customer save that changes nothing adds no history entry', async ({ staffApi }) => {
  const customer = await staffApi.createCustomer();
  const unchanged = {
    name: customer.name, email: customer.email, phone: customer.phone, homeAddress: customer.homeAddress,
    version: customer.version,
  };
  await expectStatus(await staffApi.patch(`/api/v1/customers/${customer.id}`, unchanged), 200);

  const res = await staffApi.get('/api/v1/audit', { entityType: 'CUSTOMER', entityId: customer.id });
  await expectStatus(res, 200);
  expect((await res.json()).items.map((i: { action: string }) => i.action)).toEqual(['CREATE']);
});

test('CRM-13 / R4: a duplicate email is saved with a warning and a duplicate phone is accepted', async ({
  staffApi,
}) => {
  const customer = await staffApi.createCustomer();
  const duplicateEmail = await staffApi.post('/api/v1/customers', customerBody({ email: customer.email }));
  await expectStatus(duplicateEmail, 201);
  const saved = await duplicateEmail.json();
  expect(saved.email).toBe(customer.email);
  expect(saved.emailWarning).toMatch(/already uses this email/i);

  // R4 (decision D1): the phone is no longer unique, so a household can share one. The duplicate
  // is only a warning the client confirms, never a 409 PHONE_TAKEN.
  const duplicatePhone = await staffApi.post('/api/v1/customers', customerBody({ phone: customer.phone }));
  await expectStatus(duplicatePhone, 201);
  expect((await duplicatePhone.json()).phone).toBe(customer.phone);

  // The same holds on edit: every field of another customer can be copied onto this one.
  const second = await staffApi.createCustomer();
  const patch = await staffApi.patch(`/api/v1/customers/${second.id}`, {
    name: customer.name, email: customer.email, phone: customer.phone, homeAddress: customer.homeAddress,
    version: second.version,
  });
  await expectStatus(patch, 200);
  expect(await patch.json()).toMatchObject({ name: customer.name, phone: customer.phone });
});

test('R4: GET /customers/duplicates names the matching fields and skips the customer being edited', async ({
  staffApi, rivalApi,
}) => {
  // A home address of its own: the shared default address is reused by every other seeded
  // customer, which would match on homeAddress and hide what this test checks.
  const existing = await staffApi.createCustomer({ homeAddress: `${uniqueSuffix()} Unique Way, Calgary, AB` });
  const DUPES = '/api/v1/customers/duplicates';
  const fieldsFor = async (api: Api, params: Record<string, string | number>) => {
    const res = await api.get(DUPES, params);
    await expectStatus(res, 200);
    return ((await res.json()) as { fields: string[] }).fields;
  };

  const all = { name: existing.name, email: existing.email, phone: existing.phone, homeAddress: existing.homeAddress };
  // The fields are reported in a fixed order: name, email, phone, homeAddress.
  expect(await fieldsFor(staffApi, all)).toEqual(['name', 'email', 'phone', 'homeAddress']);
  expect(await fieldsFor(staffApi, { ...all, phone: `+1587${randomDigits(7)}` }))
    .toEqual(['name', 'email', 'homeAddress']);
  // A fresh draft matches nothing, and blank values are ignored rather than matched.
  const fresh = customerBody({ homeAddress: `${uniqueSuffix()} Fresh Road, Calgary, AB` }) as Record<string, string>;
  expect(await fieldsFor(staffApi, fresh)).toEqual([]);
  expect(await fieldsFor(staffApi, { name: '', email: '', phone: '', homeAddress: '' })).toEqual([]);

  // The phone is compared digits only, so spacing and punctuation do not hide a duplicate.
  const digits = existing.phone.replace(/\D/g, '');
  expect(await fieldsFor(staffApi, { phone: `(${digits.slice(0, 4)}) ${digits.slice(4)}` })).toEqual(['phone']);

  // excludeId is how the edit drawer stops a customer matching itself.
  expect(await fieldsFor(staffApi, { ...all, excludeId: existing.id })).toEqual([]);

  // Another dealership's customers are never compared (tenancy).
  expect(await fieldsFor(rivalApi, all)).toEqual([]);
});

test('R3: customer notes are saved trimmed, cleared by a blank value and audited', async ({ staffApi }) => {
  const created = await staffApi.post('/api/v1/customers', customerBody({ notes: '  Prefers evening calls  ' }));
  await expectStatus(created, 201);
  const customer = await created.json();
  expect(customer.notes).toBe('Prefers evening calls');

  const body = (overrides: Record<string, unknown>) => ({
    name: customer.name, email: customer.email, phone: customer.phone, homeAddress: customer.homeAddress,
    ...overrides,
  });
  const edited = await staffApi.patch(`/api/v1/customers/${customer.id}`,
    body({ notes: 'Trade-in expected', version: customer.version }));
  await expectStatus(edited, 200);
  expect((await edited.json()).notes).toBe('Trade-in expected');

  const current = await (await staffApi.get(`/api/v1/customers/${customer.id}`)).json();
  const cleared = await staffApi.patch(`/api/v1/customers/${customer.id}`,
    body({ notes: '   ', version: current.version }));
  await expectStatus(cleared, 200);
  expect((await cleared.json()).notes ?? null).toBeNull();

  // Over the stored maximum is rejected.
  const tooLong = await (await staffApi.get(`/api/v1/customers/${customer.id}`)).json();
  await expectError(
    await staffApi.patch(`/api/v1/customers/${customer.id}`, body({ notes: 'x'.repeat(2001), version: tooLong.version })),
    400, 'VALIDATION');

  const audit = await staffApi.get('/api/v1/audit', { entityType: 'CUSTOMER', entityId: customer.id });
  await expectStatus(audit, 200);
  const text = await audit.text();
  expect(text).toContain('Prefers evening calls');
  expect(text).toContain('Trade-in expected');
});

test('R1: the customer list reports the number of leads instead of only purchases', async ({ staffApi }) => {
  const tag = `E2E Lead Count ${uniqueSuffix()}`;
  const customer = await staffApi.createCustomer({ name: tag });
  const quiet = await staffApi.createCustomer({ name: `${tag} quiet` });
  const row = async (id: number) => {
    const res = await staffApi.get('/api/v1/customers', { q: tag, size: 10 });
    await expectStatus(res, 200);
    const items = ((await res.json()) as { items: { id: number; leadCount: number }[] }).items;
    return items.find((c) => c.id === id)!;
  };

  expect((await row(customer.id)).leadCount).toBe(0);
  const vehicle = await staffApi.createVehicle();
  const lead = await staffApi.post('/api/v1/leads', { customerId: customer.id, vehicleId: vehicle.id });
  await expectStatus(lead, 201);
  await expectStatus(await staffApi.post('/api/v1/leads', { customerId: customer.id }), 201);
  expect((await row(customer.id)).leadCount).toBe(2);
  // A closed lead still counts: the column is the customer's lead history.
  const detail = await lead.json();
  await expectStatus(await staffApi.patch(`/api/v1/leads/${detail.id}`, {
    stage: 'LOST', ownerUsername: null, nextFollowUpOn: null, vehicleId: vehicle.id,
    lostReason: 'Bought elsewhere', version: detail.version,
  }), 200);
  expect((await row(customer.id)).leadCount).toBe(2);
  expect((await row(quiet.id)).leadCount).toBe(0);
});
