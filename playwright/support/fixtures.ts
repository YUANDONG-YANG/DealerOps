import { test as base, expect, type Page } from '@playwright/test';
import { Api, apiLogin } from './api';
import { env } from './env';

// Must match TOKEN_KEY in frontend/react/src/auth/login.ts. The app keeps the token in
// sessionStorage, which Playwright storageState does not persist, so it is injected per page.
const TOKEN_KEY = 'dealerops.accessToken';

type Fixtures = {
  /** Page signed in as the platform admin. */
  adminPage: Page;
  /** Page signed in as the first staff user of dealer A. */
  staffPage: Page;
  /** Gateway clients for each seeded identity. */
  adminApi: Api;
  staffApi: Api;
  staff2Api: Api;
  rivalApi: Api;
  /** Collected browser errors; the test fails if any remain at the end. */
  browserErrors: string[];
  /** Marks browser errors matching the pattern as expected for this test. */
  allowBrowserErrors: (pattern: RegExp) => void;
};

function isAppUrl(url: string) {
  return url.startsWith(env.webUrl) || url.startsWith(env.gatewayUrl);
}

async function signedInPage(page: Page, token: string) {
  await page.addInitScript(
    ([key, value]) => window.sessionStorage.setItem(key, value),
    [TOKEN_KEY, token] as const,
  );
  return page;
}

export const test = base.extend<Fixtures & { allowedErrorPatterns: RegExp[] }>({
  allowedErrorPatterns: async ({}, use) => {
    await use([]);
  },

  allowBrowserErrors: async ({ allowedErrorPatterns }, use) => {
    await use((pattern) => allowedErrorPatterns.push(pattern));
  },

  // Auto fixture: uncaught exceptions, app console errors and 5xx responses fail the test,
  // so bugs that do not break the asserted flow are still reported.
  browserErrors: [
    async ({ page, allowedErrorPatterns }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        // Third-party widgets (e.g. Google Identity Services) log their own errors; only
        // errors raised by the app itself are treated as failures.
        const source = msg.location().url;
        if (source && !isAppUrl(source)) return;
        errors.push(`console.error: ${msg.text()} (${source})`);
      });
      page.on('response', (res) => {
        if (res.status() >= 500) errors.push(`HTTP ${res.status()}: ${res.request().method()} ${res.url()}`);
      });
      await use(errors);
      const unexpected = errors.filter((e) => !allowedErrorPatterns.some((p) => p.test(e)));
      expect(unexpected, 'browser errors during test').toEqual([]);
    },
    { auto: true },
  ],

  adminApi: async ({ request }, use) => {
    await use(await Api.as(request, env.admin.identifier, env.admin.password));
  },
  staffApi: async ({ request }, use) => {
    await use(await Api.as(request, env.staff.username, env.staff.password));
  },
  staff2Api: async ({ request }, use) => {
    await use(await Api.as(request, env.staff2.username, env.staff2.password));
  },
  rivalApi: async ({ request }, use) => {
    await use(await Api.as(request, env.rival.username, env.rival.password));
  },

  adminPage: async ({ page, request }, use) => {
    const login = await apiLogin(request, env.admin.identifier, env.admin.password);
    await use(await signedInPage(page, login.accessToken));
  },

  staffPage: async ({ page, request }, use) => {
    const login = await apiLogin(request, env.staff.username, env.staff.password);
    await use(await signedInPage(page, login.accessToken));
  },
});

export { expect };
