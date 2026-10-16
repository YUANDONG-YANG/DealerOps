import type { Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { env } from '../../support/env';
import { apiLogin } from '../../support/api';

// Cross-cutting UI requirements: release footer (NFR-08), English UI (NFR-03), phone width
// (NFR-06), gateway-only access (ARC-03 / AT-23), redirect preservation (UI-04) and a 401
// in the middle of a session.

const TOKEN_KEY = 'dealerops.accessToken';
const UTC_SECOND = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const CORE_URL = (process.env.E2E_CORE_URL ?? 'http://127.0.0.1:8081').replace(/\/$/, '');

const dealerPages = ['/dms', '/crm', '/leads', '/ads', '/team', '/profile'];

async function signInThroughForm(page: Page, username: string, password: string) {
  await page.getByPlaceholder('Email, username or phone number').fill(username);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Footer line value for one app, e.g. "core 2026-10-16T17:41:14Z" -> "2026-10-16T17:41:14Z". */
async function footerValue(page: Page, app: string) {
  const line = page.locator('.app-footer > div', { hasText: new RegExp(`^${app} `) });
  const text = (await line.innerText()).trim();
  return text.slice(app.length + 1).trim();
}

test.describe('NFR-08 release footer', () => {
  test('NFR-08: gateway serves release times anonymously', async ({ request }) => {
    const res = await request.get(`${env.gatewayUrl}/actuator/release`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.gateway).toMatch(UTC_SECOND);
    expect(body.core).toMatch(UTC_SECOND);
    expect(typeof body.ai).toBe('string');
  });

  const pages: { path: string; who: 'anonymous' | 'staff' | 'admin' }[] = [
    { path: '/login', who: 'anonymous' },
    { path: '/register', who: 'anonymous' },
    ...dealerPages.map((path) => ({ path, who: 'staff' as const })),
    { path: '/admin', who: 'admin' },
  ];

  for (const { path, who } of pages) {
    test(`NFR-08: ${path} shows web / gateway / core / ai release times at the bottom left`, async ({
      page,
      staffPage,
      adminPage,
      request,
    }) => {
      const p = who === 'staff' ? staffPage : who === 'admin' ? adminPage : page;
      const release = (await (await request.get(`${env.gatewayUrl}/actuator/release`)).json()) as Record<
        string,
        string
      >;

      const releaseCall = p.waitForRequest((r) => r.url().endsWith('/actuator/release') && r.method() === 'GET');
      await p.goto(path);
      const call = await releaseCall;
      // localhost and 127.0.0.1 are the same host locally; the port identifies the gateway.
      expect(new URL(call.url()).port, 'release times are read from the gateway').toBe(
        new URL(env.gatewayUrl).port,
      );

      const footer = p.locator('footer.app-footer');
      await expect(footer).toBeVisible();
      await expect(footer.locator('.app-footer-title')).toHaveText('Published (UTC)');

      // Values settle once /actuator/release answers.
      await expect.poll(() => footerValue(p, 'gateway')).toBe(release.gateway);
      expect(await footerValue(p, 'core')).toBe(release.core);
      expect(await footerValue(p, 'ai')).toBe(release.ai);
      const web = await footerValue(p, 'web');
      expect(web).toMatch(UTC_SECOND);
      if (release.web && release.web !== 'unavailable') expect(web).toBe(release.web);

      // Bottom left of the viewport.
      const box = await footer.boundingBox();
      const viewport = p.viewportSize()!;
      expect(box).not.toBeNull();
      expect(box!.x).toBeLessThan(viewport.width / 4);
      expect(box!.y + box!.height).toBeGreaterThan(viewport.height - 40);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
    });
  }
});

test.describe('NFR-03 English UI', () => {
  // Any CJK, Hangul or Kana character in visible text means a non-English string leaked into the UI.
  const nonEnglish = /[぀-ヿ㐀-䶿一-鿿가-힯＀-￯]/;

  test('NFR-03: public pages are in English', async ({ page }) => {
    for (const path of ['/', '/login', '/register']) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('body')).not.toHaveText(/^\s*$/);
      const text = await page.locator('body').innerText();
      expect(text, `${path} visible text`).not.toMatch(nonEnglish);
    }
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('NFR-03: dealer pages are in English', async ({ staffPage }) => {
    const headings: Record<string, string> = {
      '/dms': 'DMS',
      '/crm': 'CRM',
      '/leads': 'Leads',
      '/ads': 'Ad compliance',
      '/team': 'Team',
      '/profile': 'Profile',
    };
    for (const path of dealerPages) {
      await staffPage.goto(path);
      await expect(staffPage.getByRole('heading', { name: headings[path], exact: true })).toBeVisible();
      const text = await staffPage.locator('body').innerText();
      expect(text, `${path} visible text`).not.toMatch(nonEnglish);
    }
  });

  test('NFR-03: admin page is in English', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await expect(adminPage.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible();
    const text = await adminPage.locator('body').innerText();
    expect(text).not.toMatch(nonEnglish);
  });
});

test.describe('NFR-06 phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  async function expectNoHorizontalScroll(page: Page, label: string) {
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return { scroll: doc.scrollWidth, client: doc.clientWidth };
    });
    expect(overflow.scroll, `${label}: page scrollWidth vs clientWidth`).toBeLessThanOrEqual(overflow.client);
  }

  test('NFR-06: login and register fit 390px without horizontal scroll', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expectNoHorizontalScroll(page, '/login');
    // The form stays usable: sign-in works at this width.
    await page.goto('/register');
    await expect(page.locator('body')).not.toHaveText(/^\s*$/);
    await expectNoHorizontalScroll(page, '/register');
  });

  test('NFR-06: sign in works at 390px', async ({ page }) => {
    await page.goto('/login');
    await signInThroughForm(page, env.staff.username, env.staff.password);
    await expect(page).toHaveURL(/\/dms$/);
    await expect(page.getByRole('heading', { name: 'DMS', exact: true })).toBeVisible();
  });

  for (const path of dealerPages) {
    test(`NFR-06: ${path} fits 390px without horizontal page scroll`, async ({ staffPage }) => {
      await staffPage.goto(path);
      await expect(staffPage.getByRole('heading', { level: 1 }).or(staffPage.getByRole('heading', { level: 2 })).first()).toBeVisible();
      await expect(staffPage.locator('.state', { hasText: 'Loading…' })).toHaveCount(0);
      await expectNoHorizontalScroll(staffPage, path);
    });
  }

  test('NFR-06: /admin fits 390px without horizontal page scroll', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await expect(adminPage.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible();
    await expectNoHorizontalScroll(adminPage, '/admin');
  });
});

test.describe('ARC-03 / AT-23 gateway-only access', () => {
  test('AT-23: a page on the web origin cannot call dealer-core directly', async ({
    staffPage,
    request,
    allowBrowserErrors,
  }) => {
    // The blocked cross-origin call is logged by the browser.
    allowBrowserErrors(/CORS|8081|Failed to fetch|ERR_/i);
    const token = await apiLogin(request, env.staff.username, env.staff.password);

    await staffPage.goto('/dms');
    await expect(staffPage.getByRole('heading', { name: 'DMS', exact: true })).toBeVisible();

    const result = await staffPage.evaluate(
      async ({ url, bearer }) => {
        const attempt = async (init?: RequestInit) => {
          try {
            const res = await fetch(url, init);
            return { ok: res.ok, status: res.status, readable: true };
          } catch (e) {
            return { ok: false, status: 0, readable: false, error: String(e) };
          }
        };
        return {
          anonymous: await attempt(),
          withToken: await attempt(bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : undefined),
        };
      },
      { url: `${CORE_URL}/api/v1/vehicles`, bearer: token.accessToken },
    );

    // Either the network call fails or CORS blocks the response; it must never be readable.
    expect(result.anonymous.readable, JSON.stringify(result.anonymous)).toBe(false);
    expect(result.withToken.readable, JSON.stringify(result.withToken)).toBe(false);
  });

  test('ARC-03: a gateway URL pointing at core is ignored; the app still talks only to the gateway', async ({
    staffPage,
  }) => {
    await staffPage.addInitScript((core) => {
      (window as unknown as { __DEALER_GATEWAY_URL__?: string }).__DEALER_GATEWAY_URL__ = core;
    }, CORE_URL);
    const forbidden: string[] = [];
    staffPage.on('request', (r) => {
      const url = r.url();
      if (/:8081\b|:8082\b/.test(new URL(url).host) || new URL(url).pathname.includes('/internal')) forbidden.push(url);
    });

    await staffPage.goto('/dms');
    await expect(staffPage.getByRole('heading', { name: 'DMS', exact: true })).toBeVisible();
    await staffPage.goto('/crm');
    await expect(staffPage.getByRole('heading', { name: 'CRM', exact: true })).toBeVisible();
    expect(forbidden).toEqual([]);
  });

  test('ARC-03: the frontend HTTP client refuses /internal URLs', async ({ staffPage }) => {
    test.skip(!env.isLocal, 'Loads the HTTP client module from the Vite dev server');
    const sent: string[] = [];
    staffPage.on('request', (r) => {
      if (new URL(r.url()).pathname.includes('/internal')) sent.push(r.url());
    });

    await staffPage.goto('/dms');
    await expect(staffPage.getByRole('heading', { name: 'DMS', exact: true })).toBeVisible();

    const outcome = await staffPage.evaluate(async () => {
      const modulePath = '/src/api/http.ts';
      const mod = (await import(/* @vite-ignore */ modulePath)) as {
        http: { get: (url: string) => Promise<unknown> };
      };
      const results: string[] = [];
      for (const url of ['/internal/dealers', '/api/v1/internal/vehicles']) {
        try {
          await mod.http.get(url);
          results.push(`${url}: sent`);
        } catch (e) {
          results.push(`${url}: ${(e as Error).message}`);
        }
      }
      return results;
    });

    expect(outcome).toEqual([
      '/internal/dealers: Browser must not call /internal',
      '/api/v1/internal/vehicles: Browser must not call /internal',
    ]);
    expect(sent).toEqual([]);
  });
});

test.describe('UI-04 redirect preservation and session expiry', () => {
  test('UI-04: anonymous deep link keeps path and query string through sign in', async ({ page }) => {
    const target = `/crm?q=redirect-${Date.now()}&page=2`;
    await page.goto(target);
    await expect(page).toHaveURL(/\/login\?/);
    const loginUrl = new URL(page.url());
    expect(loginUrl.searchParams.get('notice')).toBe('required');
    expect(loginUrl.searchParams.get('redirect')).toBe(target);
    await expect(page.getByText('Sign in required')).toBeVisible();

    await signInThroughForm(page, env.staff.username, env.staff.password);
    await expect(page.getByRole('heading', { name: 'CRM', exact: true })).toBeVisible();
    const landed = new URL(page.url());
    expect(`${landed.pathname}${landed.search}`).toBe(target);
  });

  test('UI-04: a 401 during a session sends the user to /login?notice=required', async ({
    page,
    allowBrowserErrors,
  }) => {
    // The rejected API call is an expected 401 that the browser logs.
    allowBrowserErrors(/401/);
    await page.goto('/login');
    await signInThroughForm(page, env.staff.username, env.staff.password);
    await expect(page).toHaveURL(/\/dms$/);
    await expect(page.getByRole('heading', { name: 'DMS', exact: true })).toBeVisible();

    // The token disappears mid-session (expired or cleared); the next API call gets 401.
    await page.evaluate((key) => window.sessionStorage.removeItem(key), TOKEN_KEY);
    const unauthorized = page.waitForResponse((r) => r.url().includes('/api/v1/') && r.status() === 401);
    await page.locator('.side-menu').getByRole('link', { name: 'CRM' }).click();
    await unauthorized;

    await expect(page).toHaveURL(/\/login\?notice=required$/);
    await expect(page.getByText('Sign in required')).toBeVisible();
    expect(await page.evaluate((key) => window.sessionStorage.getItem(key), TOKEN_KEY)).toBeNull();
  });
});
