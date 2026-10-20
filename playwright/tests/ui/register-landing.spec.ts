import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { Api, apiLogin, expectError, expectStatus, randomDigits, uniqueSuffix } from '../../support/api';
import { env } from '../../support/env';

// Must match TOKEN_KEY in frontend/react/src/auth/login.ts.
const TOKEN_KEY = 'dealerops.accessToken';
const SAMPLE_VIN = '1HGCM82633A004352';

type NewAccount = { username: string; displayName: string; email: string; phone: string; password: string };

/** Unique sign-up values; username, full name, email and phone are each globally unique. */
function newAccount(): NewAccount {
  const s = uniqueSuffix();
  return {
    username: `e2e.reg.${s}`,
    displayName: `E2E Register ${s}`,
    email: `e2e.reg.${s}@example.com`,
    phone: `+1403${randomDigits(7)}`,
    password: 'e2e-register-pass-1',
  };
}

async function registerViaApi(request: APIRequestContext, account: Partial<NewAccount> & Record<string, unknown>) {
  return request.post(`${env.gatewayUrl}/api/v1/auth/register`, { data: account });
}

async function signIn(page: Page, token: string) {
  await page.addInitScript(
    ([key, value]) => window.sessionStorage.setItem(key, value),
    [TOKEN_KEY, token] as const,
  );
  return page;
}

/** Fills the register form. The email field is left blank on purpose: the UI sends any
 *  email through Firebase Auth (third party), so UI sign-ups here use phone only. */
async function fillRegisterForm(page: Page, values: { username?: string; displayName?: string; phone?: string; password?: string }) {
  if (values.username !== undefined) await page.getByPlaceholder('Username').fill(values.username);
  if (values.displayName !== undefined) await page.getByPlaceholder('Full name').fill(values.displayName);
  if (values.phone !== undefined) await page.getByPlaceholder('Phone (email, phone, or both)').fill(values.phone);
  if (values.password !== undefined) await page.getByPlaceholder('Password (at least 8 characters)').fill(values.password);
}

function fieldError(page: Page, placeholder: string) {
  return page.locator('.form-item', { has: page.getByPlaceholder(placeholder, { exact: true }) }).locator('.field-error');
}

async function expectNoAccessScreen(page: Page, username?: string) {
  await expect(page.getByRole('heading', { name: 'No access' })).toBeVisible();
  await expect(page.getByText('Your account is not provisioned yet. Contact your administrator.')).toBeVisible();
  await expect(page.getByText('Or ask to join one dealership. A member there can approve the request.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request to join' })).toBeVisible();
  if (username) await expect(page.getByText(`@${username}`)).toBeVisible();
}

test.describe('landing page', () => {
  test('UI-01: anonymous visitor sees Sign in, Create account and the VIN decoder', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create account' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Decode any VIN' })).toBeVisible();
    await expect(page.getByPlaceholder('17-character VIN')).toBeVisible();

    // Header links lead to the auth pages.
    await page.locator('.landing-auth-links').getByRole('link', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();

    await page.goto('/');
    await page.locator('.landing-auth-links').getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByPlaceholder('Email, username or phone number')).toBeVisible();
  });

  test('VIN-04: anonymous VIN decode on the landing page shows the vehicle facts', async ({ page, request }) => {
    const probe = await request.get(`${env.gatewayUrl}/api/v1/catalog/vin/${SAMPLE_VIN}`);
    test.skip(probe.status() === 502 || probe.status() === 503, 'NHTSA vPIC catalog is unavailable');
    await expectStatus(probe, 200);

    await page.goto('/');
    const decode = page.waitForResponse((r) => r.url().includes(`/api/v1/catalog/vin/${SAMPLE_VIN}`));
    await page.getByRole('button', { name: `Try ${SAMPLE_VIN}` }).click();
    const res = await decode;
    // Anonymous call: the page has no token, so no Authorization header is sent.
    expect(res.request().headers()['authorization']).toBeUndefined();
    expect(res.status()).toBe(200);

    const result = page.locator('.landing-vin-result');
    await expect(result.getByText('Decoded', { exact: true })).toBeVisible();
    await expect(result.getByText(/2003 HONDA Accord/i)).toBeVisible();
    await expect(result.locator('dt', { hasText: 'Manufacturer' })).toBeVisible();
    await expect(page.getByPlaceholder('17-character VIN')).toHaveValue(SAMPLE_VIN);
  });

  test('VIN-04: landing VIN decoder rejects an empty and a malformed VIN', async ({ page, allowBrowserErrors }) => {
    // The malformed VIN is an expected 400 that the browser logs as a console error.
    allowBrowserErrors(/400/);
    await page.goto('/');
    const input = page.getByPlaceholder('17-character VIN');

    await page.getByRole('button', { name: 'Decode', exact: true }).click();
    await expect(page.getByText('Enter a 17-character VIN.')).toBeVisible();

    await input.fill('1HGCM82633A00435I'); // contains I
    await page.getByRole('button', { name: 'Decode', exact: true }).click();
    await expect(page.getByText('VIN must be 17 characters (no I, O, Q).')).toBeVisible();
    await expect(page.locator('.landing-vin-result').getByText('Decoded', { exact: true })).toHaveCount(0);
  });

  test('UI-02: signed-in staff opening / goes to /dms', async ({ staffPage: page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dms$/);
    await expect(page.getByRole('heading', { name: 'DMS' })).toBeVisible();
  });

  test('UI-02: signed-in admin opening / goes to /admin', async ({ adminPage: page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
  });

  test('UI-02: after signing in through the form, in-app navigation to / returns to the role home', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email, username or phone number').fill(env.staff.username);
    await page.getByPlaceholder('Password').fill(env.staff.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dms$/);
    // Wait until the guard has loaded the profile into the session store.
    await expect(page.getByRole('heading', { name: 'DMS' })).toBeVisible();

    // Client-side navigation to "/" (session store already populated).
    await page.evaluate(() => {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page).toHaveURL(/\/dms$/);
  });
});

test.describe('register', () => {
  test('AUTH-15 UI-03: sign-up creates an unbound account that lands on the no-access screen', async ({ page, request }) => {
    const acct = newAccount();
    await page.goto('/register');
    await expect(page.getByText('An administrator adds your account to a dealership before you can use it.')).toBeVisible();
    await fillRegisterForm(page, acct);

    const registered = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/register') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Create account' }).click();
    const res = await registered;
    expect(res.status()).toBe(201);
    expect((await res.json()).role).toBe('Dealer.User');

    // Role home for a dealer user is /dms; the guard renders the no-access screen in place.
    await expect(page).toHaveURL(/\/dms$/);
    await expectNoAccessScreen(page, acct.username);
    await expect(page.getByRole('heading', { name: 'DMS' })).toHaveCount(0);

    // The new account signs in with username and phone, and has no dealership.
    const byPhone = await apiLogin(request, acct.phone, acct.password);
    expect(byPhone.role).toBe('Dealer.User');
    const login = await apiLogin(request, acct.username, acct.password);
    const api = new Api(request, login.accessToken);
    const me = await api.get('/api/v1/me');
    await expectStatus(me, 200);
    const profile = await me.json();
    expect(profile.role).toBe('Dealer.User');
    expect(profile.dealerId ?? null).toBeNull();
    await expectError(await api.get('/api/v1/vehicles'), 403, 'FORBIDDEN');
  });

  test('AUTH-15: self-registration cannot create a Platform.Admin', async ({ request }) => {
    const acct = newAccount();
    const res = await registerViaApi(request, { ...acct, role: 'Platform.Admin', dealerId: 1 });
    await expectStatus(res, 201);
    expect((await res.json()).role).toBe('Dealer.User');

    const login = await apiLogin(request, acct.email, acct.password);
    expect(login.role).toBe('Dealer.User');
    const api = new Api(request, login.accessToken);
    const profile = await (await api.get('/api/v1/me')).json();
    expect(profile.dealerId ?? null).toBeNull();
    await expectError(await api.get('/api/v1/admin/dealers'), 403, 'FORBIDDEN');
  });

  test('UI-03: the no-access user sees the notice on business pages and on /profile until approved', async ({ page, request }) => {
    const acct = newAccount();
    const res = await registerViaApi(request, acct);
    await expectStatus(res, 201);
    const { accessToken } = await res.json();
    await signIn(page, accessToken);

    await page.goto('/crm');
    await expect(page).toHaveURL(/\/crm$/);
    await expectNoAccessScreen(page, acct.username);
    // design/13: the no-access screen does not link to the profile.
    await expect(page.getByRole('link', { name: 'Manage account' })).toHaveCount(0);

    // A direct load of /profile shows the same no-access screen, not the profile.
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile$/);
    await expectNoAccessScreen(page, acct.username);
    await expect(page.getByRole('heading', { name: 'Profile' })).toHaveCount(0);
  });

  test('UI-02 UI-03: a signed-in unbound user opening / gets the no-access screen, not the marketing page', async ({ page, request }) => {
    const acct = newAccount();
    const res = await registerViaApi(request, acct);
    await expectStatus(res, 201);
    await signIn(page, (await res.json()).accessToken);

    // design/13 §1: signed in without business access, "/" follows the role landing.
    await page.goto('/');
    await expectNoAccessScreen(page, acct.username);
    await expect(page.getByRole('heading', { name: 'Decode any VIN' })).toHaveCount(0);
  });

  test('UI-04: anonymous visit to /profile redirects to sign in', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login\?notice=required/);
    await expect(page.getByText('Sign in required')).toBeVisible();
  });

  test('register form: blank submit shows an error under every required field and sends nothing', async ({ page }) => {
    let calls = 0;
    page.on('request', (r) => {
      if (r.url().includes('/api/v1/auth/')) calls += 1;
    });
    await page.goto('/register');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(fieldError(page, 'Username')).toHaveText('Enter a username.');
    await expect(fieldError(page, 'Full name')).toHaveText('Enter your full name.');
    await expect(fieldError(page, 'Email')).toHaveText('Enter an email address or a phone number.');
    await expect(fieldError(page, 'Phone (email, phone, or both)')).toHaveText('Enter an email address or a phone number.');
    await expect(fieldError(page, 'Password (at least 8 characters)')).toHaveText('Enter a password.');
    await expect(page).toHaveURL(/\/register$/);
    expect(calls).toBe(0);
  });

  test('register form: short password, bad username and bad phone are rejected client-side', async ({ page }) => {
    const acct = newAccount();
    await page.goto('/register');
    await fillRegisterForm(page, { username: '12', displayName: acct.displayName, phone: '12', password: 'short' });
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(fieldError(page, 'Password (at least 8 characters)')).toHaveText('Password must be 8–72 characters.');
    await expect(fieldError(page, 'Username')).toContainText('Use 3–64 letters');
    await expect(fieldError(page, 'Phone (email, phone, or both)')).toHaveText('Enter a valid phone number.');
    await expect(fieldError(page, 'Full name')).toHaveCount(0);

    // Editing a field clears its error.
    await page.getByPlaceholder('Password (at least 8 characters)').fill(acct.password);
    await expect(fieldError(page, 'Password (at least 8 characters)')).toHaveCount(0);
    await expect(page).toHaveURL(/\/register$/);
  });

  test('register form: duplicate username and phone show USERNAME_TAKEN / PHONE_TAKEN on their fields', async ({ page, request, allowBrowserErrors }) => {
    // The rejected sign-up is an expected 409 that the browser logs as a console error.
    allowBrowserErrors(/409/);
    const existing = newAccount();
    await expectStatus(await registerViaApi(request, existing), 201);

    const fresh = newAccount();
    await page.goto('/register');
    await fillRegisterForm(page, { ...fresh, username: existing.username });
    const first = page.waitForResponse((r) => r.url().includes('/api/v1/auth/register'));
    await page.getByRole('button', { name: 'Create account' }).click();
    const r1 = await first;
    expect(r1.status()).toBe(409);
    expect((await r1.json()).code).toBe('USERNAME_TAKEN');
    await expect(fieldError(page, 'Username')).toBeVisible();
    await expect(fieldError(page, 'Phone (email, phone, or both)')).toHaveCount(0);
    await expect(page).toHaveURL(/\/register$/);

    // Fix the username, reuse the existing phone.
    await fillRegisterForm(page, { username: fresh.username, phone: existing.phone });
    await expect(fieldError(page, 'Username')).toHaveCount(0);
    const second = page.waitForResponse((r) => r.url().includes('/api/v1/auth/register'));
    await page.getByRole('button', { name: 'Create account' }).click();
    const r2 = await second;
    expect(r2.status()).toBe(409);
    expect((await r2.json()).code).toBe('PHONE_TAKEN');
    await expect(fieldError(page, 'Phone (email, phone, or both)')).toBeVisible();
    await expect(fieldError(page, 'Username')).toHaveCount(0);
    await expect(page).toHaveURL(/\/register$/);
  });

  test('AUTH-16: a local 10-digit phone is stored as +1 and signs in typed either way', async ({ request }) => {
    const local = `403${randomDigits(7)}`;
    const acct = { ...newAccount(), phone: `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}` };
    const res = await registerViaApi(request, acct);
    await expectStatus(res, 201);
    const me = await request.get(`${env.gatewayUrl}/api/v1/me`, {
      headers: { Authorization: `Bearer ${(await res.json()).accessToken}` },
    });
    expect((await me.json()).phone).toBe(`+1${local}`);

    for (const identifier of [acct.phone, `+1${local}`]) {
      const login = await request.post(`${env.gatewayUrl}/api/v1/auth/login`, {
        data: { identifier, password: acct.password },
      });
      expect(login.status(), identifier).toBe(200);
    }
  });

  test('AUTH-16 §1.5: duplicate username / email / phone return per-field 409 codes', async ({ request }) => {
    const existing = newAccount();
    await expectStatus(await registerViaApi(request, existing), 201);

    const dupUser = await registerViaApi(request, { ...newAccount(), username: existing.username });
    await expectError(dupUser, 409, 'USERNAME_TAKEN');

    const dupEmail = await registerViaApi(request, { ...newAccount(), email: existing.email.toUpperCase() });
    const emailBody = await dupEmail.json();
    expect(dupEmail.status()).toBe(409);
    expect(emailBody.code).toBe('EMAIL_TAKEN');
    expect(Object.keys(emailBody.fieldErrors ?? {})).toContain('email');

    const dupPhone = await registerViaApi(request, { ...newAccount(), phone: existing.phone });
    await expectError(dupPhone, 409, 'PHONE_TAKEN');

    // Several taken values: code is the first in contract order, fieldErrors lists all.
    const all = await registerViaApi(request, { ...newAccount(), username: existing.username, email: existing.email });
    const allBody = await all.json();
    expect(all.status()).toBe(409);
    expect(allBody.code).toBe('USERNAME_TAKEN');
    expect(Object.keys(allBody.fieldErrors ?? {})).toEqual(expect.arrayContaining(['username', 'email']));

    // Validation: short password; neither email nor phone (both keys set).
    const shortPw = await registerViaApi(request, { ...newAccount(), password: 'short' });
    const shortBody = await shortPw.json();
    expect(shortPw.status()).toBe(400);
    expect(shortBody.code).toBe('VALIDATION');
    expect(Object.keys(shortBody.fieldErrors ?? {})).toContain('password');

    const noContact = await registerViaApi(request, { ...newAccount(), email: '', phone: '' });
    const noContactBody = await noContact.json();
    expect(noContact.status()).toBe(400);
    expect(noContactBody.code).toBe('VALIDATION');
    expect(Object.keys(noContactBody.fieldErrors ?? {})).toEqual(expect.arrayContaining(['email', 'phone']));
  });
});
