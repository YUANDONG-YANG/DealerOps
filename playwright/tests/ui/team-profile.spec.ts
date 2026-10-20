import type { APIRequestContext, Page, Route } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { Api, apiLogin, expectError, expectStatus, randomDigits, uniqueSuffix } from '../../support/api';
import { env } from '../../support/env';

// Profile edits and account deletion must never touch the seeded accounts, so every test in
// this file signs in as a throwaway staff account bound to a throwaway dealership.

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

async function bindStaff(
  request: APIRequestContext,
  adminApi: Api,
  dealer: { dealerId: number; dealerName: string },
): Promise<Throwaway> {
  const id = uniqueSuffix();
  const account = {
    username: `e2e.tmp.${id}`,
    displayName: `E2E Throwaway ${id}`,
    email: `e2e.tmp.${id}@example.com`,
    phone: randomPhone(),
    password: 'e2e-throwaway-pass-1',
  };
  const res = await adminApi.post(`/api/v1/admin/dealers/${dealer.dealerId}/members`, account);
  await expectStatus(res, 201);
  const login = await apiLogin(request, account.username, account.password);
  return { ...account, ...dealer, token: login.accessToken, api: new Api(request, login.accessToken) };
}

async function throwawayStaff(request: APIRequestContext, adminApi: Api) {
  return bindStaff(request, adminApi, await createDealer(adminApi));
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
  await expect(page.getByLabel('Display name')).toHaveValue(displayName);
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
    const me = await throwawayStaff(request, adminApi);
    await signInAs(page, me.token);

    const history = page.waitForResponse(
      (r) => r.url().includes('/api/v1/dealer/notifications') && r.url().includes('includeResolved=true'),
    );
    await page.goto('/team');
    expect((await history).status()).toBe(200);

    await expect(page.getByRole('heading', { name: 'Team', level: 1 })).toBeVisible();
    await expect(page.getByText('No join requests yet.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Team' })).toHaveClass(/active/);

    const bell = page.getByRole('button', { name: 'No join requests' });
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
    const first = await bindStaff(request, adminApi, dealer);
    const second = await bindStaff(request, adminApi, dealer);

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
    const me = await throwawayStaff(request, adminApi);
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
    const table = page.locator('table.table');
    const adaRow = table.getByRole('row', { name: /Ada Lee/ });
    const bobRow = table.getByRole('row', { name: /Bob Ray/ });

    await expect(adaRow).toContainText('ada@example.com');
    await expect(adaRow).toContainText('ada.lee');
    await expect(adaRow.locator('.chip')).toHaveText('Pending');
    await expect(bobRow.locator('.chip')).toHaveText('Rejected');
    await expect(bobRow).toContainText('by someone.else');
    await expect(bobRow).toContainText('—'); // no email
    await expect(bobRow.getByRole('button')).toHaveCount(0);

    // Header bell reflects the unresolved count.
    await expect(page.getByRole('button', { name: '1 join requests' })).toBeVisible();

    await adaRow.getByRole('button', { name: 'Approve' }).click();
    await expect(adaRow.locator('.chip')).toHaveText('Approved');
    await expect(adaRow.getByRole('button')).toHaveCount(0);
    await expect(adaRow).toContainText(`by ${me.username}`);
    expect(approveCalls).toHaveLength(1);
    expect(approveCalls[0]).toContain('/api/v1/dealer/join-requests/ada.lee/approve');

    // The header inbox refreshes from the change event, without a reload.
    await expect(page.getByRole('button', { name: 'No join requests' })).toBeVisible();
  });

  test('AUTH-25: header inbox lists pending requests, rejects one and opens Team', async ({
    page, request, adminApi,
  }) => {
    const me = await throwawayStaff(request, adminApi);
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
    const bell = page.getByRole('button', { name: '2 join requests' });
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
    await expect(page.getByRole('button', { name: '1 join requests' })).toBeVisible();
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
    const me = await throwawayStaff(request, adminApi);
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
    const me = await throwawayStaff(request, adminApi);
    await signInAs(page, me.token);

    await page.goto('/dms');
    await page.getByRole('link', { name: 'Open profile' }).click();
    await expect(page).toHaveURL(/\/profile$/);

    await expect(page.getByRole('heading', { name: 'Profile', level: 1 })).toBeVisible();
    await expect(page.getByText(`@${me.username}`)).toBeVisible();
    await expect(definition(page, 'Role')).toHaveText('Dealer.User');
    await expect(definition(page, 'Dealership')).toHaveText(me.dealerName);
    await expect(definition(page, 'Email')).toHaveText(me.email);
    await expect(definition(page, 'Phone')).toHaveText(me.phone);
    await expect(definition(page, 'Sign-in method')).toHaveText('Username / password sign-in');
    await expect(page.getByLabel('Display name')).toHaveValue(me.displayName);
    await expect(page.getByLabel('Phone')).toHaveValue(me.phone);
  });

  test('UI-profile: edits display name and phone; the change persists and reaches the header and members list', async ({
    page, request, adminApi,
  }) => {
    const me = await throwawayStaff(request, adminApi);
    await signInAs(page, me.token);
    await openProfile(page, me.displayName);

    const newName = `E2E Renamed ${uniqueSuffix()}`;
    const digits = randomDigits(7);
    const canonical = `+1403${digits}`;

    await page.getByLabel('Display name').fill(`  ${newName}  `);
    await page.getByLabel('Phone').fill(`+1 (403) ${digits.slice(0, 3)}-${digits.slice(3)}`);
    const saved = page.waitForResponse((r) => r.url().endsWith('/api/v1/me') && r.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Save changes' }).click();
    expect((await saved).status()).toBe(200);

    await expect(page.locator('.alert-success')).toHaveText('Profile saved.');
    await expect(page.locator('.card strong').first()).toHaveText(newName);
    await expect(definition(page, 'Phone')).toHaveText(canonical);
    await expect(page.getByRole('link', { name: 'Open profile' })).toContainText(newName);

    await page.reload();
    await expect(page.getByLabel('Display name')).toHaveValue(newName);
    await expect(page.getByLabel('Phone')).toHaveValue(canonical);

    const members = (await (await me.api.get('/api/v1/members')).json()) as { username: string; displayName: string }[];
    expect(members).toContainEqual(expect.objectContaining({ username: me.username, displayName: newName }));

    // The canonical phone works as a sign-in name.
    await apiLogin(request, canonical, me.password);
  });

  test('UI-profile: clearing the phone removes it', async ({ page, request, adminApi }) => {
    const me = await throwawayStaff(request, adminApi);
    await signInAs(page, me.token);
    await openProfile(page, me.displayName);

    await page.getByLabel('Phone').fill('   ');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.locator('.alert-success')).toHaveText('Profile saved.');
    await expect(definition(page, 'Phone')).toHaveText('—');

    const meRes = await me.api.get('/api/v1/me');
    // The gateway omits null members, so an absent key also means "no phone".
    expect(((await meRes.json()) as { phone?: string | null }).phone ?? null).toBeNull();
  });

  test('UI-profile: rejects a blank display name and an invalid phone with field errors', async ({
    page, request, adminApi, allowBrowserErrors,
  }) => {
    allowBrowserErrors(/400/);
    const me = await throwawayStaff(request, adminApi);
    await signInAs(page, me.token);
    await openProfile(page, me.displayName);

    const nameItem = page.locator('.form-item', { has: page.getByLabel('Display name') });
    const phoneItem = page.locator('.form-item', { has: page.getByLabel('Phone') });

    // Whitespace passes the browser "required" check, is trimmed to empty and rejected by the API.
    await page.getByLabel('Display name').fill('   ');
    let patch = page.waitForResponse((r) => r.url().endsWith('/api/v1/me') && r.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Save changes' }).click();
    expect((await patch).status()).toBe(400);
    await expect(page.locator('.alert-error')).toBeVisible();
    await expect(nameItem.locator('.form-error')).toBeVisible();

    await page.getByLabel('Display name').fill(me.displayName);
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

  test('UI-profile: DISPLAY_NAME_TAKEN when the full name belongs to another account (case-insensitive)', async ({
    page, request, adminApi, allowBrowserErrors,
  }) => {
    allowBrowserErrors(/409/);
    const me = await throwawayStaff(request, adminApi);
    await signInAs(page, me.token);
    await openProfile(page, me.displayName);

    // A seeded account's name is only read here, never changed.
    await page.getByLabel('Display name').fill(env.staff2.displayName.toUpperCase());
    const patch = page.waitForResponse((r) => r.url().endsWith('/api/v1/me') && r.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Save changes' }).click();
    const res = await patch;
    expect(res.status()).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('DISPLAY_NAME_TAKEN');

    const nameItem = page.locator('.form-item', { has: page.getByLabel('Display name') });
    await expect(nameItem.locator('.form-error')).toHaveText('That full name is already registered.');
    await expect(page.locator('.alert-error')).toBeVisible();
    await expect(page.locator('.alert-success')).toHaveCount(0);
    await expect(page.locator('.card strong').first()).toHaveText(me.displayName);

    // Saving your own current name is not a conflict.
    await page.getByLabel('Display name').fill(me.displayName);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.locator('.alert-success')).toHaveText('Profile saved.');
    await expect(nameItem.locator('.form-error')).toHaveCount(0);
  });

  test('UI-profile: PHONE_TAKEN when the phone belongs to another account', async ({
    page, request, adminApi, allowBrowserErrors,
  }) => {
    allowBrowserErrors(/409/);
    const dealer = await createDealer(adminApi);
    const me = await bindStaff(request, adminApi, dealer);
    const other = await bindStaff(request, adminApi, dealer);
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
    const me = await throwawayStaff(request, adminApi);
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
    const me = await bindStaff(request, adminApi, dealer);
    const colleague = await bindStaff(request, adminApi, dealer);
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
    const members = (await (await colleague.api.get('/api/v1/members')).json()) as { username: string }[];
    expect(members.map((m) => m.username)).toEqual([colleague.username]);
  });

  test('UI-profile: the platform admin sees that admin accounts cannot delete themselves', async ({
    adminPage: page,
  }) => {
    await page.goto('/profile');
    await expect(definition(page, 'Role')).toHaveText('Platform.Admin');
    await expect(definition(page, 'Dealership')).toHaveText('—');
    await expect(page.getByText('Platform admin accounts cannot delete themselves.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete my account' })).toHaveCount(0);
  });
});
