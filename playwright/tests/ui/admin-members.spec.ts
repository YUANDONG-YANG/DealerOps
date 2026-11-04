import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { Api, apiLogin, bindOwner, expectStatus, uniqueSuffix } from '../../support/api';
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
  await field(drawer, 'Full name').fill(staff.displayName);
  await field(drawer, 'Temporary password').fill(staff.password);
  await field(drawer, 'Login email').fill(staff.email);
}

/**
 * The bind error under the drawer's form. The drawer also carries the owner-bootstrap line, which
 * is `danger-text` while the dealership has no owner, so the error is matched as the last one.
 */
function bindError(drawer: Locator) {
  return drawer.locator('.danger-text').last();
}

function memberRow(drawer: Locator, username: string) {
  // The account cell stacks username, display name and sign-in method; match the username line.
  return drawer.locator('tbody tr').filter({ has: drawer.page().getByText(username, { exact: true }) });
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

/** True for a pending-accounts query of page `index` ordered by Registered in `dir`. */
function isPendingQuery(url: string, index: number, dir: 'asc' | 'desc') {
  if (!url.includes('/api/v1/admin/pending-users')) return false;
  const params = new URL(url).searchParams;
  return params.get('page') === String(index) && params.get('sort') === `createdAt,${dir}`;
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
    // The DUP_MEMBER message names the dealership where the login is already active.
    await expect(bindError(drawer)).toContainText(`already active staff at ${dealer.legalName}`);
    await expect(drawer.locator('tbody tr').filter({ hasText: staff.username })).toHaveCount(1);

    // Still active at another dealership: one login belongs to one dealership.
    await drawer.getByRole('button', { name: 'Close' }).click();
    drawer = await openStaffDrawer(page, other);
    await fillBindForm(drawer, staff);
    await drawer.getByRole('button', { name: 'Create and bind' }).click();
    await expect(bindError(drawer)).toContainText(`already active staff at ${dealer.legalName}`);
    await expect(bindError(drawer)).toContainText('only one dealership');
    await expect(memberRow(drawer, staff.username)).toHaveCount(0);

    // The admin's own username is never bound or demoted.
    await fillBindForm(drawer, { ...newStaff(), username: env.admin.identifier });
    await drawer.getByRole('button', { name: 'Create and bind' }).click();
    await expect(bindError(drawer)).toContainText('platform admin account');
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
    // The error belongs to the password field, not to the drawer's owner-bootstrap line.
    const passwordItem = drawer.locator('.form-item', { has: page.getByText('Temporary password', { exact: true }) });
    await expect(passwordItem.locator('.form-error')).not.toHaveCount(0);
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
    await page.getByRole('button', { name: 'Pending accounts', exact: true }).click();
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
    // One table at a time: pending accounts sit behind their own tab in the drawer.
    await drawer.getByRole('button', { name: 'Pending accounts', exact: true }).click();
    const pendingRow = drawer.locator('tbody tr').filter({ hasText: self.email });
    await expect(pendingRow).toBeVisible();
    // Inside a dealership's drawer there is no dealership picker.
    await expect(pendingRow.getByRole('combobox')).toHaveCount(0);
    await pendingRow.getByRole('button', { name: 'Bind without password' }).click();
    await expect(pendingRow.getByRole('button', { name: 'Bind without password' })).toHaveCount(0);

    await drawer.getByRole('button', { name: 'Staff', exact: true }).click();
    const row = memberRow(drawer, self.username);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Active');
  });

  test('ROLE / the Staff drawer binds the first owner, then files a join request', async ({
    adminPage: page, adminApi, request,
  }) => {
    const dealer = await createDealer(adminApi);
    const first = newStaff();
    const second = newStaff();

    // No owner yet: the drawer says so, and the account is bound directly as the owner.
    const drawer = await openStaffDrawer(page, dealer);
    await expect(drawer.getByText('This dealership has no owner yet. The next account you add here is bound directly as its owner.')).toBeVisible();
    await fillBindForm(drawer, first);
    await drawer.getByRole('button', { name: 'Create and bind' }).click();
    await expect(drawer.locator('.success-text')).toContainText(`${first.username} is bound as the dealership's owner.`);
    const ownerRow = memberRow(drawer, first.username);
    await expect(ownerRow).toContainText('Owner');
    await expect(ownerRow).toContainText('Active');

    // With an owner in place the same form only files a join request; nothing is bound.
    await expect(drawer.getByText('This dealership has an owner, so the next account you add here is filed as a join request.')).toBeVisible();
    await fillBindForm(drawer, second);
    await drawer.getByRole('button', { name: 'Create and bind' }).click();
    await expect(drawer.locator('.success-text'))
      .toContainText('Join request sent to the dealership. The owner approves it in Team > Join Requests.');
    await expect(memberRow(drawer, second.username)).toHaveCount(0);

    const list = await adminApi.get(`/api/v1/admin/dealers/${dealer.id}/members`);
    const items = ((await list.json()) as { items: { username: string; dealerRole: string }[] }).items;
    expect(items.map((m) => m.username)).toEqual([first.username]);
    expect(items[0].dealerRole).toBe('OWNER');

    // The applicant can sign in but has no business access until the owner approves.
    const applicant = await Api.as(request, second.username, second.password);
    await expectStatus(await applicant.get('/api/v1/vehicles'), 403);
    const owner = await Api.as(request, first.username, first.password);
    await expectStatus(await owner.post(`/api/v1/dealer/join-requests/${second.username}/approve`), 204);
    await expectStatus(await (await Api.as(request, second.username, second.password)).get('/api/v1/vehicles'), 200);
  });

  test('UI-12: leaving the Staff drawer with a half-filled form asks before discarding it', async ({
    adminPage: page, adminApi,
  }) => {
    const dealer = await createDealer(adminApi);
    const drawer = await openStaffDrawer(page, dealer);
    await field(drawer, 'Username').fill(newStaff().username);

    await drawer.getByRole('button', { name: 'Close' }).click();
    const discard = page.locator('.dialog').filter({ hasText: 'Unsaved changes' });
    await expect(discard).toBeVisible();
    await discard.getByRole('button', { name: 'Cancel' }).click();
    await expect(drawer).toBeVisible();

    await drawer.getByRole('button', { name: 'Close' }).click();
    await discard.getByRole('button', { name: 'Discard' }).click();
    await expect(drawer).toHaveCount(0);
  });

  test('AUTH-28: the admin edits and deletes a pending account', async ({
    adminPage: page, adminApi, request, allowBrowserErrors,
  }) => {
    allowBrowserErrors(DUPLICATE_KEY);
    const self = await register(request);
    const nextEmail = `e2e.renamed.${uniqueSuffix()}@example.com`;

    await page.goto('/admin');
    await page.getByRole('button', { name: 'Pending accounts', exact: true }).click();
    const row = page.locator('tbody tr').filter({ has: page.getByRole('cell', { name: self.username, exact: true }) });
    await expect(row).toBeVisible(SLOW);

    await row.getByRole('button', { name: 'Edit' }).click();
    const edit = page.locator('.dialog').filter({ hasText: `Edit pending account ${self.username}` });
    await edit.getByLabel('Login email').fill(nextEmail);
    await edit.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(`${self.username} updated.`)).toBeVisible();
    await expect(row).toContainText(nextEmail);
    // The edited email is the sign-in name now.
    await apiLogin(request, nextEmail, self.password);

    await row.getByRole('button', { name: 'Delete' }).click();
    const remove = page.locator('.dialog').filter({ hasText: 'Delete pending account' });
    await expect(remove).toContainText(self.username);
    await remove.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText(`${self.username} deleted.`)).toBeVisible(SLOW);
    await expect(row).toHaveCount(0);

    const pending = await adminApi.get('/api/v1/admin/pending-users', { q: self.username });
    expect(((await pending.json()) as { totalElements: number }).totalElements).toBe(0);
  });

  test('CR-018: the pending-accounts queue sorts on the server', async ({
    adminPage: page, request, allowBrowserErrors,
  }) => {
    allowBrowserErrors(DUPLICATE_KEY);
    await register(request);
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Pending accounts', exact: true }).click();
    const header = page.getByRole('button', { name: 'Registered' });
    await expect(header).toBeVisible(SLOW);

    // The whole queue is sorted by the server, not just the page on screen.
    const ascending = page.waitForRequest((r) => r.url().includes('sort=createdAt%2Casc') || r.url().includes('sort=createdAt,asc'));
    await header.click();
    await ascending;
    await expect(header).toHaveAttribute('data-sort', 'asc');

    const descending = page.waitForRequest((r) => r.url().includes('sort=createdAt%2Cdesc') || r.url().includes('sort=createdAt,desc'));
    await header.click();
    await descending;
    await expect(header).toHaveAttribute('data-sort', 'desc');
  });

  test('A6: the Members tab edits a member\'s contact, sorts by role and deletes the account', async ({
    adminPage: page, adminApi, request, allowBrowserErrors,
  }) => {
    allowBrowserErrors(DUPLICATE_KEY);
    const dealer = await createDealer(adminApi);
    const staff = newStaff();
    await expectStatus(await adminApi.post(`/api/v1/admin/dealers/${dealer.id}/members`, staff), 201);
    const nextEmail = `e2e.contact.${uniqueSuffix()}@example.com`;

    await page.goto('/admin');
    await page.getByRole('button', { name: 'Members', exact: true }).click();
    await page.getByPlaceholder('Username, name, email or phone').fill(staff.username);
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    const row = page.getByRole('row').filter({ hasText: staff.username });
    await expect(row).toHaveCount(1, SLOW);
    await expect(row).toContainText('Owner');

    // The Role column sorts the whole member list, not only the page on screen.
    const roleHeader = page.getByRole('button', { name: 'Role', exact: true });
    await roleHeader.click();
    await expect(roleHeader).toHaveAttribute('data-sort', 'asc');

    await row.getByRole('button', { name: 'Edit contact' }).click();
    const contact = page.locator('.dialog').filter({ hasText: `Edit contact for ${staff.username}` });
    await contact.getByLabel('Login email').fill(nextEmail);
    await contact.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(`Contact details for ${staff.username} were saved.`)).toBeVisible(SLOW);
    await apiLogin(request, nextEmail, staff.password);

    // Deleting the account needs the username typed and ends the sign-in.
    await row.getByRole('button', { name: 'Delete account' }).click();
    const remove = page.locator('.dialog').filter({ hasText: `Delete account ${staff.username}` });
    const confirm = remove.getByRole('button', { name: 'Delete account' });
    await expect(confirm).toBeDisabled();
    await remove.getByLabel('Type the username to confirm').fill(staff.username);
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page.getByText(`The account ${staff.username} was deleted.`)).toBeVisible(SLOW);

    const signIn = await request.post(`${env.gatewayUrl}/api/v1/auth/login`,
      { data: { identifier: staff.username, password: staff.password } });
    expect(signIn.status()).toBe(401);
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
  test('ROLE / the Staff drawer states the owner outcome only once the member list has loaded', async ({
    adminPage: page, adminApi, request,
  }) => {
    const dealer = await createDealer(adminApi);
    const owner = await bindOwner(request, adminApi, dealer.id);

    // Hold the drawer's member list so the loading window is long enough to look at. Until it
    // lands the drawer knows neither outcome, so it must claim neither.
    await page.route(/\/api\/v1\/admin\/dealers\/\d+\/members(\?|$)/, async (route) => {
      await new Promise((done) => setTimeout(done, 3_000));
      await route.continue();
    });

    const drawer = await openStaffDrawer(page, dealer);
    await expect(drawer.getByText('This dealership has no owner yet.', { exact: false })).toHaveCount(0);
    await expect(drawer.getByText('This dealership has an owner,', { exact: false })).toHaveCount(0);

    // Once the list lands the drawer states the true outcome: this dealership already has an owner.
    await expect(drawer.getByText(
      'This dealership has an owner, so the next account you add here is filed as a join request.',
    )).toBeVisible(SLOW);
    await expect(memberRow(drawer, owner.username)).toContainText('Owner');
  });

  test('CR-018: the pending queue keeps its sort and page across a delete', async ({
    adminPage: page, request, allowBrowserErrors,
  }) => {
    allowBrowserErrors(DUPLICATE_KEY);
    const mine = await register(request);

    await page.goto('/admin');
    await page.getByRole('button', { name: 'Pending accounts', exact: true }).click();
    const header = page.getByRole('button', { name: 'Registered' });
    await expect(header).toBeVisible(SLOW);

    // Newest first, so the account just registered is on the first page.
    await header.click();
    await expect(header).toHaveAttribute('data-sort', 'asc');
    await header.click();
    await expect(header).toHaveAttribute('data-sort', 'desc');
    const row = page.locator('tbody tr').filter({ has: page.getByRole('cell', { name: mine.username, exact: true }) });
    await expect(row).toBeVisible(SLOW);

    // Paging asks the server for the next page in the same order, and coming back keeps it.
    const forward = page.locator('.pagination button').last();
    if (await forward.isEnabled()) {
      const second = page.waitForRequest((r) => isPendingQuery(r.url(), 1, 'desc'));
      await forward.click();
      await second;
      await expect(header).toHaveAttribute('data-sort', 'desc');
      await page.locator('.pagination button').first().click();
      await expect(row).toBeVisible(SLOW);
    }

    // A delete elsewhere in the queue refetches the same page with the same sort.
    const refetch = page.waitForRequest((r) => isPendingQuery(r.url(), 0, 'desc'));
    await row.getByRole('button', { name: 'Delete' }).click();
    const remove = page.locator('.dialog').filter({ hasText: 'Delete pending account' });
    await remove.getByRole('button', { name: 'Delete', exact: true }).click();
    await refetch;
    await expect(page.getByText(`${mine.username} deleted.`)).toBeVisible(SLOW);
    await expect(header).toHaveAttribute('data-sort', 'desc');
    await expect(row).toHaveCount(0);
  });
});
