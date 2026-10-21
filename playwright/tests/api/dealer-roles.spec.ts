import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { Api, apiLogin, expectError, expectStatus, uniqueSuffix } from '../../support/api';
import { env } from '../../support/env';

// Dealership roles (design/21 AUTH-26, AUTH-27; design/15 §2.5; contract §3.7b, §5.7, §5.8):
// members start as STAFF, only the platform admin promotes or demotes, and only a manager sees
// the inbox, settles join requests, removes staff and edits the dealership profile.

type Member = { username: string; dealerRole: string };
type Me = { dealerId: number | null; dealerRole: string | null };
type Dealer = { id: number; legalName: string; contactPhone: string; contactEmail: string; contactAddress: string;
  logoDataUrl: string | null; version: number };

async function createDealer(adminApi: Api) {
  const id = uniqueSuffix();
  const res = await adminApi.post('/api/v1/admin/dealers', {
    legalName: `E2E Roles Dealer ${id}`,
    contactPhone: '403-555-0166',
    contactEmail: `e2e.roles.${id}@example.com`,
    contactAddress: '6 Roles Road, Calgary, AB',
  });
  await expectStatus(res, 201);
  return (await res.json()) as Dealer;
}

async function bindMember(request: APIRequestContext, adminApi: Api, dealerId: number) {
  const id = uniqueSuffix();
  const account = {
    username: `e2e.role.${id}`, displayName: `E2E Role ${id}`, email: `e2e.role.${id}@example.com`,
    password: 'e2e-role-pass-1',
  };
  const res = await adminApi.post(`/api/v1/admin/dealers/${dealerId}/members`, account);
  await expectStatus(res, 201);
  expect(((await res.json()) as Member).dealerRole).toBe('STAFF');
  const login = await apiLogin(request, account.username, account.password);
  return { ...account, api: new Api(request, login.accessToken) };
}

function setRole(adminApi: Api, dealerId: number, username: string, dealerRole: unknown) {
  return adminApi.put(`/api/v1/admin/dealers/${dealerId}/members/${username}/role`, { dealerRole });
}

async function me(api: Api) {
  const res = await api.get('/api/v1/me');
  await expectStatus(res, 200);
  return (await res.json()) as Me;
}

test('AUTH-26: members start as staff; only the admin promotes and demotes, and the change applies at once', async ({
  request, adminApi,
}) => {
  const dealer = await createDealer(adminApi);
  const first = await bindMember(request, adminApi, dealer.id);
  const second = await bindMember(request, adminApi, dealer.id);
  expect((await me(first.api)).dealerRole).toBe('STAFF');

  await expectStatus(await setRole(adminApi, dealer.id, first.username, 'MANAGER'), 204);
  // Same token: the role is read from the membership on every request.
  expect((await me(first.api)).dealerRole).toBe('MANAGER');
  const members = (await (await second.api.get('/api/v1/members')).json()) as Member[];
  expect(members.find((m) => m.username === first.username)?.dealerRole).toBe('MANAGER');
  expect(members.find((m) => m.username === second.username)?.dealerRole).toBe('STAFF');

  const list = await adminApi.get(`/api/v1/admin/dealers/${dealer.id}/members`);
  const items = ((await list.json()) as { items: Member[] }).items;
  expect(items.find((m) => m.username === first.username)?.dealerRole).toBe('MANAGER');

  // A manager cannot change roles: the route is admin-only.
  await expectError(await setRole(first.api, dealer.id, second.username, 'MANAGER'), 403, 'FORBIDDEN');
  await expectError(await setRole(adminApi, dealer.id, second.username, 'OWNER'), 400, 'VALIDATION');
  await expectError(await setRole(adminApi, dealer.id, 'nobody.here', 'MANAGER'), 404, 'NOT_FOUND');

  await expectStatus(await setRole(adminApi, dealer.id, first.username, 'STAFF'), 204);
  expect((await me(first.api)).dealerRole).toBe('STAFF');
  await expectError(await first.api.get('/api/v1/dealer/join-requests'), 403, 'FORBIDDEN');
});

test('AUTH-27: staff get 403 on the inbox, join requests, the dealership profile and removing members', async ({
  staffApi, staff2Api,
}) => {
  // e2e.staff is a manager, e2e.staff2 is staff (global setup).
  for (const path of ['/api/v1/dealer/join-requests', '/api/v1/dealer/notifications', '/api/v1/dealer/profile']) {
    await expectStatus(await staffApi.get(path), 200);
    await expectError(await staff2Api.get(path), 403, 'FORBIDDEN');
  }
  await expectError(await staff2Api.post('/api/v1/dealer/join-requests/nobody.here/approve'), 403, 'FORBIDDEN');
  await expectError(await staff2Api.post('/api/v1/dealer/join-requests/nobody.here/reject'), 403, 'FORBIDDEN');
  await expectError(await staff2Api.delete(`/api/v1/dealer/members/${env.staff.username}`), 403, 'FORBIDDEN');
  await expectError(await staff2Api.patch('/api/v1/dealer/profile', {
    version: 0, legalName: 'x', contactPhone: 'x', contactEmail: 'x@example.com', contactAddress: 'x', logoDataUrl: null,
  }), 403, 'FORBIDDEN');

  // Business data stays the same for both roles.
  await expectStatus(await staff2Api.get('/api/v1/vehicles'), 200);
  await expectStatus(await staff2Api.get('/api/v1/members'), 200);
});

test('AUTH-25 / AUTH-27: a registered account asks to join, the manager approves, and it joins as staff', async ({
  request, adminApi,
}) => {
  const dealer = await createDealer(adminApi);
  const manager = await bindMember(request, adminApi, dealer.id);
  const staff = await bindMember(request, adminApi, dealer.id);
  await expectStatus(await setRole(adminApi, dealer.id, manager.username, 'MANAGER'), 204);

  const id = uniqueSuffix();
  const account = { username: `e2e.join.${id}`, displayName: `E2E Join ${id}`, email: `e2e.join.${id}@example.com`,
    password: 'e2e-join-pass-1' };
  await expectStatus(await request.post(`${env.gatewayUrl}/api/v1/auth/register`, { data: account }), 201);
  const joiner = new Api(request, (await apiLogin(request, account.username, account.password)).accessToken);
  await expectStatus(await joiner.post('/api/v1/me/join-request', { dealerId: dealer.id }), 200);

  // Only the manager sees it, in the queue and in the inbox.
  await expectError(await staff.api.get('/api/v1/dealer/join-requests'), 403, 'FORBIDDEN');
  const queue = (await (await manager.api.get('/api/v1/dealer/join-requests')).json()) as { username: string }[];
  expect(queue.map((q) => q.username)).toEqual([account.username]);
  await expectError(await staff.api.post(`/api/v1/dealer/join-requests/${account.username}/approve`), 403, 'FORBIDDEN');

  await expectStatus(await manager.api.post(`/api/v1/dealer/join-requests/${account.username}/approve`), 204);
  expect(await me(joiner)).toMatchObject({ dealerId: dealer.id, dealerRole: 'STAFF' });
});

test('AUTH-27: a manager removes staff but never a manager, themselves included', async ({ request, adminApi }) => {
  const dealer = await createDealer(adminApi);
  const manager = await bindMember(request, adminApi, dealer.id);
  const other = await bindMember(request, adminApi, dealer.id);
  const staff = await bindMember(request, adminApi, dealer.id);
  await expectStatus(await setRole(adminApi, dealer.id, manager.username, 'MANAGER'), 204);
  await expectStatus(await setRole(adminApi, dealer.id, other.username, 'MANAGER'), 204);

  await expectError(await manager.api.delete(`/api/v1/dealer/members/${manager.username}`), 403, 'FORBIDDEN');
  await expectError(await manager.api.delete(`/api/v1/dealer/members/${other.username}`), 403, 'FORBIDDEN');
  await expectError(await manager.api.delete('/api/v1/dealer/members/nobody.here'), 404, 'NOT_FOUND');

  await expectStatus(await manager.api.delete(`/api/v1/dealer/members/${staff.username}`), 204);
  expect((await me(staff.api)).dealerId ?? null).toBeNull();
  await expectError(await staff.api.get('/api/v1/vehicles'), 403, 'FORBIDDEN');
  const members = (await (await manager.api.get('/api/v1/members')).json()) as Member[];
  expect(members.map((m) => m.username)).not.toContain(staff.username);
});

test('AUTH-27: a manager edits the dealership profile; it reaches /me and stale versions conflict', async ({
  request, adminApi,
}) => {
  const dealer = await createDealer(adminApi);
  const manager = await bindMember(request, adminApi, dealer.id);
  const staff = await bindMember(request, adminApi, dealer.id);
  await expectStatus(await setRole(adminApi, dealer.id, manager.username, 'MANAGER'), 204);

  const current = (await (await manager.api.get('/api/v1/dealer/profile')).json()) as Dealer;
  expect(current.id).toBe(dealer.id);
  const body = {
    version: current.version, legalName: `${current.legalName} Renamed`, contactPhone: '403-555-0199',
    contactEmail: current.contactEmail, contactAddress: current.contactAddress, logoDataUrl: null,
  };

  await expectError(await manager.api.patch('/api/v1/dealer/profile', { ...body, contactEmail: 'not-an-email' }), 400, 'VALIDATION');
  const saved = await manager.api.patch('/api/v1/dealer/profile', body);
  await expectStatus(saved, 200);
  expect(await saved.json()).toMatchObject({ legalName: body.legalName, contactPhone: '403-555-0199' });

  const staffMe = await staff.api.get('/api/v1/me');
  expect(await staffMe.json()).toMatchObject({ dealerLegalName: body.legalName, dealerContactPhone: '403-555-0199' });
  await expectError(await manager.api.patch('/api/v1/dealer/profile', body), 409, 'VERSION_CONFLICT');
});
