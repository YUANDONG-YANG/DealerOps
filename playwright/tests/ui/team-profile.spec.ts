import type { APIRequestContext, Page, Route } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { Api, apiLogin, expectError, expectStatus, randomDigits, uniqueSuffix } from '../../support/api';
import { env } from '../../support/env';

// Profile edits and account deletion must never touch the seeded accounts, so every test in
// this file signs in as a throwaway account bound to a throwaway dealership. The first account
// of a dealership is bound directly as its OWNER, who owns Team, the dealership profile and the
// join-request inbox; every later account joins as SALES through a join request the owner
// approves (requirements/update-cr/CR-Role-Hierarchy-2026-11-03.md §2, design/21 AUTH-27/AUTH-28).

// Must match TOKEN_KEY in frontend/react/src/auth/login.ts.
const TOKEN_KEY = 'dealerops.accessToken';
const INJECTED_KEY = 'e2e.tokenInjected';

type Throwaway = {
  username: string;
  displayName: string;
  email: string;
  phone: string;
  password: string;
  dealerId: number;
  dealerName: string;
  api: Api;
  token: string;
};

type JoinRequestHistory = {
  id: number;
  kind: string;
  createdAt: string;
  payload: Record<string, unknown>;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolvedAction: string | null;
};

function randomPhone() {
  return `+1403${randomDigits(7)}`;
}

async function createDealer(adminApi: Api) {
  const id = uniqueSuffix();
  const legalName = `E2E Throwaway Dealer ${id}`;
  const res = await adminApi.post('/api/v1/admin/dealers', {
    legalName,
    contactPhone: '403-555-0177',
    contactEmail: `e2e.dealer.${id}@example.com`,
    contactAddress: '9 Throwaway Lane, Calgary, AB',
  });
  await expectStatus(res, 201);
  const body = (await res.json()) as { id: number };
  return { dealerId: body.id, dealerName: legalName };
}

function newAccount() {
  const id = uniqueSuffix();
  return {
    username: `e2e.tmp.${id}`,
    displayName: `E2E Throwaway ${id}`,
    email: `e2e.tmp.${id}@example.com`,
    phone: randomPhone(),
    password: 'e2e-throwaway-pass-1',
  };
}

async function signedIn(
  request: APIRequestContext,
  account: ReturnType<typeof newAccount>,
  dealer: { dealerId: number; dealerName: string },
): Promise<Throwaway> {
  const login = await apiLogin(request, account.username, account.password);
  return { ...account, ...dealer, token: login.accessToken, api: new Api(request, login.accessToken) };
}

/**
 * The dealership's first member: while it has no active owner the admin binds the account
 * directly as its OWNER (201), because an empty dealership has nobody to approve a join request.
 */
async function bindOwner(
  request: APIRequestContext,
  adminApi: Api,
  dealer: { dealerId: number; dealerName: string },
): Promise<Throwaway> {
  const account = newAccount();
  const res = await adminApi.post(`/api/v1/admin/dealers/${dealer.dealerId}/members`, account);
  await expectStatus(res, 201);
  expect((await res.json()).dealerRole, 'the first member is the dealership owner').toBe('OWNER');
  return signedIn(request, account, dealer);
}

/**
 * A further member of the owner's dealership: the admin only files a join request (202) once the
 * dealership has an owner, and the owner's approval makes the account a SALES member.
 */
async function addSales(request: APIRequestContext, adminApi: Api, owner: Throwaway): Promise<Throwaway> {
  const account = newAccount();
  const res = await adminApi.post(`/api/v1/admin/dealers/${owner.dealerId}/members`, account);
  await expectStatus(res, 202);
  expect((await res.json()).joinRequested).toBe(true);
  await expectStatus(await owner.api.post(`/api/v1/dealer/join-requests/${account.username}/approve`), 204);
  return signedIn(request, account, { dealerId: owner.dealerId, dealerName: owner.dealerName });
}

/** The owner appoints a sales member of their own dealership as a manager. */
async function makeManager(owner: Throwaway, member: Throwaway) {
  await expectStatus(
    await owner.api.put(`/api/v1/dealer/members/${member.username}/role`, { dealerRole: 'MANAGER' }), 204);
}

/** A throwaway dealership and its owner. */
async function throwawayOwner(request: APIRequestContext, adminApi: Api) {
  return bindOwner(request, adminApi, await createDealer(adminApi));
}

/**
 * Injects the token once per tab. A plain addInitScript would re-insert the token on every
 * navigation, which would undo Sign out and account deletion.
 */
async function signInAs(page: Page, token: string) {
  await page.addInitScript(
    ([key, flag, value]) => {
      if (window.sessionStorage.getItem(flag)) return;
      window.sessionStorage.setItem(key, value);
      window.sessionStorage.setItem(flag, '1');
    },
    [TOKEN_KEY, INJECTED_KEY, token] as const,
  );
}

/**
 * Opens /profile and waits until the form holds the loaded values. In development React runs
 * effects twice, so a second GET /me can land late and overwrite anything typed too early.
 */
async function openProfile(page: Page, displayName: string) {
  await page.goto('/profile');
  await expect(page.getByLabel('Full name')).toHaveValue(displayName);
  await page.waitForLoadState('networkidle');
}

function definition(page: Page, term: string) {
  return page.locator(`dl.definition-list dt:text-is("${term}") + dd`);
}

// ---------------------------------------------------------------------------------------------
// /team: join-request inbox (AUTH-25) and the dealership member list (14 §5.6)
// ---------------------------------------------------------------------------------------------

test.describe('/team', () => {
  test('AUTH-25: a dealership with no join requests shows the empty Team page and an empty inbox', async ({
    page, request, adminApi,
  }) => {
    const me = await throwawayOwner(request, adminApi);
    await signInAs(page, me.token);

    const history = page.waitForResponse(
      (r) => r.url().includes('/api/v1/dealer/notifications') && r.url().includes('includeResolved=true'),
    );
    await page.goto('/team');
    expect((await history).status()).toBe(200);

    await expect(page.getByRole('heading', { name: 'Team', level: 1 })).toBeVisible();
    await expect(page.getByText('No join requests yet.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Team' })).toHaveClass(/active/);

    const bell = page.getByRole('button', { name: 'No inbox messages' });
    await expect(bell).toBeVisible();
    await bell.click();
    await expect(page.getByText("You're all caught up.")).toBeVisible();

    // The real queue for a fresh dealership is empty, and an unknown request is a 404.
    const queue = await me.api.get('/api/v1/dealer/join-requests');
    await expectStatus(queue, 200);
    expect(await queue.json()).toEqual([]);
    await expectError(await me.api.post('/api/v1/dealer/join-requests/nobody.here/approve'), 404, 'NOT_FOUND');
  });

  test('AUTH-25: GET /members lists only the caller dealership members, sorted by username', async ({
    request, adminApi,
  }) => {
    const dealer = await createDealer(adminApi);
    const first = await bindOwner(request, adminApi, dealer);
    const second = await addSales(request, adminApi, first);

    const res = await first.api.get('/api/v1/members');
    await expectStatus(res, 200);
    const members = ((await res.json()) as { username: string; displayName: string }[])
      .map((m) => ({ username: m.username, displayName: m.displayName }));
    expect(members).toEqual(
      [first, second]
        .map((m) => ({ username: m.username, displayName: m.displayName }))
        .sort((a, b) => a.username.localeCompare(b.username)),
    );
    expect(members.map((m) => m.username)).not.toContain(env.staff.username);

    // Admin has no dealership: 403.
    await expectStatus(await adminApi.get('/api/v1/members'), 403);
  });

  // Join requests can only be created through a real Google ID token (14 §1.6), so the queue
  // contents are served by route mocks; approve/reject requests are asserted as sent.
  test('AUTH-25: Team page lists pending and resolved join requests and approves a pending one', async ({
    page, request, adminApi,
  }) => {
    const me = await throwawayOwner(request, adminApi);
    await signInAs(page, me.token);

    const now = new Date().toISOString();
    const pending = {
      id: 9001, kind: 'JOIN_REQUEST', createdAt: now,
      payload: { username: 'ada.lee', displayName: 'Ada Lee', email: 'ada@example.com' },
      resolvedAt: null, resolvedBy: null, resolvedAction: null,
    };
    const rejected = {
      id: 9000, kind: 'JOIN_REQUEST', createdAt: now,
      payload: { username: 'bob.ray', displayName: 'Bob Ray', email: null },
      resolvedAt: now, resolvedBy: 'someone.else', resolvedAction: 'REJECTED',
    };
    let inboxRows = [{
      username: 'ada.lee', displayName: 'Ada Lee', email: 'ada@example.com', createdAt: now,
    }];
    let approved = false;

    await page.route('**/api/v1/dealer/notifications**', (route: Route) => {
      const history = route.request().url().includes('includeResolved=true');
      const current = approved
        ? { ...pending, resolvedAt: now, resolvedBy: me.username, resolvedAction: 'APPROVED' }
        : pending;
      const rows = history ? [current, rejected] : approved ? [] : [pending];
      return route.fulfill({ status: 200, json: rows });
    });
    await page.route('**/api/v1/dealer/join-requests', (route: Route) =>
      route.fulfill({ status: 200, json: inboxRows }));
    const approveCalls: string[] = [];
    await page.route('**/api/v1/dealer/join-requests/*/approve', (route: Route) => {
      approveCalls.push(route.request().url());
      approved = true;
      inboxRows = [];
      return route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/team');
    // A request awaiting a decision stands in the Pending table; a resolved one in History.
    const pendingTable = page.getByRole('table', { name: 'Pending join requests' });
    const historyTable = page.getByRole('table', { name: 'Join request history' });
    const adaRow = pendingTable.getByRole('row', { name: /Ada Lee/ });
    const bobRow = historyTable.getByRole('row', { name: /Bob Ray/ });

    await expect(adaRow).toContainText('ada@example.com');
    await expect(adaRow).toContainText('ada.lee');
    await expect(historyTable.getByRole('row', { name: /Ada Lee/ })).toHaveCount(0);
    await expect(bobRow.locator('.chip')).toHaveText('Rejected');
    await expect(bobRow).toContainText('by someone.else');
    await expect(bobRow).toContainText('Not provided'); // no email
    await expect(bobRow.getByRole('button')).toHaveCount(0);

    // Header bell reflects the unresolved count.
    await expect(page.getByRole('button', { name: '1 inbox message', exact: true })).toBeVisible();

    await adaRow.getByRole('button', { name: 'Approve' }).click();
    const adaResolved = historyTable.getByRole('row', { name: /Ada Lee/ });
    await expect(adaResolved.locator('.chip')).toHaveText('Approved');
    await expect(adaResolved.getByRole('button')).toHaveCount(0);
    await expect(adaResolved).toContainText(`by ${me.username}`);
    await expect(page.getByText('No pending join requests.')).toBeVisible();
    expect(approveCalls).toHaveLength(1);
    expect(approveCalls[0]).toContain('/api/v1/dealer/join-requests/ada.lee/approve');

    // The header inbox refreshes from the change event, without a reload.
    await expect(page.getByRole('button', { name: 'No inbox messages' })).toBeVisible();
  });

  test('AUTH-25: header inbox lists pending requests, rejects one and opens Team', async ({
    page, request, adminApi,
  }) => {
    const me = await throwawayOwner(request, adminApi);
    await signInAs(page, me.token);

    const now = new Date().toISOString();
    let history: JoinRequestHistory[] = [
      { id: 9101, kind: 'JOIN_REQUEST', createdAt: now,
        payload: { username: 'cy.tan', displayName: 'Cy Tan', email: 'cy@example.com' },
        resolvedAt: null, resolvedBy: null, resolvedAction: null },
      { id: 9100, kind: 'JOIN_REQUEST', createdAt: now,
        payload: { username: 'di.wu', displayName: 'Di Wu', email: null },
        resolvedAt: null, resolvedBy: null, resolvedAction: null },
      // Not a join request: must be ignored by the inbox.
      { id: 9099, kind: 'OTHER', createdAt: now, payload: {},
        resolvedAt: null, resolvedBy: null, resolvedAction: null },
    ];
    await page.route('**/api/v1/dealer/notifications**', (route: Route) =>
      route.fulfill({ status: 200, json: history }));
    let pending = [
      { username: 'cy.tan', displayName: 'Cy Tan', email: 'cy@example.com', createdAt: now },
      { username: 'di.wu', displayName: 'Di Wu', email: null, createdAt: now },
    ];
    await page.route('**/api/v1/dealer/join-requests', (route: Route) =>
      route.fulfill({ status: 200, json: pending }));
    const rejectCalls: string[] = [];
    await page.route('**/api/v1/dealer/join-requests/*/reject', (route: Route) => {
      rejectCalls.push(route.request().url());
      pending = pending.filter((n) => n.username !== 'cy.tan');
      history = history.map(n => n.id === 9101
        ? { ...n, resolvedAt: now, resolvedBy: me.username, resolvedAction: 'REJECTED' }
        : n);
      return route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/dms');
    const bell = page.getByRole('button', { name: '2 inbox messages' });
    await expect(bell.locator('.inbox-badge')).toHaveText('2');
    await bell.click();

    const popover = page.locator('.inbox-popover');
    await expect(popover.locator('.inbox-item')).toHaveCount(2);
    const cy = popover.locator('.inbox-item', { hasText: 'Cy Tan' });
    await expect(cy).toContainText('cy@example.com');
    // No email: the username is shown instead.
    await expect(popover.locator('.inbox-item', { hasText: 'Di Wu' })).toContainText('di.wu');

    await cy.getByRole('button', { name: 'Reject' }).click();
    await expect(popover.locator('.inbox-item')).toHaveCount(1);
    await expect(page.getByRole('button', { name: '1 inbox message', exact: true })).toBeVisible();
    expect(rejectCalls).toHaveLength(1);
    expect(rejectCalls[0]).toContain('/api/v1/dealer/join-requests/cy.tan/reject');

    await popover.getByRole('button', { name: /Open Team/ }).click();
    await expect(page).toHaveURL(/\/team$/);
    await expect(page.getByRole('heading', { name: 'Team', level: 1 })).toBeVisible();
  });

  test('AUTH-25: approving a request someone else already resolved refreshes silently', async ({
    page, request, adminApi, allowBrowserErrors,
  }) => {
    allowBrowserErrors(/404/);
    const me = await throwawayOwner(request, adminApi);
    await signInAs(page, me.token);

    const now = new Date().toISOString();
    const row = {
      id: 9201, kind: 'JOIN_REQUEST', createdAt: now,
      payload: { username: 'ed.kim', displayName: 'Ed Kim', email: 'ed@example.com' },
      resolvedAt: null as string | null, resolvedBy: null as string | null, resolvedAction: null as string | null,
    };
    let inboxRows = [{
      username: 'ed.kim', displayName: 'Ed Kim', email: 'ed@example.com', createdAt: now,
    }];
    await page.route('**/api/v1/dealer/notifications**', (route: Route) => route.fulfill({ status: 200, json: [row] }));
    await page.route('**/api/v1/dealer/join-requests', (route: Route) =>
      route.fulfill({ status: 200, json: inboxRows }));
    await page.route('**/api/v1/dealer/join-requests/*/approve', (route: Route) => {
      inboxRows = [];
      Object.assign(row, { resolvedAt: now, resolvedBy: 'other.member', resolvedAction: 'APPROVED' });
      return route.fulfill({
        status: 404,
        json: { code: 'NOT_FOUND', message: 'Join request not found.' },
      });
    });

    await page.goto('/team');
    const edRow = page.getByRole('row', { name: /Ed Kim/ });
    await edRow.getByRole('button', { name: 'Approve' }).click();
    await expect(edRow.locator('.chip')).toHaveText('Approved');
    await expect(edRow).toContainText('by other.member');
    await expect(page.locator('.alert-error')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------------------------
// /profile: account self-service (14 §2, §2.1, §2.2; design/13 §2)
// ---------------------------------------------------------------------------------------------

test.describe('/profile', () => {
  test('UI-profile: shows the account details and the password sign-in method', async ({
    page, request, adminApi,
  }) => {
    const me = await throwawayOwner(request, adminApi);
    await signInAs(page, me.token);

    await page.goto('/dms');
    await page.getByRole('link', { name: 'Open profile' }).click();
    await expect(page).toHaveURL(/\/profile$/);

    await expect(page.getByRole('heading', { name: 'Profile', level: 1 })).toBeVisible();
    await expect(page.getByText(`@${me.username}`)).toBeVisible();
    await expect(definition(page, 'Role')).toHaveText('Dealer.User');
    await expect(definition(page, 'Dealership')).toHaveText(me.dealerName);
    // The dealership role of a dealer user is shown as a readable label (ROLE: Owner, Manager, Sales).
    await expect(definition(page, 'Dealership role')).toHaveText('Owner');
    await expect(definition(page, 'Email')).toHaveText(me.email);
    await expect(definition(page, 'Phone')).toHaveText(me.phone);
    await expect(definition(page, 'Sign-in method')).toHaveText('Username / password sign-in');
    await expect(page.getByLabel('Full name')).toHaveValue(me.displayName);
    await expect(page.getByLabel('Phone')).toHaveValue(me.phone);
  });

  test('UI-profile: edits display name and phone; the change persists and reaches the header and members list', async ({
    page, request, adminApi,
  }) => {
    const me = await throwawayOwner(request, adminApi);
    await signInAs(page, me.token);
    await openProfile(page, me.displayName);

    const newName = `E2E Renamed ${uniqueSuffix()}`;
    const digits = randomDigits(7);
    const canonical = `+1403${digits}`;

    await page.getByLabel('Full name').fill(`  ${newName}  `);
    await page.getByLabel('Phone').fill(`+1 (403) ${digits.slice(0, 3)}-${digits.slice(3)}`);
    const saved = page.waitForResponse((r) => r.url().endsWith('/api/v1/me') && r.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Save changes' }).click();
    expect((await saved).status()).toBe(200);

    await expect(page.locator('.alert-success')).toHaveText('Profile saved.');
    await expect(page.locator('.card strong').first()).toHaveText(newName);
    await expect(definition(page, 'Phone')).toHaveText(canonical);
    await expect(page.getByRole('link', { name: 'Open profile' })).toContainText(newName);

    await page.reload();
    await expect(page.getByLabel('Full name')).toHaveValue(newName);
    await expect(page.getByLabel('Phone')).toHaveValue(canonical);

    const members = (await (await me.api.get('/api/v1/members')).json()) as { username: string; displayName: string }[];
    expect(members).toContainEqual(expect.objectContaining({ username: me.username, displayName: newName }));

    // The canonical phone works as a sign-in name.
    await apiLogin(request, canonical, me.password);
  });

  test('UI-profile: clearing the phone removes it', async ({ page, request, adminApi }) => {
    const me = await throwawayOwner(request, adminApi);
    await signInAs(page, me.token);
    await openProfile(page, me.displayName);

    await page.getByLabel('Phone').fill('   ');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.locator('.alert-success')).toHaveText('Profile saved.');
    await expect(definition(page, 'Phone')).toHaveText('Not provided');

    const meRes = await me.api.get('/api/v1/me');
    // The gateway omits null members, so an absent key also means "no phone".
    expect(((await meRes.json()) as { phone?: string | null }).phone ?? null).toBeNull();
  });

  test('UI-profile: rejects a blank display name and an invalid phone with field errors', async ({
    page, request, adminApi, allowBrowserErrors,
  }) => {
    allowBrowserErrors(/400/);
    const me = await throwawayOwner(request, adminApi);
    await signInAs(page, me.token);
    await openProfile(page, me.displayName);

    const nameItem = page.locator('.form-item', { has: page.getByLabel('Full name') });
    const phoneItem = page.locator('.form-item', { has: page.getByLabel('Phone') });

    // Whitespace passes the browser "required" check, is trimmed to empty and rejected by the API.
    await page.getByLabel('Full name').fill('   ');
    let patch = page.waitForResponse((r) => r.url().endsWith('/api/v1/me') && r.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Save changes' }).click();
    expect((await patch).status()).toBe(400);
    await expect(page.locator('.alert-error')).toBeVisible();
    await expect(nameItem.locator('.form-error')).toBeVisible();

    await page.getByLabel('Full name').fill(me.displayName);
    await page.getByLabel('Phone').fill('12');
    patch = page.waitForResponse((r) => r.url().endsWith('/api/v1/me') && r.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Save changes' }).click();
    const res = await patch;
    expect(res.status()).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('VALIDATION');
    await expect(phoneItem.locator('.form-error')).toHaveText('Enter a valid phone number with country code.');
    await expect(nameItem.locator('.form-error')).toHaveCount(0);
    await expect(page.locator('.alert-success')).toHaveCount(0);

    // Nothing was stored.
    const stored = (await (await me.api.get('/api/v1/me')).json()) as { displayName: string; phone: string };
    expect(stored).toMatchObject({ displayName: me.displayName, phone: me.phone });
  });

  test('CR-021 / UI-profile: a full name another account already uses is saved, not rejected', async ({
    page, request, adminApi,
  }) => {
    const me = await throwawayOwner(request, adminApi);
    await signInAs(page, me.token);
    await openProfile(page, me.displayName);

    // People share names, so the full name is no longer unique (CR-Analysis §6 D1). A seeded
    // account's name is only read here, never changed.
    const shared = env.staff2.displayName.toUpperCase();
    await page.getByLabel('Full name').fill(shared);
    const patch = page.waitForResponse((r) => r.url().endsWith('/api/v1/me') && r.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Save changes' }).click();
    expect((await patch).status()).toBe(200);

    const nameItem = page.locator('.form-item', { has: page.getByLabel('Full name') });
    await expect(page.locator('.alert-success')).toHaveText('Profile saved.');
    await expect(nameItem.locator('.form-error')).toHaveCount(0);
    await expect(page.locator('.card strong').first()).toHaveText(shared);

    // It persists, and the other account keeps its own name.
    await page.reload();
    await expect(page.getByLabel('Full name')).toHaveValue(shared);
    const stored = (await (await me.api.get('/api/v1/me')).json()) as { displayName: string };
    expect(stored.displayName).toBe(shared);
  });

  test('CR-053 / UI-profile: the editable name field is labelled Full name', async ({
    page, request, adminApi,
  }) => {
    const me = await throwawayOwner(request, adminApi);
    await signInAs(page, me.token);
    await openProfile(page, me.displayName);

    // The label, not only the accessible name: "Display name" must be gone from the page.
    await expect(page.locator('label[for="displayName"]')).toHaveText('Full name');
    await expect(page.getByLabel('Full name')).toHaveValue(me.displayName);
    await expect(page.locator('body')).not.toContainText(/display name/i);
  });

  test('UI-profile: PHONE_TAKEN when the phone belongs to another account', async ({
    page, request, adminApi, allowBrowserErrors,
  }) => {
    allowBrowserErrors(/409/);
    const dealer = await createDealer(adminApi);
    const me = await bindOwner(request, adminApi, dealer);
    const other = await addSales(request, adminApi, me);
    await signInAs(page, me.token);
    await openProfile(page, me.displayName);

    // Same number, different formatting: uniqueness is on the canonical form.
    const digits = other.phone.slice(5);
    await page.getByLabel('Phone').fill(`+1 403 ${digits.slice(0, 3)} ${digits.slice(3)}`);
    const patch = page.waitForResponse((r) => r.url().endsWith('/api/v1/me') && r.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Save changes' }).click();
    const res = await patch;
    expect(res.status()).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('PHONE_TAKEN');

    const phoneItem = page.locator('.form-item', { has: page.getByLabel('Phone') });
    await expect(phoneItem.locator('.form-error')).toHaveText('That phone number is already registered.');
    await expect(definition(page, 'Phone')).toHaveText(me.phone);

    const stored = (await (await me.api.get('/api/v1/me')).json()) as { phone: string };
    expect(stored.phone).toBe(me.phone);
  });

  test('UI-profile: Sign out clears the session and protected pages require sign-in again', async ({
    page, request, adminApi,
  }) => {
    const me = await throwawayOwner(request, adminApi);
    await signInAs(page, me.token);
    await openProfile(page, me.displayName);
    await expect(page.getByText(`@${me.username}`)).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    // The sign-out destination (landing or login) is not specified; it only must leave /profile.
    await expect(page).not.toHaveURL(/\/profile/);
    expect(await page.evaluate((key) => window.sessionStorage.getItem(key), TOKEN_KEY)).toBeNull();

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/);
  });

  test('UI-profile: deleting the throwaway account signs out and retires its credentials', async ({
    page, request, adminApi,
  }) => {
    const dealer = await createDealer(adminApi);
    // The dealership keeps its owner while it still has staff, so the account that deletes itself
    // here is the sales member (CR role hierarchy §2); the owner's own case is the next test.
    const owner = await bindOwner(request, adminApi, dealer);
    const me = await addSales(request, adminApi, owner);
    await signInAs(page, me.token);
    await openProfile(page, me.displayName);

    // Cancel keeps the account.
    await page.getByRole('button', { name: 'Delete my account' }).click();
    await expect(page.getByText('Really delete? This signs you out immediately.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'Delete my account' })).toBeVisible();

    await page.getByRole('button', { name: 'Delete my account' }).click();
    const deleted = page.waitForResponse((r) => r.url().endsWith('/api/v1/me') && r.request().method() === 'DELETE');
    await page.getByRole('button', { name: 'Yes, delete' }).click();
    expect((await deleted).status()).toBe(204);
    await expect(page).toHaveURL(/\/login\?notice=deleted/);
    expect(await page.evaluate((key) => window.sessionStorage.getItem(key), TOKEN_KEY)).toBeNull();

    // The credentials no longer work and the membership is gone.
    for (const identifier of [me.username, me.email, me.phone]) {
      const login = await request.post(`${env.gatewayUrl}/api/v1/auth/login`, {
        data: { identifier, password: me.password },
      });
      expect(login.status(), `login as ${identifier} after delete`).toBe(401);
    }
    const members = (await (await owner.api.get('/api/v1/members')).json()) as { username: string }[];
    expect(members.map((m) => m.username)).toEqual([owner.username]);
  });

  test('LAST_OWNER / UI-profile: the sole owner cannot delete their account while the dealership has staff', async ({
    page, request, adminApi, allowBrowserErrors,
  }) => {
    allowBrowserErrors(/409/);
    const dealer = await createDealer(adminApi);
    const me = await bindOwner(request, adminApi, dealer);
    await addSales(request, adminApi, me);
    await signInAs(page, me.token);
    await openProfile(page, me.displayName);

    await page.getByRole('button', { name: 'Delete my account' }).click();
    const refused = page.waitForResponse((r) => r.url().endsWith('/api/v1/me') && r.request().method() === 'DELETE');
    await page.getByRole('button', { name: 'Yes, delete' }).click();
    const res = await refused;
    expect(res.status()).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('LAST_OWNER');

    // The account survives: the page keeps the session and says what to do next.
    await expect(page.locator('.alert-error')).toContainText(
      "You are this dealership's only owner. Ask the platform admin to appoint another owner");
    await expect(page).toHaveURL(/\/profile$/);
    await apiLogin(request, me.username, me.password);
  });

  test('UI-profile: the platform admin sees that admin accounts cannot delete themselves', async ({
    adminPage: page,
  }) => {
    await page.goto('/profile');
    await expect(definition(page, 'Role')).toHaveText('Platform.Admin');
    await expect(definition(page, 'Dealership')).toHaveText('No dealership');
    await expect(page.getByText('Platform admin accounts cannot delete themselves.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete my account' })).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------------------------
// The three in-dealership tiers on /team
// (requirements/update-cr/CR-Role-Hierarchy-2026-11-03.md §1-§3, design/21 AUTH-27/AUTH-28)
// ---------------------------------------------------------------------------------------------

const TEAM_TABS = ['Join requests', 'Members', 'Dealership profile', 'Activity'];

function tab(page: Page, label: string) {
  return page.locator('.tab-bar').getByRole('button', { name: label, exact: true });
}

function memberRow(page: Page, username: string) {
  return page.locator('table.table').getByRole('row', { name: new RegExp(username) });
}

test.describe('/team roles', () => {
  test('ROLE / owner only: the owner sees all four tabs and appoints a manager', async ({
    page, request, adminApi,
  }) => {
    const owner = await throwawayOwner(request, adminApi);
    const sales = await addSales(request, adminApi, owner);
    await signInAs(page, owner.token);

    await page.goto('/team');
    for (const label of TEAM_TABS) await expect(tab(page, label)).toBeVisible();

    await tab(page, 'Members').click();
    const ownRow = memberRow(page, owner.username);
    await expect(ownRow).toContainText('Owner');
    // Nobody acts on their own row, not even the owner.
    await expect(ownRow).toContainText('You');

    const salesRow = memberRow(page, sales.username);
    await expect(salesRow).toContainText('Sales');
    await expect(salesRow.getByRole('button', { name: 'Make manager' })).toBeVisible();
    await expect(salesRow.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(salesRow.getByRole('button', { name: 'Remove' })).toBeVisible();

    await salesRow.getByRole('button', { name: 'Make manager' }).click();
    const dialog = page.locator('.dialog');
    await expect(dialog).toContainText(`Make ${sales.username} a manager?`);
    await dialog.getByRole('button', { name: 'Make manager' }).click();

    // The owner may also take the appointment back, which a manager cannot.
    await expect(memberRow(page, sales.username)).toContainText('Manager');
    await expect(memberRow(page, sales.username).getByRole('button', { name: 'Make sales' })).toBeVisible();
  });

  test('ROLE / a manager sees Members and Activity only, with no join requests and no dealership profile', async ({
    page, request, adminApi,
  }) => {
    const owner = await throwawayOwner(request, adminApi);
    const manager = await addSales(request, adminApi, owner);
    await makeManager(owner, manager);
    const sales = await addSales(request, adminApi, owner);
    await signInAs(page, manager.token);

    await page.goto('/team');
    // Join requests and the dealership profile are the owner's alone (CR role hierarchy §3), so a
    // manager gets neither tab and opens on Members.
    for (const label of ['Join requests', 'Dealership profile']) {
      await expect(tab(page, label)).toHaveCount(0);
    }
    for (const label of ['Members', 'Activity']) {
      await expect(tab(page, label)).toBeVisible();
    }
    await expect(tab(page, 'Members')).toHaveClass(/active/);
    await expect(memberRow(page, manager.username)).toContainText('You');
    // The owner row is out of reach for a manager; a sales member is not.
    await expect(memberRow(page, owner.username)).toContainText('Owner, set by the platform admin');
    await expect(memberRow(page, owner.username).getByRole('button')).toHaveCount(0);
    await expect(memberRow(page, sales.username).getByRole('button', { name: 'Make manager' })).toBeVisible();

    // Owner-only routes stay closed to a manager; the dealership audit does not.
    await expectError(await manager.api.get('/api/v1/dealer/profile'), 403, 'FORBIDDEN');
    await expectError(await manager.api.get('/api/v1/dealer/join-requests'), 403, 'FORBIDDEN');
    await expectStatus(await manager.api.get('/api/v1/dealer/audit'), 200);
  });

  test('ROLE / a sales member has no Team link and /team sends them to /dms', async ({
    page, request, adminApi,
  }) => {
    const owner = await throwawayOwner(request, adminApi);
    const sales = await addSales(request, adminApi, owner);
    await signInAs(page, sales.token);

    await page.goto('/dms');
    await expect(page.getByRole('heading', { name: 'DMS', exact: true })).toBeVisible();
    await expect(page.locator('.side-menu').getByRole('link', { name: 'Team' })).toHaveCount(0);

    await page.goto('/team');
    await expect(page).toHaveURL(/\/dms$/);

    // Team administration and the audit are closed; the business data is not (§5).
    await expectError(await sales.api.get('/api/v1/dealer/audit'), 403, 'FORBIDDEN');
    await expectError(await sales.api.get('/api/v1/dealer/profile'), 403, 'FORBIDDEN');
    await expectStatus(await sales.api.get('/api/v1/vehicles'), 200);
  });

  test('CR-021 / CR-053 / the member-edit drawer labels the name Full name and accepts a duplicate', async ({
    page, request, adminApi,
  }) => {
    const owner = await throwawayOwner(request, adminApi);
    const first = await addSales(request, adminApi, owner);
    const second = await addSales(request, adminApi, owner);
    await signInAs(page, owner.token);

    await page.goto('/team');
    await tab(page, 'Members').click();
    await memberRow(page, first.username).getByRole('button', { name: 'Edit' }).click();
    const drawer = page.getByRole('dialog', { name: `Edit ${first.username}` });
    await expect(drawer.locator('label[for="member-displayName"]')).toHaveText('Full name');

    // People share names (CR-Analysis §6 D1), so the name of a colleague is accepted here too.
    await drawer.getByLabel('Full name').fill(second.displayName);
    const saved = page.waitForResponse(
      (r) => r.url().includes(`/api/v1/dealer/members/${first.username}`) && r.request().method() === 'PATCH');
    await drawer.getByRole('button', { name: 'Save member' }).click();
    expect((await saved).status()).toBe(204);
    await expect(page.getByRole('dialog', { name: `Edit ${first.username}` })).toHaveCount(0);
    await expect(page.locator('.form-error')).toHaveCount(0);

    // Both members now carry the same full name, and each keeps its own username.
    const members = (await (await owner.api.get('/api/v1/members')).json()) as
      { username: string; displayName: string }[];
    for (const username of [first.username, second.username]) {
      expect(members).toContainEqual(
        expect.objectContaining({ username, displayName: second.displayName }));
    }
  });

  test('CR-023 / the dealership profile is confirmed before it is saved', async ({
    page, request, adminApi,
  }) => {
    const owner = await throwawayOwner(request, adminApi);
    await signInAs(page, owner.token);

    await page.goto('/team');
    await tab(page, 'Dealership profile').click();
    const legalName = page.getByLabel('Legal name');
    await expect(legalName).toHaveValue(owner.dealerName);
    // In the React StrictMode dev build the page's load effect runs twice, and a late second
    // profile response puts the stored values back into the form. Edit only once it has settled.
    await page.waitForLoadState('networkidle');

    const renamed = `${owner.dealerName} Renamed`;
    await legalName.fill(renamed);
    await page.getByRole('button', { name: 'Save profile' }).click();

    // Cancelling the confirmation saves nothing and keeps the edit in the form.
    const dialog = page.locator('.dialog');
    await expect(dialog).toContainText('Save changes to the dealership profile?');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.dialog')).toHaveCount(0);
    expect(((await (await owner.api.get('/api/v1/dealer/profile')).json()) as { legalName: string }).legalName)
      .toBe(owner.dealerName);
    await expect(legalName).toHaveValue(renamed);

    await page.getByRole('button', { name: 'Save profile' }).click();
    const saved = page.waitForResponse(
      (r) => r.url().endsWith('/api/v1/dealer/profile') && r.request().method() === 'PATCH');
    await page.locator('.dialog').getByRole('button', { name: 'Save', exact: true }).click();
    expect((await saved).status()).toBe(200);
    await expect(page.getByText('Dealership profile saved.')).toBeVisible();
    expect(((await (await owner.api.get('/api/v1/dealer/profile')).json()) as { legalName: string }).legalName)
      .toBe(renamed);
  });

  test('CR-022 / the member-edit drawer asks to discard unsaved changes', async ({
    page, request, adminApi,
  }) => {
    const owner = await throwawayOwner(request, adminApi);
    const sales = await addSales(request, adminApi, owner);
    await signInAs(page, owner.token);

    await page.goto('/team');
    await tab(page, 'Members').click();
    await memberRow(page, sales.username).getByRole('button', { name: 'Edit' }).click();

    const drawer = page.getByRole('dialog', { name: `Edit ${sales.username}` });
    await expect(drawer.getByLabel('Full name')).toHaveValue(sales.displayName);
    // An untouched drawer closes without a prompt.
    await drawer.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog', { name: `Edit ${sales.username}` })).toHaveCount(0);

    await memberRow(page, sales.username).getByRole('button', { name: 'Edit' }).click();
    const renamed = `E2E Renamed ${uniqueSuffix()}`;
    await drawer.getByLabel('Full name').fill(renamed);
    await drawer.getByRole('button', { name: 'Close' }).click();
    const dialog = page.locator('.dialog');
    await expect(dialog).toContainText('Discard unsaved changes?');

    // Cancel keeps the drawer and the edit; Discard throws it away.
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(drawer.getByLabel('Full name')).toHaveValue(renamed);
    await drawer.getByRole('button', { name: 'Close' }).click();
    await page.locator('.dialog').getByRole('button', { name: 'Discard' }).click();
    await expect(page.getByRole('dialog', { name: `Edit ${sales.username}` })).toHaveCount(0);
    await expect(memberRow(page, sales.username)).toContainText(sales.displayName);

    // Saving the drawer does reach the member row.
    await memberRow(page, sales.username).getByRole('button', { name: 'Edit' }).click();
    await drawer.getByLabel('Full name').fill(renamed);
    await drawer.getByRole('button', { name: 'Save member' }).click();
    await expect(page.getByRole('dialog', { name: `Edit ${sales.username}` })).toHaveCount(0);
    await expect(memberRow(page, sales.username)).toContainText(renamed);
  });
});

// ---------------------------------------------------------------------------------------------
// /team > Activity: the dealership audit log
// (AUD-11, CR-014 and CR-020 sorting, CR-026 day-picker labels, CR-027 change search,
// CR-028 filter order, CR-059 partial search)
// ---------------------------------------------------------------------------------------------

test.describe('/team activity log', () => {
  /** Opens Activity as the dealership owner and waits for the first page of the log. */
  async function openActivity(page: Page, owner: Throwaway) {
    await signInAs(page, owner.token);
    const first = page.waitForResponse((r) => r.url().includes('/api/v1/dealer/audit'));
    await page.goto('/team');
    await tab(page, 'Activity').click();
    expect((await first).status()).toBe(200);
    await expect(page.locator('.state', { hasText: 'Loading the audit log' })).toHaveCount(0);
  }

  function auditSearch(page: Page) {
    return page.locator('.filters').getByRole('button', { name: 'Search', exact: true });
  }

  function actorCells(page: Page) {
    return page.locator('table.table tbody tr td:nth-child(2)');
  }

  test('CR-026 / CR-028 / the filters follow the column order and label the day pickers', async ({
    page, request, adminApi,
  }) => {
    const owner = await throwawayOwner(request, adminApi);
    await openActivity(page, owner);

    // The dealership log holds one dealership, so it has neither the column nor the filter.
    // Text content, not innerText: the stylesheet renders the headers in capitals.
    const headers = (await page.locator('table.table thead th').allTextContents()).map((t) => t.trim());
    expect(headers).toEqual(['When', 'Actor', 'Action', 'Record', 'Changes', 'Source IP', 'Location']);

    const filters = page.locator('.filters');
    await expect(filters.getByLabel('From date')).toBeVisible();
    await expect(filters.getByLabel('To date')).toBeVisible();
    const inputs = await filters.locator('input, select').evaluateAll((els) => els.map((el) => (
      el.getAttribute('aria-label')
      ?? el.closest('label')?.textContent?.trim()
      ?? el.getAttribute('placeholder')
      ?? ''
    )));
    expect(inputs, 'the filters read in the column order').toEqual([
      'From date', 'To date', 'Actor username', 'Action', 'Record type', 'Search changes',
    ]);
  });

  test('CR-026 / the labelled day pickers filter the log by day', async ({
    page, request, adminApi,
  }) => {
    const owner = await throwawayOwner(request, adminApi);
    await openActivity(page, owner);
    const rows = page.locator('table.table tbody tr');
    await expect(rows).not.toHaveCount(0);

    // The dealership was created in this run, so a window that starts tomorrow holds nothing.
    const day = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const empty = page.waitForResponse((r) => r.url().includes('/api/v1/dealer/audit')
      && r.url().includes('from=') && r.status() === 200);
    await page.getByLabel('From date').fill(day(1));
    await auditSearch(page).click();
    await empty;
    await expect(page.getByText('No audit events match.')).toBeVisible();

    // Today's window holds them again, so both pickers filter on the day they are labelled with.
    const today = page.waitForResponse((r) => r.url().includes('/api/v1/dealer/audit')
      && r.url().includes('to=') && r.status() === 200);
    await page.getByLabel('From date').fill(day(0));
    await page.getByLabel('To date').fill(day(0));
    await auditSearch(page).click();
    await today;
    await expect(rows).not.toHaveCount(0);
  });

  test('CR-059 / a part of an actor username filters the whole log', async ({
    page, request, adminApi,
  }) => {
    const owner = await throwawayOwner(request, adminApi);
    await openActivity(page, owner);

    // Rows of this dealership are written by the admin (the bind) and by the owner (the sign-in).
    await expect(actorCells(page).filter({ hasText: env.admin.identifier })).not.toHaveCount(0);

    const part = owner.username.slice(-8);
    const filtered = page.waitForResponse(
      (r) => r.url().includes('/api/v1/dealer/audit') && r.url().includes(`actor=${part}`));
    await page.getByLabel('Actor username').fill(part);
    await auditSearch(page).click();
    expect((await filtered).status()).toBe(200);

    const cells = actorCells(page);
    await expect(cells).not.toHaveCount(0);
    for (const text of await cells.allInnerTexts()) expect(text.trim()).toBe(owner.username);
  });

  test('CR-027 / the free-text change search finds the password sign-ins', async ({
    page, request, adminApi,
  }) => {
    const owner = await throwawayOwner(request, adminApi);
    await openActivity(page, owner);

    const searched = page.waitForResponse(
      (r) => r.url().includes('/api/v1/dealer/audit') && r.url().includes('q=password'));
    await page.getByLabel('Search changes').fill('password');
    await auditSearch(page).click();
    const res = await searched;
    expect(res.status(), await res.text()).toBe(200);

    const rows = page.locator('table.table tbody tr');
    await expect(rows).not.toHaveCount(0);
    for (const row of await rows.all()) {
      await expect(row).toContainText('LOGIN');
      await expect(row).toContainText('method');
    }
  });

  test('CR-014 / Source IP and Location sort the whole log on the server', async ({
    page, request, adminApi,
  }) => {
    const owner = await throwawayOwner(request, adminApi);
    await openActivity(page, owner);

    for (const [label, field] of [['Source IP', 'clientIp'], ['Location', 'clientLocation']] as const) {
      const header = page.getByRole('button', { name: label, exact: true });
      const sorted = page.waitForResponse((r) => r.url().includes('/api/v1/dealer/audit')
        && decodeURIComponent(r.url()).includes(`sort=${field},asc`));
      await header.click();
      expect((await sorted).status()).toBe(200);
      await expect(page.locator('th', { has: header })).toHaveAttribute('aria-sort', 'ascending');

      // The second click flips the direction, again on the server.
      const flipped = page.waitForResponse((r) => r.url().includes('/api/v1/dealer/audit')
        && decodeURIComponent(r.url()).includes(`sort=${field},desc`));
      await header.click();
      expect((await flipped).status()).toBe(200);
      await expect(page.locator('th', { has: header })).toHaveAttribute('aria-sort', 'descending');
    }

    // Both sort fields are also accepted directly by the API.
    for (const sort of ['clientIp,asc', 'clientLocation,desc']) {
      await expectStatus(await owner.api.get('/api/v1/dealer/audit', { sort }), 200);
    }
  });
});
