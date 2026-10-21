import { test, expect } from '../../support/fixtures';
import { aiAvailable, expectStatus, publishAd, randomDigits, uniqueSuffix, type Api } from '../../support/api';
import { env } from '../../support/env';

// Anonymous buyer site pages (design/21 SHOP-01 to SHOP-04) and the standalone disclaimer page
// (AD-14). The default `page` fixture is signed out; dealership data is read through the API.

test.describe.configure({ timeout: 120_000 });
const LOAD = { timeout: 30_000 };

async function dealerIdOf(api: Api) {
  const res = await api.get('/api/v1/me');
  await expectStatus(res, 200);
  return ((await res.json()) as { dealerId: number }).dealerId;
}

test('SHOP-01: the landing page links to the shop, which lists dealerships', async ({ page }) => {
  await page.goto('/');
  await page.locator('.landing-links').getByRole('link', { name: 'Shop vehicles' }).click();
  await expect(page.getByRole('heading', { name: 'Shop used vehicles', level: 1 })).toBeVisible();
  const card = page.getByRole('link').filter({ hasText: env.dealerA.legalName }).first();
  await expect(card).toBeVisible(LOAD);
  await card.click();
  await expect(page.getByRole('heading', { name: env.dealerA.legalName, level: 1 })).toBeVisible(LOAD);
  await expect(page.getByText(`${env.dealerA.contactAddress} · ${env.dealerA.contactPhone}`)).toBeVisible();
});

test('AD-14: the disclaimer page is public and linked from the landing page credit line', async ({ page }) => {
  await page.goto('/');
  await page.locator('.landing-credit').getByRole('link', { name: 'Disclaimer' }).click();
  await expect(page).toHaveURL(/\/disclaimer$/);
  await expect(page.getByRole('heading', { name: 'Disclaimer', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ad compliance checks are not legal advice' })).toBeVisible();
});

test('SHOP-01 / AD-14: the public pages do not scroll sideways at phone width', async ({ page, staffApi }) => {
  const dealerId = await dealerIdOf(staffApi);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/disclaimer', '/shop', `/shop/${dealerId}`]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible(LOAD);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBe(true);
  }
});

test('SHOP-01: an unknown dealership shows an error state', async ({ page, allowBrowserErrors }) => {
  allowBrowserErrors(/404/);
  await page.goto('/shop/999999999');
  await expect(page.locator('.alert-error, .state').first()).toBeVisible(LOAD);
  await expect(page.getByRole('button', { name: 'Ask about this vehicle' })).toHaveCount(0);
});

test.describe('with the real AI', () => {
  test('SHOP-02 / SHOP-04: a listed vehicle shows its card, and a question becomes a NEW lead', async ({
    page, request, staffApi, allowBrowserErrors,
  }) => {
    test.skip(!(await aiAvailable(request)), 'AI service is not UP');
    // The first, empty submit is rejected by the server with field errors.
    allowBrowserErrors(/400/);
    const colour = `Teal ${randomDigits(6)}`;
    const v = await staffApi.createVehicle({ mileageKm: 30500, exteriorColor: colour, fuelType: 'GASOLINE' });
    test.skip((await publishAd(staffApi, v)) === 502, 'AI provider unavailable during check');
    const dealerId = await dealerIdOf(staffApi);

    await page.goto(`/shop/${dealerId}`);
    const card = page.getByRole('article').filter({ hasText: colour });
    await expect(card).toHaveCount(1, LOAD);
    await expect(card).toContainText('30,500 km');
    await expect(card).not.toContainText(v.vin);

    await card.getByRole('button', { name: 'Ask about this vehicle' }).click();
    const drawer = page.getByRole('dialog', { name: 'Ask about this vehicle' });
    await drawer.getByRole('button', { name: 'Send question' }).click();
    await expect(drawer.getByText('Check the highlighted fields.')).toBeVisible(LOAD);
    await expect(drawer.locator('.form-error').first()).toBeVisible();

    const name = `UI Buyer ${uniqueSuffix()}`;
    await drawer.getByLabel('Name').fill(name);
    await drawer.getByLabel('Email').fill(`ui.buyer.${randomDigits(8)}@example.com`);
    await drawer.getByLabel('Phone').fill(`+1587${randomDigits(7)}`);
    await drawer.getByLabel('Home address').fill('1 Shop St, Calgary, AB');
    await drawer.getByLabel('Message').fill('Can I book a test drive?');
    await drawer.getByRole('button', { name: 'Send question' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'received your question' })).toBeVisible(LOAD);
    await expect(drawer).toBeHidden();

    // The dealership sees the inquiry as a NEW lead.
    const leads = await staffApi.get('/api/v1/leads', { q: name });
    await expectStatus(leads, 200);
    const found = (await leads.json()) as { items: { stage: string }[] };
    expect(found.items.map((l) => l.stage)).toEqual(['NEW']);
  });
});
