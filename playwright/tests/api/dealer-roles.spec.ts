import type { APIResponse } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import {
  Api, addMember, apiLogin, bindOwner, createDealership, expectError, expectStatus, meOf, uniqueSuffix,
} from '../../support/api';
import { env } from '../../support/env';

// Dealership role hierarchy (requirements/update-cr/CR-Role-Hierarchy-2026-11-03.md; design/21
// AUTH-26..28; design/15 §2.5; contract §3.7b, §5.7, §5.8). Three tiers inside the dealership:
// the platform admin binds the first OWNER directly and only files a join request afterwards; the
// owner runs the dealership profile, the join requests and the manager appointments; a manager
// administers SALES members only; a sales member does business work and never opens Team.
// JWT roles stay Platform.Admin and Dealer.User.

// Building a three-tier dealership costs a bind, a join request, an approval and a login per
// member, so these cases need more than the default budget.
test.describe.configure({ timeout: 120_000 });

type Member = { username: string; dealerRole: string };
type Dealer = { id: number; legalName: string; contactPhone: string; contactEmail: string; contactAddress: string;
  logoDataUrl: string | null; version: number };
type AuditRow = { entityType: string; action: string;
  fieldSummary: Record<string, string> | null; previous: Record<string, string> | null };

function setRole(adminApi: Api, dealerId: number, username: string, dealerRole: unknown) {
  return adminApi.put(`/api/v1/admin/dealers/${dealerId}/members/${username}/role`, { dealerRole });
}

/** 403 FORBIDDEN carrying the exact message the tier boundary returns. */
async function expectDenied(res: APIResponse, message: string) {
  const text = await res.text();
  expect(res.status(), `${res.url()} → ${text}`).toBe(403);
  expect(JSON.parse(text)).toMatchObject({ code: 'FORBIDDEN', message });
}

const OWNER_ONLY = 'Only the dealership owner can do this.';
const TEAM_ONLY = 'Only a dealership owner or manager can do this.';

test('ROLE / bootstrap: the admin binds the first owner directly, then only files a join request', async ({
  request, adminApi,
}) => {
  const dealer = await createDealership(adminApi, 'E2E Roles Dealer');

  // An empty dealership has nobody who could approve a join request, so the first account is bound.
  const owner = await bindOwner(request, adminApi, dealer.id);
  expect(await meOf(owner.api)).toMatchObject({ dealerId: dealer.id, dealerRole: 'OWNER' });

  // With an owner in place the same admin call files a join request and binds nothing.
  const id = uniqueSuffix();
  const account = { username: `e2e.second.${id}`, displayName: `E2E Second ${id}`,
    email: `e2e.second.${id}@example.com`, password: 'e2e-second-pass-1' };
  const filed = await adminApi.post(`/api/v1/admin/dealers/${dealer.id}/members`, account);
  await expectStatus(filed, 202);
  expect(await filed.json()).toMatchObject({
    username: account.username, dealerId: dealer.id, joinRequested: true,
    message: 'Join request sent to the dealership. The owner approves it in Team > Join Requests.',
  });

  const applicant = new Api(request, (await apiLogin(request, account.username, account.password)).accessToken);
  expect((await meOf(applicant)).dealerId ?? null).toBeNull();
  await expectError(await applicant.get('/api/v1/vehicles'), 403, 'FORBIDDEN');

  // The owner sees the request and approving it adds the applicant as a sales member.
  const queue = (await (await owner.api.get('/api/v1/dealer/join-requests')).json()) as { username: string }[];
  expect(queue.map((q) => q.username)).toContain(account.username);
  await expectStatus(await owner.api.post(`/api/v1/dealer/join-requests/${account.username}/approve`), 204);
  expect(await meOf(applicant)).toMatchObject({ dealerId: dealer.id, dealerRole: 'SALES' });
  await expectStatus(await applicant.get('/api/v1/vehicles'), 200);
});

test('AUTH-26: the platform admin is the only one who appoints an owner, and the change applies at once', async ({
  request, adminApi,
}) => {
  const dealer = await createDealership(adminApi, 'E2E Roles Dealer');
  const owner = await bindOwner(request, adminApi, dealer.id);
  const member = await addMember(request, adminApi, dealer.id, owner);
  expect((await meOf(member.api)).dealerRole).toBe('SALES');

  await expectStatus(await setRole(adminApi, dealer.id, member.username, 'MANAGER'), 204);
  // Same token: the tier is read from the membership on every request.
  expect((await meOf(member.api)).dealerRole).toBe('MANAGER');
  const members = (await (await member.api.get('/api/v1/members')).json()) as Member[];
  expect(members.find((m) => m.username === owner.username)?.dealerRole).toBe('OWNER');
  expect(members.find((m) => m.username === member.username)?.dealerRole).toBe('MANAGER');

  const list = await adminApi.get(`/api/v1/admin/dealers/${dealer.id}/members`);
  const items = ((await list.json()) as { items: Member[] }).items;
  expect(items.find((m) => m.username === member.username)?.dealerRole).toBe('MANAGER');

  // The admin may set all three tiers, which is how a departing owner is replaced. Appointing an
  // owner hands the office over, because a dealership has exactly one active owner.
  await expectStatus(await setRole(adminApi, dealer.id, member.username, 'OWNER'), 204);
  expect((await meOf(member.api)).dealerRole).toBe('OWNER');
  expect((await meOf(owner.api)).dealerRole).toBe('MANAGER');
  // Demoting the sitting sole owner is refused; the office is handed back instead.
  await expectError(await setRole(adminApi, dealer.id, member.username, 'SALES'), 409, 'LAST_OWNER');
  await expectStatus(await setRole(adminApi, dealer.id, owner.username, 'OWNER'), 204);
  expect((await meOf(member.api)).dealerRole).toBe('MANAGER');
  await expectStatus(await setRole(adminApi, dealer.id, member.username, 'SALES'), 204);
  expect((await meOf(member.api)).dealerRole).toBe('SALES');

  // The route itself is admin-only, and unknown members and values are refused.
  await expectError(await setRole(owner.api, dealer.id, member.username, 'MANAGER'), 403, 'FORBIDDEN');
  await expectError(await setRole(adminApi, dealer.id, member.username, 'STAFF'), 400, 'VALIDATION');
  await expectError(await setRole(adminApi, dealer.id, 'nobody.here', 'MANAGER'), 404, 'NOT_FOUND');
});

test('ROLE / owner only: the dealership profile and the join requests are the owner\'s', async ({
  request, adminApi,
}) => {
  const dealer = await createDealership(adminApi, 'E2E Roles Dealer');
  const owner = await bindOwner(request, adminApi, dealer.id);
  const manager = await addMember(request, adminApi, dealer.id, owner, 'MANAGER');
  const sales = await addMember(request, adminApi, dealer.id, owner);

  for (const path of ['/api/v1/dealer/profile', '/api/v1/dealer/join-requests']) {
    await expectStatus(await owner.api.get(path), 200);
    await expectDenied(await manager.api.get(path), OWNER_ONLY);
    await expectDenied(await sales.api.get(path), OWNER_ONLY);
  }
  for (const api of [manager.api, sales.api]) {
    await expectDenied(await api.post('/api/v1/dealer/join-requests/nobody.here/approve'), OWNER_ONLY);
    await expectDenied(await api.post('/api/v1/dealer/join-requests/nobody.here/reject'), OWNER_ONLY);
    await expectDenied(await api.patch('/api/v1/dealer/profile', {
      version: 0, legalName: 'x', contactPhone: 'x', contactEmail: 'x@example.com', contactAddress: 'x', logoDataUrl: null,
    }), OWNER_ONLY);
  }
});

test('ROLE / owner or manager: the dealership audit log; a sales member is refused', async ({
  request, adminApi,
}) => {
  const dealer = await createDealership(adminApi, 'E2E Roles Dealer');
  const owner = await bindOwner(request, adminApi, dealer.id);
  const manager = await addMember(request, adminApi, dealer.id, owner, 'MANAGER');
  const sales = await addMember(request, adminApi, dealer.id, owner);

  await expectStatus(await owner.api.get('/api/v1/dealer/audit'), 200);
  await expectStatus(await manager.api.get('/api/v1/dealer/audit'), 200);
  await expectDenied(await sales.api.get('/api/v1/dealer/audit'), TEAM_ONLY);

  // Team administration is the only difference: all three tiers see the same business data.
  for (const api of [owner.api, manager.api, sales.api]) {
    await expectStatus(await api.get('/api/v1/vehicles'), 200);
    await expectStatus(await api.get('/api/v1/customers'), 200);
    await expectStatus(await api.get('/api/v1/members'), 200);
    await expectStatus(await api.get('/api/v1/dealer/notifications'), 200);
  }
  await expectDenied(await sales.api.put(`/api/v1/dealer/members/${manager.username}/role`,
    { dealerRole: 'SALES' }), TEAM_ONLY);
  await expectDenied(await sales.api.delete(`/api/v1/dealer/members/${manager.username}`), TEAM_ONLY);
});

test('ROLE / nobody inside the dealership appoints an owner or touches the owner row', async ({
  request, adminApi,
}) => {
  const dealer = await createDealership(adminApi, 'E2E Roles Dealer');
  const owner = await bindOwner(request, adminApi, dealer.id);
  const manager = await addMember(request, adminApi, dealer.id, owner, 'MANAGER');
  const sales = await addMember(request, adminApi, dealer.id, owner);

  for (const [actor, target] of [[owner, sales], [manager, sales]] as const) {
    await expectDenied(await actor.api.put(`/api/v1/dealer/members/${target.username}/role`, { dealerRole: 'OWNER' }),
      'Only the platform admin can appoint a dealership owner.');
  }
  // Nobody changes their own role, the owner included.
  for (const actor of [owner, manager]) {
    await expectDenied(await actor.api.put(`/api/v1/dealer/members/${actor.username}/role`, { dealerRole: 'SALES' }),
      'You cannot change your own role.');
  }
  // The owner row is only reachable from the platform admin console.
  await expectDenied(await manager.api.put(`/api/v1/dealer/members/${owner.username}/role`, { dealerRole: 'SALES' }),
    'Only the platform admin can change the dealership owner.');
  await expectDenied(await manager.api.patch(`/api/v1/dealer/members/${owner.username}`,
    { displayName: 'Renamed', phone: null }), 'The dealership owner\'s own details are edited in Profile.');
  await expectDenied(await manager.api.delete(`/api/v1/dealer/members/${owner.username}`),
    'Only the platform admin can remove the dealership owner.');
  expect((await meOf(owner.api)).dealerRole).toBe('OWNER');
});

test('ROLE / a manager acts on sales members only', async ({ request, adminApi }) => {
  const dealer = await createDealership(adminApi, 'E2E Roles Dealer');
  const owner = await bindOwner(request, adminApi, dealer.id);
  const manager = await addMember(request, adminApi, dealer.id, owner, 'MANAGER');
  const other = await addMember(request, adminApi, dealer.id, owner, 'MANAGER');
  const sales = await addMember(request, adminApi, dealer.id, owner);

  // A manager never acts on another manager.
  await expectDenied(await manager.api.put(`/api/v1/dealer/members/${other.username}/role`, { dealerRole: 'SALES' }),
    'Only the dealership owner can change a manager\'s role.');
  await expectDenied(await manager.api.patch(`/api/v1/dealer/members/${other.username}`,
    { displayName: 'Renamed', phone: null }), 'Only the dealership owner can edit a manager\'s details.');
  await expectDenied(await manager.api.delete(`/api/v1/dealer/members/${other.username}`),
    'Only the dealership owner can remove a manager.');
  expect((await meOf(other.api)).dealerRole).toBe('MANAGER');

  // A manager promotes a sales member, edits their details and removes them.
  await expectStatus(await manager.api.patch(`/api/v1/dealer/members/${sales.username}`,
    { displayName: 'Renamed By Manager', phone: `+1403${Date.now().toString().slice(-7)}` }), 204);
  const renamed = (await (await manager.api.get('/api/v1/members')).json()) as { username: string; displayName: string }[];
  expect(renamed.find((m) => m.username === sales.username)?.displayName).toBe('Renamed By Manager');

  await expectStatus(await manager.api.put(`/api/v1/dealer/members/${sales.username}/role`,
    { dealerRole: 'MANAGER' }), 204);
  expect((await meOf(sales.api)).dealerRole).toBe('MANAGER');
  // Now a manager, the same member is out of this manager's reach.
  await expectDenied(await manager.api.put(`/api/v1/dealer/members/${sales.username}/role`, { dealerRole: 'SALES' }),
    'Only the dealership owner can change a manager\'s role.');
  await expectError(await manager.api.delete('/api/v1/dealer/members/nobody.here'), 404, 'NOT_FOUND');
});

test('ROLE / the owner administers every member below owner', async ({ request, adminApi }) => {
  const dealer = await createDealership(adminApi, 'E2E Roles Dealer');
  const owner = await bindOwner(request, adminApi, dealer.id);
  const manager = await addMember(request, adminApi, dealer.id, owner, 'MANAGER');
  const sales = await addMember(request, adminApi, dealer.id, owner);

  // Demoting a manager is the owner's power alone.
  await expectStatus(await owner.api.put(`/api/v1/dealer/members/${manager.username}/role`,
    { dealerRole: 'SALES' }), 204);
  expect((await meOf(manager.api)).dealerRole).toBe('SALES');
  await expectStatus(await owner.api.put(`/api/v1/dealer/members/${manager.username}/role`,
    { dealerRole: 'MANAGER' }), 204);

  // The owner edits a manager's full name and phone, which a manager may not.
  await expectStatus(await owner.api.patch(`/api/v1/dealer/members/${manager.username}`,
    { displayName: 'Renamed By Owner', phone: null }), 204);

  // The owner removes managers and sales members; access ends at once and the account is kept.
  await expectStatus(await owner.api.delete(`/api/v1/dealer/members/${sales.username}`), 204);
  expect((await meOf(sales.api)).dealerId ?? null).toBeNull();
  await expectError(await sales.api.get('/api/v1/vehicles'), 403, 'FORBIDDEN');
  await expectStatus(await owner.api.delete(`/api/v1/dealer/members/${manager.username}`), 204);
  const left = (await (await owner.api.get('/api/v1/members')).json()) as Member[];
  expect(left.map((m) => m.username)).toEqual([owner.username]);
});

test('AUTH-27: join requests reach the owner\'s inbox only', async ({ request, adminApi }) => {
  const dealer = await createDealership(adminApi, 'E2E Roles Dealer');
  const owner = await bindOwner(request, adminApi, dealer.id);
  const manager = await addMember(request, adminApi, dealer.id, owner, 'MANAGER');
  const sales = await addMember(request, adminApi, dealer.id, owner);

  const id = uniqueSuffix();
  const account = { username: `e2e.join.${id}`, displayName: `E2E Join ${id}`,
    email: `e2e.join.${id}@example.com`, password: 'e2e-join-pass-1' };
  await expectStatus(await request.post(`${env.gatewayUrl}/api/v1/auth/register`, { data: account }), 201);
  const joiner = new Api(request, (await apiLogin(request, account.username, account.password)).accessToken);
  await expectStatus(await joiner.post('/api/v1/me/join-request', { dealerId: dealer.id }), 200);

  const ownerInbox = await owner.api.get('/api/v1/dealer/notifications');
  await expectStatus(ownerInbox, 200);
  expect(await ownerInbox.text()).toContain('JOIN_REQUEST');
  // A manager and a sales member get every other kind, never JOIN_REQUEST.
  for (const api of [manager.api, sales.api]) {
    const inbox = await api.get('/api/v1/dealer/notifications');
    await expectStatus(inbox, 200);
    expect(await inbox.text()).not.toContain('JOIN_REQUEST');
  }
  expect((await (await owner.api.get('/api/v1/dealer/join-requests')).json() as unknown[]).length).toBe(1);
});

test('AUTH-27: the owner edits the dealership profile; it reaches /me and stale versions conflict', async ({
  request, adminApi,
}) => {
  const dealer = await createDealership(adminApi, 'E2E Roles Dealer');
  const owner = await bindOwner(request, adminApi, dealer.id);
  const sales = await addMember(request, adminApi, dealer.id, owner);

  const current = (await (await owner.api.get('/api/v1/dealer/profile')).json()) as Dealer;
  expect(current.id).toBe(dealer.id);
  const body = {
    version: current.version, legalName: `${current.legalName} Renamed`, contactPhone: '403-555-0199',
    contactEmail: current.contactEmail, contactAddress: current.contactAddress, logoDataUrl: null,
  };

  await expectError(await owner.api.patch('/api/v1/dealer/profile', { ...body, contactEmail: 'not-an-email' }), 400, 'VALIDATION');
  const saved = await owner.api.patch('/api/v1/dealer/profile', body);
  await expectStatus(saved, 200);
  expect(await saved.json()).toMatchObject({ legalName: body.legalName, contactPhone: '403-555-0199' });

  const salesMe = await sales.api.get('/api/v1/me');
  expect(await salesMe.json()).toMatchObject({ dealerLegalName: body.legalName, dealerContactPhone: '403-555-0199' });
  await expectError(await owner.api.patch('/api/v1/dealer/profile', body), 409, 'VERSION_CONFLICT');
});

test('ROLE / the seeded dealership carries all three tiers', async ({ staffApi, staff2Api, request }) => {
  // e2e.staff is the owner, lafe is a manager and e2e.staff2 is a sales member (global setup).
  expect((await meOf(staffApi)).dealerRole).toBe('OWNER');
  expect((await meOf(staff2Api)).dealerRole).toBe('SALES');
  const manager = await Api.as(request, env.manager.username, env.manager.password);
  expect((await meOf(manager)).dealerRole).toBe('MANAGER');

  await expectStatus(await staffApi.get('/api/v1/dealer/profile'), 200);
  await expectDenied(await manager.get('/api/v1/dealer/profile'), OWNER_ONLY);
  await expectDenied(await staff2Api.get('/api/v1/dealer/profile'), OWNER_ONLY);
  await expectStatus(await manager.get('/api/v1/dealer/audit'), 200);
  await expectDenied(await staff2Api.get('/api/v1/dealer/audit'), TEAM_ONLY);
});

test('ROLE / cardinality: appointing an owner transfers the office, and both rows are audited', async ({
  request, adminApi,
}) => {
  const dealer = await createDealership(adminApi, 'E2E Roles Dealer');
  const owner = await bindOwner(request, adminApi, dealer.id);
  const successor = await addMember(request, adminApi, dealer.id, owner, 'MANAGER');

  await expectStatus(await setRole(adminApi, dealer.id, successor.username, 'OWNER'), 204);

  // One active owner per dealership: the sitting owner becomes a manager in the same change.
  expect((await meOf(successor.api)).dealerRole).toBe('OWNER');
  expect((await meOf(owner.api)).dealerRole).toBe('MANAGER');
  const members = (await (await successor.api.get('/api/v1/members')).json()) as Member[];
  expect(members.filter((m) => m.dealerRole === 'OWNER').map((m) => m.username)).toEqual([successor.username]);

  // Both sides of the handover are traceable, each with the tier it carried before (AUD-07).
  const log = await adminApi.get('/api/v1/admin/audit',
    { dealerId: dealer.id, entityType: 'MEMBERSHIP', action: 'UPDATE', size: 50 });
  await expectStatus(log, 200);
  const rows = ((await log.json()) as { items: AuditRow[] }).items;
  const handover = (username: string, dealerRole: string) => rows.find(
    (r) => r.fieldSummary?.username === username && r.fieldSummary?.dealerRole === dealerRole);
  expect(handover(successor.username, 'OWNER')?.previous?.dealerRole, JSON.stringify(rows)).toBe('MANAGER');
  expect(handover(owner.username, 'MANAGER')?.previous?.dealerRole, JSON.stringify(rows)).toBe('OWNER');

  // The owner-only powers move with the office; the former owner keeps a manager's reach.
  await expectStatus(await successor.api.get('/api/v1/dealer/profile'), 200);
  await expectStatus(await successor.api.get('/api/v1/dealer/join-requests'), 200);
  await expectDenied(await owner.api.get('/api/v1/dealer/profile'), OWNER_ONLY);
  await expectStatus(await owner.api.get('/api/v1/dealer/audit'), 200);
});

test('ROLE / cardinality: the only owner is not demoted, unbound or self-deleted while staff remain', async ({
  request, adminApi,
}) => {
  const dealer = await createDealership(adminApi, 'E2E Roles Dealer');
  const owner = await bindOwner(request, adminApi, dealer.id);
  const manager = await addMember(request, adminApi, dealer.id, owner, 'MANAGER');
  const unbind = `/api/v1/admin/dealers/${dealer.id}/members/${owner.username}`;

  // A dealership that still has staff keeps its owner, so every route that would empty the
  // office is refused with the same 409 code.
  const refused = await setRole(adminApi, dealer.id, owner.username, 'MANAGER');
  await expectError(refused, 409, 'LAST_OWNER');
  expect((await refused.json()).message).toBe(
    'This is the dealership\'s only owner. Appoint another owner before demoting or removing this member.');
  await expectError(await setRole(adminApi, dealer.id, owner.username, 'SALES'), 409, 'LAST_OWNER');
  await expectError(await adminApi.delete(unbind), 409, 'LAST_OWNER');
  await expectError(await adminApi.delete(`${unbind}/account`), 409, 'LAST_OWNER');
  const self = await owner.api.delete('/api/v1/me');
  await expectError(self, 409, 'LAST_OWNER');
  expect((await self.json()).message).toContain('Ask the platform admin to appoint another owner');

  // Nothing changed: the owner is still the owner and still signs in.
  expect((await meOf(owner.api)).dealerRole).toBe('OWNER');
  await expectStatus(await owner.api.get('/api/v1/dealer/profile'), 200);

  // With a successor appointed the former owner leaves, and the dealership keeps its one owner.
  await expectStatus(await setRole(adminApi, dealer.id, manager.username, 'OWNER'), 204);
  await expectStatus(await adminApi.delete(unbind), 204);
  expect((await meOf(owner.api)).dealerId ?? null).toBeNull();
  expect((await meOf(manager.api)).dealerRole).toBe('OWNER');
});

test('ROLE / cardinality: the only owner who is also the last active member still leaves', async ({
  request, adminApi,
}) => {
  const dealer = await createDealership(adminApi, 'E2E Roles Dealer');
  const owner = await bindOwner(request, adminApi, dealer.id);

  // Nobody is left behind, so the rule does not apply: the dealership empties instead of
  // keeping an owner who wants out.
  await expectStatus(await adminApi.delete(`/api/v1/admin/dealers/${dealer.id}/members/${owner.username}`), 204);
  expect((await meOf(owner.api)).dealerId ?? null).toBeNull();

  // An empty dealership bootstraps its next owner directly again.
  const next = await bindOwner(request, adminApi, dealer.id, 'e2e.owner2');
  expect((await meOf(next.api)).dealerRole).toBe('OWNER');

  // The same holds for the owner's own account deletion.
  const solo = await createDealership(adminApi, 'E2E Roles Dealer');
  const soloOwner = await bindOwner(request, adminApi, solo.id);
  await expectStatus(await soloOwner.api.delete('/api/v1/me'), 204);
});
