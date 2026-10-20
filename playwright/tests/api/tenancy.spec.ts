import { test, expect } from '../../support/fixtures';
import { Api, apiLogin, expectError, expectStatus, uniqueSuffix } from '../../support/api';
import { env } from '../../support/env';

// Requirements §2 (AUTH-01..15) and acceptance cases AT-01..AT-04, AT-23.

test('AT-01 / AUTH-07: another dealer\'s vehicle and customer ids return 404', async ({ staffApi, rivalApi }) => {
  const vehicle = await staffApi.createVehicle();
  const customer = await staffApi.createCustomer();

  await expectError(await rivalApi.get(`/api/v1/vehicles/${vehicle.id}`), 404, 'NOT_FOUND');
  await expectError(await rivalApi.get(`/api/v1/customers/${customer.id}`), 404, 'NOT_FOUND');
  await expectError(await rivalApi.get(`/api/v1/vehicles/${vehicle.id}/listing`), 404, 'NOT_FOUND');
  await expectError(
    await rivalApi.get('/api/v1/audit', { entityType: 'VEHICLE', entityId: vehicle.id }), 404, 'NOT_FOUND');

  const rivalList = await rivalApi.get('/api/v1/vehicles', { q: vehicle.vin });
  expect((await rivalList.json()).totalElements).toBe(0);
});

test('AT-02 / AUTH-06: staff of the same dealer share data immediately', async ({ staffApi, staff2Api }) => {
  const vehicle = await staffApi.createVehicle();
  const res = await staff2Api.get('/api/v1/vehicles', { q: vehicle.vin });
  await expectStatus(res, 200);
  const page = await res.json();
  expect(page.items.map((v: { id: number }) => v.id)).toContain(vehicle.id);
});

test('AT-03 / AUTH-08: admin gets 403 on every business endpoint without business fields', async ({
  adminApi, staffApi,
}) => {
  const vehicle = await staffApi.createVehicle();
  const calls = [
    adminApi.get('/api/v1/vehicles'),
    adminApi.get(`/api/v1/vehicles/${vehicle.id}`),
    adminApi.post('/api/v1/vehicles', { make: 'X' }),
    adminApi.get('/api/v1/customers'),
    adminApi.get(`/api/v1/vehicles/${vehicle.id}/listing`),
    adminApi.get('/api/v1/audit', { entityType: 'VEHICLE', entityId: vehicle.id }),
    adminApi.post('/api/v1/assistant/ask', { text: 'list vehicles' }),
  ];
  for (const res of await Promise.all(calls)) {
    const text = await res.text();
    expect(res.status(), `${res.url()} → ${text}`).toBe(403);
    expect(JSON.parse(text).code).toBe('FORBIDDEN');
    expect(text).not.toContain(vehicle.vin);
    expect(text).not.toMatch(/purchaseCost|"items"/);
  }
});

test('AUTH-10: dealer users cannot call admin endpoints', async ({ staffApi }) => {
  await expectError(await staffApi.get('/api/v1/admin/dealers'), 403, 'FORBIDDEN');
  await expectError(
    await staffApi.post('/api/v1/admin/dealers/1/members', { username: 'x' }), 403, 'FORBIDDEN');
});

test('AUTH-09: a client-supplied dealerId is ignored', async ({ staffApi, rivalApi }) => {
  const rivalVehicle = await rivalApi.createVehicle();
  // Attempt to write into, and read from, dealer B while signed in to dealer A.
  const created = await staffApi.createVehicle({ dealerId: 999999 });
  expect((await staffApi.getVehicle(created.id)).id).toBe(created.id);
  await expectError(await rivalApi.get(`/api/v1/vehicles/${created.id}`), 404, 'NOT_FOUND');

  const list = await staffApi.get('/api/v1/vehicles', { q: rivalVehicle.vin, dealerId: 1 });
  expect((await list.json()).totalElements).toBe(0);
});

test('AT-04 / AUTH-05 / AUTH-13: removing a login ends business access but keeps the account', async ({
  request, adminApi,
}) => {
  const dealers = await (await adminApi.get('/api/v1/admin/dealers', { q: env.dealerName })).json();
  const dealerId = dealers.items.find((d: { legalName: string }) => d.legalName === env.dealerName).id;
  const username = `e2e.tmp.${uniqueSuffix()}`;
  const password = 'temporary-pass-1';

  await expectStatus(await adminApi.post(`/api/v1/admin/dealers/${dealerId}/members`, {
    username, displayName: `E2E Temp ${username}`, email: `${username}@example.com`, password,
  }), 201);

  const member = await Api.as(request, username, password);
  await expectStatus(await member.get('/api/v1/vehicles'), 200);

  await expectStatus(await adminApi.delete(`/api/v1/admin/dealers/${dealerId}/members/${username}`), 204);

  // The stale token and a fresh sign-in both lose business access.
  await expectError(await member.get('/api/v1/vehicles'), 403, 'FORBIDDEN');
  const again = await Api.as(request, username, password);
  await expectError(await again.get('/api/v1/vehicles'), 403, 'FORBIDDEN');
  const me = await again.get('/api/v1/me');
  await expectStatus(me, 200);
  expect((await me.json()).dealerId ?? null).toBeNull();
});

test('AUTH-14: binding an active member again returns DUP_MEMBER; admin cannot be bound', async ({
  adminApi,
}) => {
  const dealers = await (await adminApi.get('/api/v1/admin/dealers', { q: env.dealerB.legalName })).json();
  const rivalDealerId = dealers.items[0].id;
  // e2e.staff is active at dealer A, so binding them to dealer B is a duplicate binding.
  await expectError(
    await adminApi.post(`/api/v1/admin/dealers/${rivalDealerId}/members`, { username: env.staff.username }),
    409, 'DUP_MEMBER');
  await expectError(
    await adminApi.post(`/api/v1/admin/dealers/${rivalDealerId}/members`, { username: env.admin.identifier }),
    409, 'DUP_MEMBER');
});

test('AUTH-12: login issues a JWT carrying the role; bad credentials are 401', async ({ request }) => {
  const login = await apiLogin(request, env.staff.username, env.staff.password);
  const payload = JSON.parse(Buffer.from(login.accessToken.split('.')[1], 'base64url').toString());
  expect(JSON.stringify(payload)).toContain('Dealer.User');

  const bad = await request.post(`${env.gatewayUrl}/api/v1/auth/login`, {
    data: { identifier: env.staff.username, password: 'wrong-password-1' },
  });
  expect(bad.status()).toBe(401);
});

test('AUTH-11: staff can sign in with email as well as username', async ({ request }) => {
  const login = await apiLogin(request, env.staff.email, env.staff.password);
  expect(login.role).toBe('Dealer.User');
});

test('ARC-03 / AT-23: the gateway does not expose internal routes', async ({ staffApi }) => {
  const res = await staffApi.post('/internal/v1/ad-check', {});
  expect(res.status()).toBe(404);
});

test('ARC-06: unauthenticated API calls get 401 with a {code,message} body', async ({ request }) => {
  const res = await request.get(`${env.gatewayUrl}/api/v1/vehicles`);
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body).toHaveProperty('code');
  expect(body).toHaveProperty('message');
});

test('AUTH-02: creating a dealership validates the email and field lengths, and trims values', async ({ adminApi }) => {
  const valid = {
    legalName: `E2E Trim ${uniqueSuffix()}`,
    contactPhone: '403-555-0388',
    contactEmail: `trim.${uniqueSuffix()}@example.com`,
    contactAddress: '8 Trim Road, Calgary, AB',
  };
  await expectError(await adminApi.post('/api/v1/admin/dealers', { ...valid, contactEmail: 'not-an-email' }), 400, 'VALIDATION');
  await expectError(await adminApi.post('/api/v1/admin/dealers', { ...valid, legalName: 'x'.repeat(201) }), 400, 'VALIDATION');
  await expectError(await adminApi.post('/api/v1/admin/dealers', { ...valid, contactAddress: '   ' }), 400, 'VALIDATION');

  const created = await adminApi.post('/api/v1/admin/dealers', { ...valid, legalName: `  ${valid.legalName}  ` });
  await expectStatus(created, 201);
  expect((await created.json()).legalName).toBe(valid.legalName);
});
