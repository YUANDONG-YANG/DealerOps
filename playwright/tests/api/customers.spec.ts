import { test, expect } from '../../support/fixtures';
import { customerBody, expectError, expectStatus } from '../../support/api';

// Requirements §4 (CRM-01..12), §7 (AUD-02/04) and acceptance cases AT-09, AT-10, AT-25, AT-26, AT-29.

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
  const sold = await staffApi.sellVehicle(await staffApi.createVehicle());
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

test('CRM-13: a duplicate email is saved with a warning; a duplicate phone is rejected', async ({ staffApi }) => {
  const customer = await staffApi.createCustomer();
  const duplicateEmail = await staffApi.post('/api/v1/customers', customerBody({ email: customer.email }));
  await expectStatus(duplicateEmail, 201);
  const saved = await duplicateEmail.json();
  expect(saved.email).toBe(customer.email);
  expect(saved.emailWarning).toMatch(/already uses this email/i);
  await expectError(await staffApi.post('/api/v1/customers', customerBody({ phone: customer.phone })), 409, 'PHONE_TAKEN');
});
