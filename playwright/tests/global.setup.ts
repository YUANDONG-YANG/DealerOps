import { test as setup, expect } from '@playwright/test';
import { apiLogin, authHeaders } from '../support/api';
import { env } from '../support/env';

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

    for (const account of staff) {
      const bind = await request.post(`${env.gatewayUrl}/api/v1/admin/dealers/${dealerId}/members`, {
        headers,
        data: account,
      });
      // 409 DUP_MEMBER means the staff account is already an active member.
      expect([201, 409], await bind.text()).toContain(bind.status());

      const login = await apiLogin(request, account.username, account.password);
      expect(login.role).toBe('Dealer.User');
    }
  }
});
