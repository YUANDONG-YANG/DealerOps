import { test, expect } from '../../support/fixtures';
import { aiAvailable, expectStatus, publishAd, randomDigits, uniqueSuffix, type Api } from '../../support/api';
import { env } from '../../support/env';

// Anonymous buyer site pages (design/21 SHOP-01 to SHOP-04, change request CR-065 to CR-068) and
// the standalone disclaimer page (AD-14). The default `page` fixture is signed out; dealership data
// is read through the API.

test.describe.configure({ timeout: 120_000 });
const LOAD = { timeout: 30_000 };

async function dealerIdOf(api: Api) {
  const res = await api.get('/api/v1/me');
  await expectStatus(res, 200);
  return ((await res.json()) as { dealerId: number }).dealerId;
}

test('SHOP-01 CR-065 CR-066: the landing page links to the shop, which searches dealerships and shows their contact details', async ({ page }) => {
  await page.goto('/');
  await page.locator('.landing-links').getByRole('link', { name: 'Shop vehicles' }).click();
  // CR-065: the shop does not label the inventory "used"; dealerships also sell new vehicles.
  await expect(page.getByRole('heading', { name: 'Shop vehicles', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shop used vehicles', level: 1 })).toHaveCount(0);
  await expect(page.locator('.landing-section').first()).not.toContainText(/\bused\b/i);

  const card = page.getByRole('link').filter({ hasText: env.dealerA.legalName }).first();
  await expect(card).toBeVisible(LOAD);
  // CR-066: each card carries the dealership's address and contact details.
  await expect(card).toContainText(env.dealerA.contactAddress);
  await expect(card).toContainText(env.dealerA.contactPhone);
  await expect(card).toContainText(env.dealerA.contactEmail);

  // CR-066: the search box filters the directory by name or city.
  const search = page.getByLabel('Search dealerships');
  await search.fill(env.dealerB.legalName);
  await expect(page.getByRole('link').filter({ hasText: env.dealerB.legalName })).toBeVisible(LOAD);
  await expect(page.getByRole('link').filter({ hasText: env.dealerA.legalName })).toHaveCount(0);
  await search.fill(`no-such-dealership-${uniqueSuffix()}`);
  await expect(page.getByText('No dealerships match your search.')).toBeVisible();
  await search.fill('');

  await card.click();
  await expect(page.getByRole('heading', { name: env.dealerA.legalName, level: 1 })).toBeVisible(LOAD);
  const contact = page.locator('.landing-section p.muted').first();
  await expect(contact).toContainText(env.dealerA.contactAddress);
  await expect(contact).toContainText(env.dealerA.contactPhone);
  await expect(contact).toContainText(env.dealerA.contactEmail);
});

test('CR-067: the dealership page has a back button to the dealership list', async ({ page, staffApi }) => {
  const dealerId = await dealerIdOf(staffApi);
  await page.goto(`/shop/${dealerId}`);
  await expect(page.getByRole('heading', { name: env.dealerA.legalName, level: 1 })).toBeVisible(LOAD);
  await page.getByRole('link', { name: '← Back to dealerships' }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByRole('heading', { name: 'Shop vehicles', level: 1 })).toBeVisible();
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
  test('SHOP-02 / SHOP-04 / CR-067 / CR-068: a listed vehicle shows its card, the inventory is searchable, the message counter appears, and a question becomes a NEW lead', async ({
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

    // CR-067: the inventory search matches year, make and model, word by word.
    const search = page.getByLabel("Search this dealership's vehicles");
    await search.fill(`${v.modelYear} ${v.model}`);
    await expect(card).toHaveCount(1, LOAD);
    await search.fill(`no-such-vehicle-${uniqueSuffix()}`);
    await expect(page.getByText('No vehicles match your search.')).toBeVisible();
    await expect(card).toHaveCount(0);
    await search.fill('');
    await expect(card).toHaveCount(1, LOAD);

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

    // CR-068: the remaining-character line stays hidden until the 1000-character limit is near.
    const message = drawer.getByLabel('Message');
    await message.fill('Can I book a test drive?');
    await expect(drawer.getByText(/characters left/)).toHaveCount(0);
    await message.fill('x'.repeat(960));
    await expect(drawer.getByText('40 of 1000 characters left')).toBeVisible();
    await message.fill('x'.repeat(1000));
    await expect(drawer.getByText('0 of 1000 characters left')).toBeVisible();
    await message.fill('Can I book a test drive?');
    await expect(drawer.getByText(/characters left/)).toHaveCount(0);

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
