import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { Api, apiLogin, expectStatus, uniqueSuffix } from '../../support/api';
import { env } from '../../support/env';

// Admin member management on /admin (UI-12, UI-13, AUTH-03/04/05/14, AUTH-16 pending binding).
// Every test works on its own throwaway dealership and accounts; the seeded e2e.* staff are
// never bound, unbound or reused here.

type Dealer = { id: number; legalName: string };

const TEMP_PASSWORD = 'e2e-temp-pass-1';

// The Members tab and the pending-account picker page through every dealership (and, for the
// Members tab, every dealership's members) one request at a time, so they are slow on a busy
// shared backend.
const SLOW = { timeout: 120_000 };

// Offset paging through the dealership list while parallel tests create dealerships yields the same
// dealership twice, which React reports as a duplicate key (reported as an app defect).
const DUPLICATE_KEY = /Encountered two children with the same key/;

async function createDealer(adminApi: Api): Promise<Dealer> {
  const id = uniqueSuffix();
  const res = await adminApi.post('/api/v1/admin/dealers', {
    legalName: `E2E Admin Dealer ${id}`,
    contactPhone: '403-555-0177',
    contactEmail: `e2e.admin.dealer.${id}@example.com`,
    contactAddress: '3 Admin Way, Calgary, AB',
  });
  await expectStatus(res, 201);
  return (await res.json()) as Dealer;
}

function newStaff() {
  const id = uniqueSuffix();
  return {
    username: `e2e.adm.${id}`,
    displayName: `E2E Admin Bound ${id}`,
    email: `e2e.adm.${id}@example.com`,
    password: TEMP_PASSWORD,
  };
}

/** Opens /admin, filters the dealership list to `dealer` and opens its Staff drawer. */
async function openStaffDrawer(page: Page, dealer: Dealer) {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByPlaceholder('Dealership name').fill(dealer.legalName);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: dealer.legalName });
  await expect(row).toHaveCount(1, { timeout: 30_000 });
  await row.getByRole('button', { name: 'Staff', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: `Staff · ${dealer.legalName}` });
  await expect(drawer).toBeVisible();
  return drawer;
}

function field(scope: Locator, label: string) {
  return scope.locator('.form-item', { has: scope.page().getByText(label, { exact: true }) }).locator('input');
}

async function fillBindForm(drawer: Locator, staff: { username: string; displayName: string; password: string; email: string }) {
  await field(drawer, 'Username').fill(staff.username);
  await field(drawer, 'Display name').fill(staff.displayName);
  await field(drawer, 'Temporary password').fill(staff.password);
  await field(drawer, 'Login email').fill(staff.email);
}

function memberRow(drawer: Locator, username: string) {
  return drawer.locator('tbody tr').filter({ has: drawer.page().getByRole('cell', { name: username, exact: true }) });
}

async function register(request: APIRequestContext) {
  const id = uniqueSuffix();
  const body = {
    username: `e2e.self.${id}`,
    displayName: `E2E Self Signup ${id}`,
    email: `e2e.self.${id}@example.com`,
    password: 'e2e-self-pass-1',
  };
  const res = await request.post(`${env.gatewayUrl}/api/v1/auth/register`, { data: body });
  await expectStatus(res, 201);
  return body;
}

test.describe('admin member management', () => {
  test.describe.configure({ timeout: 240_000 });

  test('UI-12 AUTH-03 AUTH-04 AUTH-05: bind a new staff, list it, unbind with confirmation and access ends', async ({
    adminPage: page, adminApi, request,
  }) => {
    const dealer = await createDealer(adminApi);
    const staff = newStaff();

    // AUTH-03: create and bind through the drawer.
    const drawer = await openStaffDrawer(page, dealer);
    await fillBindForm(drawer, staff);
    await drawer.getByRole('button', { name: 'Create and bind' }).click();

    // AUTH-04: the new login is listed for this dealership, active.
    const row = memberRow(drawer, staff.username);
    await expect(row).toBeVisible();
    await expect(row).toContainText(staff.displayName);
    await expect(row).toContainText('Active');
    await expect(field(drawer, 'Username')).toHaveValue('');

    // The admin API agrees, and the Members tab lists the login under this dealership.
    const list = await adminApi.get(`/api/v1/admin/dealers/${dealer.id}/members`, { q: staff.username });
    await expectStatus(list, 200);
    expect(((await list.json()) as { items: { username: string; active: boolean }[] }).items)
      .toContainEqual(expect.objectContaining({ username: staff.username, active: true }));

    // The new staff signs in with the temporary password (by username and by email) and has business access.
    const login = await apiLogin(request, staff.username, staff.password);
    expect(login.role).toBe('Dealer.User');
    await apiLogin(request, staff.email, staff.password);
    const staffApi = new Api(request, login.accessToken);
    await expectStatus(await staffApi.get('/api/v1/vehicles'), 200);

    // UI-12: unbind asks for confirmation; Cancel keeps the binding.
    await row.getByRole('button', { name: 'Unbind' }).click();
    const dialog = page.locator('.dialog').filter({ hasText: 'Unbind staff' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('They lose access to its data right away');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toContainText('Active');
    await expect(row.getByRole('button', { name: 'Unbind' })).toBeVisible();
    await expectStatus(await staffApi.get('/api/v1/vehicles'), 200);

    // Confirm removes the binding (soft unbind: the row stays, inactive).
    await row.getByRole('button', { name: 'Unbind' }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Unbind', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toContainText('Inactive');
    await expect(row.getByRole('button', { name: 'Unbind' })).toHaveCount(0);

    // AUTH-05: business access ends immediately, even for the token issued before the unbind.
    await expectStatus(await staffApi.get('/api/v1/vehicles'), 403);
    // The account itself is kept: the user can still sign in, but business APIs are forbidden.
    const again = await apiLogin(request, staff.username, staff.password);
    const after = new Api(request, again.accessToken);
    await expectStatus(await after.get('/api/v1/vehicles'), 403);
    await expectStatus(await after.get('/api/v1/me'), 200);
  });

  test('AUTH-04: the Members tab lists a newly bound login with its dealership', async ({
    adminPage: page, adminApi, allowBrowserErrors,
  }) => {
    allowBrowserErrors(DUPLICATE_KEY);
    const dealer = await createDealer(adminApi);
    const staff = newStaff();
    await expectStatus(await adminApi.post(`/api/v1/admin/dealers/${dealer.id}/members`, staff), 201);

    await page.goto('/admin');
    await page.getByRole('button', { name: 'Members', exact: true }).click();
    await page.getByPlaceholder('Username').fill(staff.username);
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    const row = page.getByRole('row').filter({ hasText: staff.username });
    await expect(row).toHaveCount(1, SLOW);
    await expect(row).toContainText(dealer.legalName);
    await expect(row).toContainText('Active');
  });

  test('AUTH-14: binding a duplicate shows the DUP_MEMBER error', async ({ adminPage: page, adminApi }) => {
    const dealer = await createDealer(adminApi);
    const other = await createDealer(adminApi);
    const staff = newStaff();
    await expectStatus(await adminApi.post(`/api/v1/admin/dealers/${dealer.id}/members`, staff), 201);

    // Same username again at the same dealership.
    let drawer = await openStaffDrawer(page, dealer);
    await expect(memberRow(drawer, staff.username)).toBeVisible();
    await fillBindForm(drawer, staff);
    await drawer.getByRole('button', { name: 'Create and bind' }).click();
    await expect(drawer.locator('.danger-text')).toHaveText('Staff already bound');
    await expect(drawer.locator('tbody tr').filter({ hasText: staff.username })).toHaveCount(1);

    // Still active at another dealership: one login belongs to one dealership.
    await drawer.getByRole('button', { name: 'Close' }).click();
    drawer = await openStaffDrawer(page, other);
    await fillBindForm(drawer, staff);
    await drawer.getByRole('button', { name: 'Create and bind' }).click();
    await expect(drawer.locator('.danger-text')).toHaveText('Staff already bound');
    await expect(memberRow(drawer, staff.username)).toHaveCount(0);

    // The admin's own username is never bound or demoted.
    await fillBindForm(drawer, { ...newStaff(), username: env.admin.identifier });
    await drawer.getByRole('button', { name: 'Create and bind' }).click();
    await expect(drawer.locator('.danger-text')).toHaveText('Staff already bound');
    await expect(memberRow(drawer, env.admin.identifier)).toHaveCount(0);
  });

  test('AUTH-03: a new login whose email is already registered shows the field error', async ({
    adminPage: page, adminApi,
  }) => {
    const dealer = await createDealer(adminApi);
    const first = newStaff();
    await expectStatus(await adminApi.post(`/api/v1/admin/dealers/${dealer.id}/members`, first), 201);

    const drawer = await openStaffDrawer(page, dealer);
    const second = { ...newStaff(), email: first.email };
    await fillBindForm(drawer, second);
    await drawer.getByRole('button', { name: 'Create and bind' }).click();
    const emailItem = drawer.locator('.form-item', { has: page.getByText('Login email', { exact: true }) });
    await expect(emailItem.locator('.form-error')).toHaveText('That email address is already registered.');
    await expect(memberRow(drawer, second.username)).toHaveCount(0);
  });

  test('AUTH-03: a temporary password shorter than 8 characters is rejected', async ({ adminPage: page, adminApi }) => {
    const dealer = await createDealer(adminApi);
    const staff = { ...newStaff(), password: 'short7c' };
    const drawer = await openStaffDrawer(page, dealer);
    await fillBindForm(drawer, staff);
    await drawer.getByRole('button', { name: 'Create and bind' }).click();
    await expect(drawer.locator('.form-error, .danger-text').first()).toBeVisible();
    await expect(memberRow(drawer, staff.username)).toHaveCount(0);
    const list = await adminApi.get(`/api/v1/admin/dealers/${dealer.id}/members`, { q: staff.username });
    expect(((await list.json()) as { totalElements: number }).totalElements).toBe(0);
  });

  test('AUTH-16 UI-12: the Pending accounts section binds a self-registered user without a password', async ({
    adminPage: page, adminApi, request, allowBrowserErrors,
  }) => {
    allowBrowserErrors(DUPLICATE_KEY);
    const dealer = await createDealer(adminApi);
    const self = await register(request);

    // Before binding the self sign-up has no business access.
    const before = await Api.as(request, self.username, self.password);
    await expectStatus(await before.get('/api/v1/vehicles'), 403);

    await page.goto('/admin');
    await page.getByRole('button', { name: 'Members', exact: true }).click();
    await expect(page.getByText('Pending self-registered accounts')).toBeVisible();
    const pendingRow = page.locator('tbody tr').filter({ has: page.getByRole('cell', { name: self.username, exact: true }) });
    await expect(pendingRow).toBeVisible(SLOW);
    await expect(pendingRow).toContainText(self.displayName);
    await expect(pendingRow).toContainText(self.email);

    // Binding needs a dealership.
    await pendingRow.getByRole('button', { name: 'Bind without password' }).click();
    await expect(page.locator('.danger-text')).toHaveText('Select a dealership');

    await expect(pendingRow.getByRole('option', { name: dealer.legalName, exact: true })).not.toHaveCount(0, SLOW);
    await pendingRow.getByRole('combobox').selectOption({ label: dealer.legalName });
    await pendingRow.getByRole('button', { name: 'Bind without password' }).click();
    await expect(pendingRow).toHaveCount(0);

    const list = await adminApi.get(`/api/v1/admin/dealers/${dealer.id}/members`, { q: self.username });
    await expectStatus(list, 200);
    expect(((await list.json()) as { items: { username: string; active: boolean }[] }).items)
      .toContainEqual(expect.objectContaining({ username: self.username, active: true }));

    // The user keeps their own password and now has business access.
    const after = await Api.as(request, self.username, self.password);
    await expectStatus(await after.get('/api/v1/vehicles'), 200);
  });

  test('UI-12: the Staff drawer lists pending accounts and binds one to that dealership', async ({
    adminPage: page, adminApi, request,
  }) => {
    const dealer = await createDealer(adminApi);
    const self = await register(request);

    const drawer = await openStaffDrawer(page, dealer);
    const pendingRow = drawer.locator('tbody tr').filter({ hasText: self.email });
    await expect(pendingRow).toBeVisible();
    // Inside a dealership's drawer there is no dealership picker.
    await expect(pendingRow.getByRole('combobox')).toHaveCount(0);
    await pendingRow.getByRole('button', { name: 'Bind without password' }).click();
    await expect(pendingRow).toHaveCount(0);

    const row = memberRow(drawer, self.username);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Active');
  });

  test('UI-13: the admin page shows no DMS, CRM or ad entry points', async ({ adminPage: page, allowBrowserErrors }) => {
    allowBrowserErrors(DUPLICATE_KEY);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible({ timeout: 30_000 });
    const menu = page.locator('.side-menu');
    await expect(menu.getByRole('link')).toHaveText(['Admin']);
    for (const path of ['/dms', '/crm', '/leads', '/ads', '/team']) {
      await expect(page.locator(`a[href="${path}"]`)).toHaveCount(0);
    }
    for (const name of [/^DMS$/, /^CRM$/, /ad compliance/i, /vehicle/i, /customer/i, /^leads$/i]) {
      await expect(page.getByRole('link', { name })).toHaveCount(0);
      await expect(page.getByRole('button', { name })).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Members', exact: true }).click();
    await expect(menu.getByRole('link')).toHaveText(['Admin']);
    for (const name of [/^DMS$/, /^CRM$/, /ad compliance/i, /vehicle/i, /customer/i]) {
      await expect(page.getByRole('link', { name })).toHaveCount(0);
      await expect(page.getByRole('button', { name })).toHaveCount(0);
    }
  });
});
