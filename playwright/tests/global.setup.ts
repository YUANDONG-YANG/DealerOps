import { test as setup, expect, type APIRequestContext } from '@playwright/test';
import { apiLogin, authHeaders } from '../support/api';
import { env, type Account, type DealerRole } from '../support/env';

type Headers = Record<string, string>;

/**
 * Puts one account on the dealership at the wanted tier (CR role hierarchy, 2026-11-03).
 *
 * The platform admin binds the first owner of an ownerless dealership directly (201). Once the
 * dealership has an owner the same call only files a join request (202), which the owner approves
 * before the admin can set the member's tier. 409 DUP_MEMBER means the login is already active
 * there, so only the role is (re)applied.
 */
async function seedMember(
  request: APIRequestContext, headers: Headers, dealerId: number, account: Account, owner: Account,
) {
  const { dealerRole, ...body } = account;
  const role: DealerRole = dealerRole ?? 'SALES';

  const bind = await request.post(`${env.gatewayUrl}/api/v1/admin/dealers/${dealerId}/members`, {
    headers, data: body,
  });
  expect([201, 202, 409], await bind.text()).toContain(bind.status());

  if (bind.status() === 202) {
    // The dealership already has an owner, so the admin's call filed a join request instead;
    // the owner approves it and the applicant joins as a sales member.
    const ownerLogin = await apiLogin(request, owner.username, owner.password);
    const approve = await request.post(
      `${env.gatewayUrl}/api/v1/dealer/join-requests/${encodeURIComponent(body.username)}/approve`,
      { headers: authHeaders(ownerLogin.accessToken) },
    );
    expect(approve.status(), await approve.text()).toBe(204);
  }

  const applied = await request.put(
    `${env.gatewayUrl}/api/v1/admin/dealers/${dealerId}/members/${encodeURIComponent(body.username)}/role`,
    { headers, data: { dealerRole: role } },
  );
  expect(applied.status(), await applied.text()).toBe(204);

  const login = await apiLogin(request, body.username, body.password);
  expect(login.role).toBe('Dealer.User');

  const me = await request.get(`${env.gatewayUrl}/api/v1/me`, { headers: authHeaders(login.accessToken) });
  expect(me.status()).toBe(200);
  expect(((await me.json()) as { dealerRole: string }).dealerRole, `${body.username} tier`).toBe(role);
}

// Idempotently prepares the dealerships and staff accounts the specs sign in with.
setup('seed e2e dealerships and staff', async ({ request }) => {
  setup.skip(!env.isLocal && !env.allowRemoteSeed, 'Remote target: set E2E_ALLOW_REMOTE_SEED=1 to seed data');

  const health = await request.get(`${env.gatewayUrl}/actuator/health`);
  expect(health.ok(), 'gateway is not reachable; start the backend with ../start-local.sh').toBeTruthy();

  const admin = await apiLogin(request, env.admin.identifier, env.admin.password);
  expect(admin.role).toBe('Platform.Admin');
  const headers = authHeaders(admin.accessToken);

  for (const { staff, ...profile } of env.dealers) {
    const list = await request.get(`${env.gatewayUrl}/api/v1/admin/dealers`, {
      headers,
      params: { q: profile.legalName, size: 10 },
    });
    expect(list.status()).toBe(200);
    const { items } = (await list.json()) as { items: { id: number; legalName: string }[] };
    let dealerId = items.find((d) => d.legalName === profile.legalName)?.id;

    if (dealerId == null) {
      const created = await request.post(`${env.gatewayUrl}/api/v1/admin/dealers`, { headers, data: profile });
      expect(created.status(), await created.text()).toBe(201);
      dealerId = ((await created.json()) as { id: number }).id;
    }

    // The owner is the first account of each dealership and is seeded before the rest, because
    // every later account needs an owner to approve its join request.
    const owner = staff[0];
    expect(owner.dealerRole, `${profile.legalName} lists its owner first`).toBe('OWNER');
    for (const account of staff) await seedMember(request, headers, dealerId, account, owner);
  }
});
