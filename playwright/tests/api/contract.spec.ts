import type { APIResponse } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { type Api, authHeaders, expectStatus, vehicleBody } from '../../support/api';
import { env } from '../../support/env';

// Cross-cutting API contract: design/14 §1.1 (pagination envelope), §1.2 (error body),
// §9 (audit query) and §12 (error-code catalog). Requirements NFR-01, DMS-06, CRM-03, AUD-05.

type Who = 'staff' | 'admin';
type ListEndpoint = { name: string; who: Who; path: (ctx: { dealerId: number; vehicleId: number }) => string;
  params?: (ctx: { dealerId: number; vehicleId: number }) => Record<string, string | number> };

const LIST_ENDPOINTS: ListEndpoint[] = [
  { name: 'vehicles', who: 'staff', path: () => '/api/v1/vehicles' },
  { name: 'customers', who: 'staff', path: () => '/api/v1/customers' },
  { name: 'leads', who: 'staff', path: () => '/api/v1/leads' },
  {
    name: 'audit', who: 'staff', path: () => '/api/v1/audit',
    params: ({ vehicleId }) => ({ entityType: 'VEHICLE', entityId: vehicleId }),
  },
  { name: 'admin dealers', who: 'admin', path: () => '/api/v1/admin/dealers' },
  { name: 'admin members', who: 'admin', path: ({ dealerId }) => `/api/v1/admin/dealers/${dealerId}/members` },
  { name: 'pending users', who: 'admin', path: () => '/api/v1/admin/pending-users' },
];

/** Patterns that indicate leaked internals (stack frames, exception types, SQL). */
const LEAK_PATTERNS = [
  /\bat [\w$.<>`]+\(/, // .NET / Java stack frame
  /\.cs:line \d+/,
  /StackTrace/i,
  /\w+Exception\b/,
  /\bSELECT\b[\s\S]*\bFROM\b/i,
  /\bINSERT\s+INTO\b/i,
  /\bUPDATE\s+\w+\s+SET\b/i,
  /\bMySql/i,
  /\bSQLSTATE\b/i,
];

function expectNoLeak(text: string, label: string) {
  for (const pattern of LEAK_PATTERNS) {
    expect(text, `${label} leaks internals (${pattern})`).not.toMatch(pattern);
  }
}

/** Asserts the §1.2 error body: JSON with non-empty string `code` and `message`, no internals. */
async function expectErrorBody(res: APIResponse, status: number, code?: string) {
  const text = await res.text();
  const label = `${res.url()} → ${res.status()} ${text}`;
  expect(res.status(), label).toBe(status);
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text);
  } catch {
    // Fall through: the assertions below report the non-JSON body.
  }
  expect(typeof body.code, `${label}: error body must have a string code`).toBe('string');
  expect(typeof body.message, `${label}: error body must have a string message`).toBe('string');
  expect((body.message as string).length, `${label}: message must not be empty`).toBeGreaterThan(0);
  if (code) expect(body.code, label).toBe(code);
  expectNoLeak(text, label);
  return body;
}

async function dealerAId(adminApi: Api) {
  const res = await adminApi.get('/api/v1/admin/dealers', { q: env.dealerA.legalName });
  await expectStatus(res, 200);
  const page = (await res.json()) as { items: { id: number; legalName: string }[] };
  const dealer = page.items.find((d) => d.legalName === env.dealerA.legalName);
  expect(dealer, `seeded dealer ${env.dealerA.legalName}`).toBeTruthy();
  return dealer!.id;
}

test.describe('§1.1 pagination envelope', () => {
  for (const endpoint of LIST_ENDPOINTS) {
    test(`NFR-01: ${endpoint.name} list returns {items,page,size,totalElements}, default 10, cap 100`, async ({
      staffApi, adminApi,
    }) => {
      const api = endpoint.who === 'admin' ? adminApi : staffApi;
      // Seed at least one row so the size cap is observable on otherwise empty lists.
      const vehicle = await staffApi.createVehicle();
      const ctx = { dealerId: endpoint.who === 'admin' ? await dealerAId(adminApi) : 0, vehicleId: vehicle.id };
      const path = endpoint.path(ctx);
      const base = endpoint.params?.(ctx) ?? {};

      const get = async (params: Record<string, string | number>) => {
        const res = await api.get(path, { ...base, ...params });
        await expectStatus(res, 200);
        return (await res.json()) as { items: unknown[]; page: number; size: number; totalElements: number };
      };

      const page = await get({});
      expect(Object.keys(page).sort()).toEqual(expect.arrayContaining(['items', 'page', 'size', 'totalElements']));
      expect(Array.isArray(page.items)).toBe(true);
      expect(page.page).toBe(0);
      expect(page.size).toBe(10);
      expect(Number.isInteger(page.totalElements)).toBe(true);
      expect(page.items.length).toBeLessThanOrEqual(10);
      expect(page.items.length).toBeLessThanOrEqual(page.totalElements);

      const oversized = await get({ size: 500 });
      expect.soft(oversized.size, `${endpoint.name}: size=500 must be read as 100`).toBe(100);
      expect.soft(oversized.items.length).toBeLessThanOrEqual(100);

      const zero = await get({ size: 0 });
      expect.soft(zero.size, `${endpoint.name}: size=0 must be read as 10`).toBe(10);
      expect.soft(zero.items.length).toBeLessThanOrEqual(10);

      const negative = await get({ page: -1 });
      expect.soft(negative.page, `${endpoint.name}: page=-1 must be read as 0`).toBe(0);
    });
  }
});

test.describe('§1.2 / §12 error body', () => {
  test('401: missing and invalid JWT return {code,message} UNAUTHORIZED', async ({ request }) => {
    await expectErrorBody(await request.get(`${env.gatewayUrl}/api/v1/vehicles`), 401, 'UNAUTHORIZED');
    await expectErrorBody(
      await request.get(`${env.gatewayUrl}/api/v1/vehicles`, { headers: authHeaders('not-a-jwt') }),
      401, 'UNAUTHORIZED');
  });

  test('400: validation failure returns {code,message} VALIDATION', async ({ staffApi }) => {
    const body = await expectErrorBody(await staffApi.post('/api/v1/vehicles', { make: '' }), 400, 'VALIDATION');
    if (body.fieldErrors !== undefined) expect(typeof body.fieldErrors).toBe('object');
  });

  test('400: malformed JSON returns {code,message} VALIDATION without internals', async ({ request, staffApi }) => {
    const res = await request.post(`${env.gatewayUrl}/api/v1/vehicles`, {
      headers: { ...authHeaders(staffApi.token), 'Content-Type': 'application/json' },
      data: '{"make":',
    });
    await expectErrorBody(res, 400, 'VALIDATION');
  });

  test('403: staff on an admin URL and admin on a business URL return FORBIDDEN', async ({ staffApi, adminApi }) => {
    await expectErrorBody(await staffApi.get('/api/v1/admin/dealers'), 403, 'FORBIDDEN');
    await expectErrorBody(await adminApi.get('/api/v1/vehicles'), 403, 'FORBIDDEN');
  });

  test('404: unknown id returns {code,message} NOT_FOUND', async ({ staffApi }) => {
    await expectErrorBody(await staffApi.get('/api/v1/vehicles/999999999'), 404, 'NOT_FOUND');
  });

  test('404: unknown /api path returns {code,message} NOT_FOUND', async ({ staffApi }) => {
    await expectErrorBody(await staffApi.get('/api/v1/no-such-endpoint'), 404, 'NOT_FOUND');
    await expectErrorBody(await staffApi.get('/api/v1/vehicles/1/no-such-child'), 404, 'NOT_FOUND');
  });

  test('405: unsupported method returns {code,message} METHOD_NOT_ALLOWED', async ({ staffApi }) => {
    await expectErrorBody(await staffApi.delete('/api/v1/vehicles'), 405, 'METHOD_NOT_ALLOWED');
    await expectErrorBody(await staffApi.put('/api/v1/customers', {}), 405, 'METHOD_NOT_ALLOWED');
  });

  test('409: stale version returns {code,message} VERSION_CONFLICT', async ({ staffApi }) => {
    const vehicle = await staffApi.createVehicle();
    const edit = { ...vehicleBody({ vin: vehicle.vin }), version: vehicle.version };
    await expectStatus(await staffApi.patch(`/api/v1/vehicles/${vehicle.id}`, { ...edit, model: 'A' }), 200);
    await expectErrorBody(
      await staffApi.patch(`/api/v1/vehicles/${vehicle.id}`, { ...edit, model: 'B' }), 409, 'VERSION_CONFLICT');
  });

  test('415: non-JSON body returns {code,message} UNSUPPORTED_MEDIA_TYPE', async ({ request, staffApi }) => {
    const res = await request.post(`${env.gatewayUrl}/api/v1/vehicles`, {
      headers: { ...authHeaders(staffApi.token), 'Content-Type': 'text/plain' },
      data: 'make=Toyota',
    });
    await expectErrorBody(res, 415, 'UNSUPPORTED_MEDIA_TYPE');
  });
});

test.describe('§9 audit query', () => {
  test('AUD-03: missing entityType or entityId returns 400 VALIDATION', async ({ staffApi }) => {
    const vehicle = await staffApi.createVehicle();
    await expectErrorBody(await staffApi.get('/api/v1/audit'), 400, 'VALIDATION');
    await expectErrorBody(await staffApi.get('/api/v1/audit', { entityId: vehicle.id }), 400, 'VALIDATION');
    await expectErrorBody(await staffApi.get('/api/v1/audit', { entityType: 'VEHICLE' }), 400, 'VALIDATION');
  });

  test('AUD-14: LISTING is an audited type (unknown id → 404); any unknown type returns 400 VALIDATION', async ({ staffApi }) => {
    const vehicle = await staffApi.createVehicle();
    await expectErrorBody(
      await staffApi.get('/api/v1/audit', { entityType: 'LISTING', entityId: 999_999_999 }), 404, 'NOT_FOUND');
    await expectErrorBody(
      await staffApi.get('/api/v1/audit', { entityType: 'BOGUS', entityId: vehicle.id }), 400, 'VALIDATION');
  });

  test('AUD-08: DEALER and MEMBERSHIP audit are closed to staff (403)', async ({ staffApi, adminApi }) => {
    const dealerId = await dealerAId(adminApi);
    await expectErrorBody(
      await staffApi.get('/api/v1/audit', { entityType: 'DEALER', entityId: dealerId }), 403, 'FORBIDDEN');
    await expectErrorBody(
      await staffApi.get('/api/v1/audit', { entityType: 'MEMBERSHIP', entityId: 1 }), 403, 'FORBIDDEN');
  });

  test('AUTH-08: admin gets 403 on the audit query for every entityType', async ({ staffApi, adminApi }) => {
    const vehicle = await staffApi.createVehicle();
    const dealerId = await dealerAId(adminApi);
    for (const [entityType, entityId] of [
      ['VEHICLE', vehicle.id], ['CUSTOMER', 1], ['DEALER', dealerId], ['MEMBERSHIP', 1],
    ] as const) {
      const res = await adminApi.get('/api/v1/audit', { entityType, entityId });
      const body = await expectErrorBody(res, 403, 'FORBIDDEN');
      expect(body).not.toHaveProperty('items');
    }
  });

  test('AUD-05: the audit trail is append-only (no PUT/PATCH/DELETE/POST)', async ({ staffApi }) => {
    const vehicle = await staffApi.createVehicle();
    const before = await staffApi.get('/api/v1/audit', { entityType: 'VEHICLE', entityId: vehicle.id });
    await expectStatus(before, 200);
    const history = (await before.json()) as { items: { id: number }[]; totalElements: number };
    expect(history.totalElements).toBeGreaterThanOrEqual(1);
    const entryId = history.items[0].id;

    const attempts = [
      staffApi.put('/api/v1/audit', {}),
      staffApi.patch('/api/v1/audit', {}),
      staffApi.delete('/api/v1/audit'),
      staffApi.post('/api/v1/audit', { entityType: 'VEHICLE', entityId: vehicle.id, action: 'DELETE' }),
      staffApi.put(`/api/v1/audit/${entryId}`, {}),
      staffApi.patch(`/api/v1/audit/${entryId}`, {}),
      staffApi.delete(`/api/v1/audit/${entryId}`),
    ];
    for (const res of await Promise.all(attempts)) {
      expect([404, 405], `${res.url()} must not accept writes`).toContain(res.status());
    }

    const after = await staffApi.get('/api/v1/audit', { entityType: 'VEHICLE', entityId: vehicle.id });
    await expectStatus(after, 200);
    expect(await after.json()).toEqual(history);
  });

  test('AUD-05: write methods on the audit collection return 405 METHOD_NOT_ALLOWED', async ({ staffApi }) => {
    await expectErrorBody(await staffApi.put('/api/v1/audit', {}), 405, 'METHOD_NOT_ALLOWED');
    await expectErrorBody(await staffApi.delete('/api/v1/audit'), 405, 'METHOD_NOT_ALLOWED');
  });
});

test('§1.2: error responses never contain stack traces or SQL', async ({ request, staffApi, adminApi }) => {
  const auth = authHeaders(staffApi.token);
  const responses = await Promise.all([
    staffApi.post('/api/v1/vehicles', { modelYear: 'not-a-year', purchaseCost: 'x' }),
    staffApi.get('/api/v1/vehicles', { page: 'abc', size: 'x' }),
    staffApi.get('/api/v1/vehicles/not-a-number'),
    staffApi.get("/api/v1/customers", { q: "' OR 1=1 --" }),
    staffApi.get('/api/v1/audit', { entityType: 'VEHICLE', entityId: 'abc' }),
    staffApi.patch('/api/v1/vehicles/999999999', { version: 0 }),
    staffApi.post('/api/v1/customers', { name: 'x'.repeat(5000) }),
    request.post(`${env.gatewayUrl}/api/v1/customers`, {
      headers: { ...auth, 'Content-Type': 'application/json' }, data: '[[[[',
    }),
    request.post(`${env.gatewayUrl}/api/v1/vehicles`, {
      headers: { ...auth, 'Content-Type': 'application/xml' }, data: '<vehicle/>',
    }),
    adminApi.get('/api/v1/admin/dealers/not-a-number'),
  ]);
  for (const res of responses) {
    expect(res.status(), `${res.url()} must not be a 5xx`).toBeLessThan(500);
    expectNoLeak(await res.text(), `${res.url()} → ${res.status()}`);
  }
});
