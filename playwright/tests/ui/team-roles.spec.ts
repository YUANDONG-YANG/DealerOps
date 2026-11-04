import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import {
  Api, addMember, apiLogin, bindOwner, createDealership, expectStatus, uniqueSuffix,
} from '../../support/api';
import { env } from '../../support/env';

// The three dealership tiers in the browser (requirements/update-cr/CR-Role-Hierarchy-2026-11-03.md;
// design/21 AUTH-26..28; design/13 /team). The owner gets four Team tabs and approves join
// requests; a manager gets three and administers sales members only; a sales member has no Team at
// all. The platform admin sets any tier from the Staff drawer. Every test uses a throwaway
// dealership so the seeded E2E Motors tiers stay untouched.

test.describe.configure({ timeout: 120_000 });
const LOAD = { timeout: 30_000 };

// Must match TOKEN_KEY in frontend/react/src/auth/login.ts.
const TOKEN_KEY = 'dealerops.accessToken';

async function signInAs(page: Page, token: string) {
  await page.addInitScript(([key, value]) => window.sessionStorage.setItem(key, value), [TOKEN_KEY, token] as const);
}

function dealership(adminApi: Api) {
  return createDealership(adminApi, 'E2E Team Dealer');
}

/** A self-registered account with a pending join request at `dealerId`, for the owner to settle. */
async function applicant(request: APIRequestContext, dealerId: number) {
  const id = uniqueSuffix();
  const account = { username: `e2e.applicant.${id}`, displayName: `E2E Applicant ${id}`,
    email: `e2e.applicant.${id}@example.com`, password: 'e2e-applicant-pass-1' };
  await expectStatus(await request.post(`${env.gatewayUrl}/api/v1/auth/register`, { data: account }), 201);
  const api = new Api(request, (await apiLogin(request, account.username, account.password)).accessToken);
  await expectStatus(await api.post('/api/v1/me/join-request', { dealerId }), 200);
  return { ...account, api };
}

test('ROLE / sales: no Team menu, and /team sends them to DMS', async ({ page, request, adminApi }) => {
  const dealer = await dealership(adminApi);
  const owner = await bindOwner(request, adminApi, dealer.id);
  const sales = await addMember(request, adminApi, dealer.id, owner);
  await signInAs(page, sales.token);

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible(LOAD);
  await expect(page.locator('.header-role')).toHaveText('Sales');
  await expect(page.locator('.side-menu').getByRole('link', { name: 'Team' })).toHaveCount(0);
  // The inbox stays: a sales member still gets buyer-site inquiries, just no join requests.
  await expect(page.locator('.inbox-bell')).toHaveCount(1);

  await page.goto('/team');
  await expect(page).toHaveURL(/\/dms$/);
  await expect(page.getByRole('heading', { name: 'DMS', exact: true })).toBeVisible();
});

test('ROLE / manager: Team without the dealership profile, and no join requests', async ({
  page, request, adminApi,
}) => {
  const dealer = await dealership(adminApi);
  const owner = await bindOwner(request, adminApi, dealer.id);
  const manager = await addMember(request, adminApi, dealer.id, owner, 'MANAGER');
  const waiting = await applicant(request, dealer.id);
  await signInAs(page, manager.token);

  await page.goto('/dms');
  await expect(page.locator('.header-role')).toHaveText('Manager');
  await page.locator('.side-menu').getByRole('link', { name: 'Team' }).click();
  await expect(page.getByRole('heading', { name: 'Team', level: 1 })).toBeVisible(LOAD);

  // Two tabs: the join requests and the dealership profile belong to the owner alone, and the
  // page opens on Members rather than on a tab the manager cannot have.
  await expect(page.locator('.tab-bar').getByRole('button')).toHaveText(['Members', 'Activity']);
  await expect(page.locator('.tab-bar').getByRole('button', { name: 'Members', exact: true })).toHaveClass(/active/);
  // Join requests never reach a manager: the applicant is not listed and there is nothing to act on.
  await expect(page.getByText(waiting.username)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reject' })).toHaveCount(0);

  // The dealership audit log is open to a manager.
  await page.getByRole('button', { name: 'Activity', exact: true }).click();
  await expect(page.locator('.danger-text')).toHaveCount(0);
});

test('ROLE / manager: acts on sales members only, never on the owner or another manager', async ({
  page, request, adminApi,
}) => {
  const dealer = await dealership(adminApi);
  const owner = await bindOwner(request, adminApi, dealer.id);
  const manager = await addMember(request, adminApi, dealer.id, owner, 'MANAGER');
  const other = await addMember(request, adminApi, dealer.id, owner, 'MANAGER');
  const sales = await addMember(request, adminApi, dealer.id, owner);
  await signInAs(page, manager.token);

  await page.goto('/team');
  await page.getByRole('button', { name: 'Members', exact: true }).click();
  const ownerRow = page.getByRole('row').filter({ hasText: owner.username });
  const ownRow = page.getByRole('row').filter({ hasText: manager.username });
  const otherRow = page.getByRole('row').filter({ hasText: other.username });
  const salesRow = page.getByRole('row').filter({ hasText: sales.username });

  await expect(ownerRow).toContainText('Owner', LOAD);
  await expect(ownerRow).toContainText('Owner, set by the platform admin');
  await expect(ownerRow.getByRole('button')).toHaveCount(0);
  // The signed-in manager's own row is marked, not blocked by the tier rule.
  await expect(ownRow).toContainText('You');
  await expect(otherRow).toContainText('Owner only');
  await expect(otherRow.getByRole('button')).toHaveCount(0);
  await expect(salesRow).toContainText('Sales');

  // Promoting a sales member to manager is the manager's one appointment power.
  await salesRow.getByRole('button', { name: 'Make manager' }).click();
  await page.locator('.dialog').getByRole('button', { name: 'Make manager' }).click();
  await expect(salesRow).toContainText('Manager', LOAD);
  await expect(salesRow).toContainText('Owner only');
  const api = new Api(request, sales.token);
  expect(((await (await api.get('/api/v1/me')).json()) as { dealerRole: string }).dealerRole).toBe('MANAGER');
});

test('ROLE / owner: four tabs, approves a join request and appoints a manager, then a sales member', async ({
  page, request, adminApi,
}) => {
  const dealer = await dealership(adminApi);
  const owner = await bindOwner(request, adminApi, dealer.id);
  const waiting = await applicant(request, dealer.id);
  await signInAs(page, owner.token);

  await page.goto('/team');
  await expect(page.getByRole('heading', { name: 'Team', level: 1 })).toBeVisible(LOAD);
  await expect(page.locator('.header-role')).toHaveText('Owner');
  await expect(page.locator('.tab-bar').getByRole('button'))
    .toHaveText(['Join requests', 'Members', 'Dealership profile', 'Activity']);
  // The owner is the tier that settles them, so their Team page opens on Join requests.
  await expect(page.locator('.tab-bar').getByRole('button', { name: 'Join requests' })).toHaveClass(/active/);

  // The owner is the only tier that settles join requests; the approved member joins as sales.
  const requestRow = page.getByRole('row').filter({ hasText: waiting.username });
  await expect(requestRow).toBeVisible(LOAD);
  await requestRow.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByRole('table', { name: 'Join request history' })
    .getByRole('row').filter({ hasText: waiting.username })).toContainText('Approved', LOAD);

  await page.getByRole('button', { name: 'Members', exact: true }).click();
  const memberRow = page.getByRole('row').filter({ hasText: waiting.username });
  await expect(memberRow).toContainText('Sales', LOAD);

  // Appoint, then demote: both directions are the owner's.
  await memberRow.getByRole('button', { name: 'Make manager' }).click();
  await page.locator('.dialog').getByRole('button', { name: 'Make manager' }).click();
  await expect(memberRow).toContainText('Manager', LOAD);
  await memberRow.getByRole('button', { name: 'Make sales' }).click();
  await page.locator('.dialog').getByRole('button', { name: 'Make sales' }).click();
  await expect(memberRow).toContainText('Sales', LOAD);

  // Editing a member's full name is the owner's edit scope.
  await memberRow.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Full name').fill('Renamed By Owner');
  await page.getByRole('button', { name: 'Save member' }).click();
  await expect(page.getByRole('row').filter({ hasText: waiting.username })).toContainText('Renamed By Owner', LOAD);

  // And removing them.
  await page.getByRole('row').filter({ hasText: waiting.username }).getByRole('button', { name: 'Remove' }).click();
  await page.locator('.dialog').getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: waiting.username })).toHaveCount(0, LOAD);
  await expect(page.getByRole('row').filter({ hasText: owner.username })).toContainText('You');
});

test('AUTH-27: the owner edits the dealership profile and the header shows the new name', async ({
  page, request, adminApi,
}) => {
  const dealer = await dealership(adminApi);
  const owner = await bindOwner(request, adminApi, dealer.id);
  await signInAs(page, owner.token);

  await page.goto('/team');
  await page.getByRole('button', { name: 'Dealership profile', exact: true }).click();
  const name = page.getByLabel('Legal name');
  await expect(name).toHaveValue(dealer.legalName, LOAD);

  const confirmSave = async () => {
    await page.getByRole('button', { name: 'Save profile' }).click();
    await page.locator('.dialog').getByRole('button', { name: 'Save', exact: true }).click();
  };

  // The form reloads itself once on mount; typing before that settles is overwritten.
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Contact email').fill('not-an-email');
  await expect(page.getByLabel('Contact email')).toHaveValue('not-an-email');
  await confirmSave();
  await expect(page.locator('.form-error')).not.toHaveCount(0, LOAD);

  const renamed = `${dealer.legalName} Renamed`;
  await name.fill(renamed);
  await page.getByLabel('Contact email').fill(`renamed.${uniqueSuffix()}@example.com`);
  await confirmSave();
  await expect(page.getByRole('status').filter({ hasText: 'Dealership profile saved.' })).toBeVisible(LOAD);
  await expect(page.locator('.dealer-chip')).toContainText(renamed);
});

test('AUTH-26: the admin sets any of the three tiers from the Staff drawer', async ({
  adminPage: page, request, adminApi,
}) => {
  const dealer = await dealership(adminApi);
  const owner = await bindOwner(request, adminApi, dealer.id);
  const member = await addMember(request, adminApi, dealer.id, owner);

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible(LOAD);
  await page.getByPlaceholder('Dealership name').fill(dealer.legalName);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('row').filter({ hasText: dealer.legalName }).getByRole('button', { name: 'Staff', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: `Staff · ${dealer.legalName}` });
  const row = drawer.locator('tbody tr').filter({ hasText: member.username });
  // The Role cell, not the whole row: the row also holds the role picker with all three labels.
  const roleCell = row.getByRole('cell').nth(3);
  await expect(roleCell).toHaveText('Sales', LOAD);

  const select = row.getByLabel(`Dealership role for ${member.username}`);
  await expect(select.getByRole('option')).toHaveText(['Owner', 'Manager', 'Sales']);
  const api = new Api(request, member.token);
  const tierOf = async () =>
    ((await (await api.get('/api/v1/me')).json()) as { dealerRole: string }).dealerRole;

  await select.selectOption('MANAGER');
  await expect(roleCell).toHaveText('Manager', LOAD);
  expect(await tierOf()).toBe('MANAGER');

  // Only the platform admin appoints an owner, which is how a departing one is replaced. The
  // dealership keeps exactly one, so the sitting owner's row drops to Manager in the same change.
  const ownerRow = drawer.locator('tbody tr').filter({ hasText: owner.username });
  const ownerRoleCell = ownerRow.getByRole('cell').nth(3);
  await expect(ownerRoleCell).toHaveText('Owner', LOAD);
  await select.selectOption('OWNER');
  await expect(roleCell).toHaveText('Owner', LOAD);
  await expect(ownerRoleCell).toHaveText('Manager', LOAD);
  expect(await tierOf()).toBe('OWNER');

  // Demoting the only owner is refused, and the drawer keeps showing the tier the server holds.
  const refused = page.waitForResponse(
    (r) => r.request().method() === 'PUT' && r.url().includes('/role') && r.status() === 409);
  await select.selectOption('SALES');
  await refused;
  await expect(roleCell).toHaveText('Owner');
  expect(await tierOf()).toBe('OWNER');

  // Handing the office back frees this member to become a sales member again.
  await ownerRow.getByLabel(`Dealership role for ${owner.username}`).selectOption('OWNER');
  await expect(ownerRoleCell).toHaveText('Owner', LOAD);
  await select.selectOption('SALES');
  await expect(roleCell).toHaveText('Sales', LOAD);
  expect(await tierOf()).toBe('SALES');
});
