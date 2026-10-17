import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { apiLogin } from '../support/api';
import { env } from '../support/env';

// Role walkthrough (`npm run test:roles`): the platform admin and the standard dealer user open
// every page they can reach on desktop and phone widths. The browserErrors fixture fails the
// test on page errors, app console errors and 5xx responses; this spec adds the layout check.

const TOKEN_KEY = 'dealerops.accessToken';

const roles = [
  { name: 'admin', account: () => env.admin, routes: ['/admin', '/profile'] },
  {
    name: 'dealer user',
    account: () => ({ identifier: env.dealerUser.username, password: env.dealerUser.password }),
    routes: ['/dms', '/crm', '/leads', '/ads', '/team', '/profile'],
  },
];

const viewports = [
  { name: 'desktop', width: 1366, height: 820 },
  { name: 'phone', width: 390, height: 844 },
];

/** Page blocks whose right edge passes the viewport, including ones an ancestor clips. */
async function blocksPastViewport(page: Page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return [...document.querySelectorAll('.page-header, .filters, .card, .form-item')]
      .filter((el) => el.getBoundingClientRect().right > width + 1)
      .map((el) => `${el.className} right=${Math.round(el.getBoundingClientRect().right)} > ${width}`);
  });
}

for (const role of roles) {
  for (const viewport of viewports) {
    test(`roles: ${role.name} opens every page on ${viewport.name} without errors or overflow`, async ({ page, request }) => {
      const { identifier, password } = role.account();
      const login = await apiLogin(request, identifier, password);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.addInitScript(([key, value]) => window.sessionStorage.setItem(key, value), [TOKEN_KEY, login.accessToken] as const);

      for (const route of role.routes) {
        await test.step(route, async () => {
          await page.goto(route);
          await expect(page).toHaveURL(new RegExp(`${route}$`));
          await expect(page.locator('h1').first()).toBeVisible();
          await page.waitForLoadState('networkidle');
          const pageWidth = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
          expect(pageWidth[0], `${route} scrolls sideways`).toBeLessThanOrEqual(pageWidth[1]);
          expect(await blocksPastViewport(page), `${route} blocks past the viewport`).toEqual([]);
        });
      }
    });
  }
}
