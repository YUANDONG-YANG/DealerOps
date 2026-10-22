import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { Api, apiLogin, expectStatus, uniqueSuffix } from '../../support/api';

// Manager and staff in the browser (design/21 AUTH-26, AUTH-27; design/13 /team): only a manager
// gets Team and the inbox, removes staff and edits the dealership profile; the admin promotes
// and demotes from the Staff drawer. Every test uses a throwaway dealership.

test.describe.configure({ timeout: 120_000 });
const LOAD = { timeout: 30_000 };

// Must match TOKEN_KEY in frontend/react/src/auth/login.ts.
const TOKEN_KEY = 'dealerops.accessToken';

type Dealer = { id: number; legalName: string };

async function createDealer(adminApi: Api) {
  const id = uniqueSuffix();
  const res = await adminApi.post('/api/v1/admin/dealers', {
    legalName: `E2E Team Dealer ${id}`,
    contactPhone: '403-555-0155',
    contactEmail: `e2e.team.${id}@example.com`,
    contactAddress: '5 Team Street, Calgary, AB',
  });
  await expectStatus(res, 201);
  return (await res.json()) as Dealer;
}

async function bindMember(request: APIRequestContext, adminApi: Api, dealer: Dealer, dealerRole: 'MANAGER' | 'STAFF') {
  const id = uniqueSuffix();
  const account = {
    username: `e2e.team.${id}`, displayName: `E2E Team ${id}`, email: `e2e.team.${id}@example.com`,
    password: 'e2e-team-pass-1',
  };
  await expectStatus(await adminApi.post(`/api/v1/admin/dealers/${dealer.id}/members`, account), 201);
  await expectStatus(await adminApi.put(
    `/api/v1/admin/dealers/${dealer.id}/members/${account.username}/role`, { dealerRole }), 204);
  const login = await apiLogin(request, account.username, account.password);
  return { ...account, token: login.accessToken };
}

async function signInAs(page: Page, token: string) {
  await page.addInitScript(([key, value]) => window.sessionStorage.setItem(key, value), [TOKEN_KEY, token] as const);
}

test('AUTH-27: staff see the inbox but no Team menu, and /team sends them to DMS', async ({ page, request, adminApi }) => {
  const dealer = await createDealer(adminApi);
  const staff = await bindMember(request, adminApi, dealer, 'STAFF');
  await signInAs(page, staff.token);

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible(LOAD);
  await expect(page.locator('.header-role')).toHaveText('Staff');
  await expect(page.locator('.side-menu').getByRole('link', { name: 'Team' })).toHaveCount(0);
  await expect(page.locator('.inbox-bell')).toHaveCount(1);

  await page.goto('/team');
  await expect(page).toHaveURL(/\/dms$/);
  await expect(page.getByRole('heading', { name: 'DMS', exact: true })).toBeVisible();
});

test('AUTH-27: a manager sees roles on Team and removes a staff member but not a manager', async ({
  page, request, adminApi,
}) => {
  const dealer = await createDealer(adminApi);
  const manager = await bindMember(request, adminApi, dealer, 'MANAGER');
  const staff = await bindMember(request, adminApi, dealer, 'STAFF');
  await signInAs(page, manager.token);

  await page.goto('/dms');
  await expect(page.locator('.header-role')).toHaveText('Manager');
  await expect(page.locator('.inbox-bell')).toBeVisible(LOAD);
  await page.locator('.side-menu').getByRole('link', { name: 'Team' }).click();
  await expect(page.getByRole('heading', { name: 'Team', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Members', exact: true }).click();

  const managerRow = page.getByRole('row').filter({ hasText: manager.username });
  const staffRow = page.getByRole('row').filter({ hasText: staff.username });
  await expect(managerRow).toContainText('Manager');
  await expect(managerRow.getByRole('button', { name: 'Remove' })).toHaveCount(0);
  await expect(staffRow).toContainText('Staff');

  await staffRow.getByRole('button', { name: 'Remove' }).click();
  await page.locator('.dialog').getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(staffRow).toHaveCount(0, LOAD);
  await expect(managerRow).toBeVisible();
});

test('AUTH-27: a manager edits the dealership profile and the header shows the new name', async ({
  page, request, adminApi,
}) => {
  const dealer = await createDealer(adminApi);
  const manager = await bindMember(request, adminApi, dealer, 'MANAGER');
  await signInAs(page, manager.token);

  await page.goto('/team');
  await page.getByRole('button', { name: 'Dealership profile', exact: true }).click();
  const name = page.getByLabel('Legal name');
  await expect(name).toHaveValue(dealer.legalName, LOAD);

  await page.getByLabel('Contact email').fill('not-an-email');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.locator('.form-error')).not.toHaveCount(0, LOAD);

  const renamed = `${dealer.legalName} Renamed`;
  await name.fill(renamed);
  await page.getByLabel('Contact email').fill('renamed.dealer@example.com');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Dealership profile saved.' })).toBeVisible(LOAD);
  await expect(page.locator('.dealer-chip')).toContainText(renamed);
});

test('AUTH-26: the admin promotes staff to manager and demotes them from the Staff dialog', async ({
  adminPage: page, request, adminApi,
}) => {
  const dealer = await createDealer(adminApi);
  const member = await bindMember(request, adminApi, dealer, 'STAFF');

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible(LOAD);
  await page.getByPlaceholder('Dealership name').fill(dealer.legalName);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('row').filter({ hasText: dealer.legalName }).getByRole('button', { name: 'Staff', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: `Staff · ${dealer.legalName}` });
  const row = drawer.locator('tbody tr').filter({ hasText: member.username });
  await expect(row).toContainText('Staff', LOAD);

  await row.getByRole('button', { name: 'Make manager' }).click();
  await expect(row.getByRole('button', { name: 'Make staff' })).toBeVisible(LOAD);
  await expect(row).toContainText('Manager');
  const api = new Api(request, member.token);
  expect(((await (await api.get('/api/v1/me')).json()) as { dealerRole: string }).dealerRole).toBe('MANAGER');

  await row.getByRole('button', { name: 'Make staff' }).click();
  await expect(row.getByRole('button', { name: 'Make manager' })).toBeVisible(LOAD);
  expect(((await (await api.get('/api/v1/me')).json()) as { dealerRole: string }).dealerRole).toBe('STAFF');
});
