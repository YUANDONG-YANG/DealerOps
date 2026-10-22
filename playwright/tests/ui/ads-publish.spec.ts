import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { aiAvailable, expectError, expectStatus, randomDigits, type Api, type Vehicle } from '../../support/api';
import { env } from '../../support/env';

// Publishing an ad end to end: write it on /ads, check it, mark it ready, and find it Listed in the
// Ads table and on the buyer site (design/21 SHOP-01, design/13 §5.6); a sale takes it down.
// Other workers publish ads for the same dealership, so counts are compared within one page only.

const LOAD = { timeout: 30_000 };
const dealer = env.dealerA;

// The ad form labels have no htmlFor, so fields are located through their .form-item wrapper.
function field(page: Page, label: string, control: 'input' | 'textarea' | 'select'): Locator {
  return page
    .locator('.form-item', { has: page.locator('label.form-label', { hasText: new RegExp(`^${label}$`) }) })
    .locator(control);
}

async function dealerOf(api: Api) {
  const me = await api.get('/api/v1/me');
  await expectStatus(me, 200);
  const { dealerId } = (await me.json()) as { dealerId: number };
  const res = await api.get('/api/v1/catalog/dealers');
  await expectStatus(res, 200);
  const found = ((await res.json()) as { id: number; slug: string }[]).find((d) => d.id === dealerId);
  expect(found, `dealer ${dealerId} in the public directory`).toBeTruthy();
  return { dealerId, slug: found!.slug };
}

/** Narrows the Ads vehicle table to one VIN with the given buyer-site filter. */
async function filterAds(page: Page, vin: string, buyerSite: '' | 'LISTED' | 'NOT_LISTED' | 'TAKEN_DOWN') {
  const filters = page.locator('.ads-filters');
  await filters.getByLabel('Search vehicles', { exact: true }).fill(vin);
  await filters.getByLabel('Buyer site', { exact: true }).selectOption(buyerSite);
  // The table asks for a page of 10; type-ahead suggestions for the same text ask for fewer.
  const listed = page.waitForResponse((r) => /\/api\/v1\/vehicles\?/.test(r.url()) && r.url().includes(vin)
    && r.url().includes('size=10'));
  await filters.getByRole('button', { name: 'Search' }).click();
  expect((await listed).status()).toBe(200);
}

/** The vehicle's row once the table has narrowed to that one VIN. */
async function adsRow(page: Page, v: Vehicle) {
  const rows = page.locator('.card', { has: page.locator('.card-header', { hasText: /^Vehicles$/ }) }).locator('tbody tr');
  await expect(rows).toHaveCount(1, LOAD);
  await expect(rows).toContainText(`${v.modelYear} ${v.make} ${v.model}`);
  return rows;
}

test.describe('with the real AI', () => {
  test.describe.configure({ timeout: 120_000 });

  test('SHOP-01 / AD-12: an ad written, checked and marked ready on /ads is Listed and on the buyer site; a sale takes it down', async ({
    staffPage: page, staffApi, request, allowBrowserErrors,
  }) => {
    test.skip(!(await aiAvailable(request)), 'AI service is not UP');
    allowBrowserErrors(/HTTP 502: POST .*\/api\/v1\/listings\/\d+\/checks/);
    allowBrowserErrors(/status code 502|502 \(Bad Gateway\)/i);

    const colour = `Harbour Blue ${randomDigits(6)}`;
    const v = await staffApi.createVehicle({ exteriorColor: colour });
    const { dealerId, slug } = await dealerOf(staffApi);
    const title = `${v.modelYear} ${v.make} ${v.model} ${colour}`;
    const body = `Used ${v.modelYear} ${v.make} ${v.model}, sold as-is. Cash price $18,900 plus HST and licensing. `
      + 'Not used as a taxi, police vehicle, or daily rental. No extended warranty offered. '
      + `${dealer.legalName}, ${dealer.contactPhone}, ${dealer.contactEmail}, ${dealer.contactAddress}.`;

    // Write the ad in the workspace and save it.
    await page.goto(`/ads?vehicleId=${v.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading listing…')).toHaveCount(0);
    await field(page, 'Title', 'input').fill(title);
    await field(page, 'Body', 'textarea').fill(body);
    await field(page, 'Type', 'select').selectOption('CASH');
    await field(page, 'Medium', 'select').selectOption('ONLINE');
    const saved = page.waitForResponse(
      (r) => r.url().endsWith(`/api/v1/vehicles/${v.id}/listing`) && r.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Save draft' }).click();
    expect((await saved).status()).toBe(200);

    // A saved but unchecked ad is not on the buyer site.
    await filterAds(page, v.vin, 'NOT_LISTED');
    await expect(await adsRow(page, v)).toContainText('Not listed', LOAD);

    // Rules, then the real AI review.
    const checked = page.waitForResponse(
      (r) => /\/api\/v1\/listings\/\d+\/checks$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 60_000 },
    );
    await page.getByRole('button', { name: 'Run check' }).click();
    const checkRes = await checked;
    if (checkRes.status() === 502) {
      const text = await checkRes.text();
      test.skip(text.includes('AI_UNAVAILABLE'), `AI provider unavailable during check: ${text}`);
    }
    expect(checkRes.status(), await checkRes.text()).toBe(200);
    await expect(page.locator('.result-pane').getByRole('status')).toHaveText('Passed', LOAD);

    // Passed but not ready yet: the table asks for Mark ready.
    await filterAds(page, v.vin, '');
    await expect(await adsRow(page, v)).toContainText('Mark ready', LOAD);

    const readied = page.waitForResponse(
      (r) => /\/api\/v1\/listings\/\d+\/ready$/.test(r.url()) && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Mark ready' }).click();
    expect((await readied).status()).toBe(200);

    // The Ads table now shows it Listed, found by the Listed filter, under a live listed count.
    await filterAds(page, v.vin, 'LISTED');
    await expect(await adsRow(page, v)).toContainText('Listed', LOAD);
    await expect(page.getByText(/vehicles? (is|are) listed on your/)).toBeVisible(LOAD);

    // The buyer site: an id link settles on the slug, the card is there without the VIN, and the
    // listed count matches the cards on the same page.
    await page.goto(`/shop/${dealerId}`);
    await expect(page).toHaveURL(new RegExp(`/shop/${slug}$`), LOAD);
    const card = page.getByRole('article').filter({ hasText: colour });
    await expect(card).toHaveCount(1, LOAD);
    await expect(card).toContainText(title);
    await expect(card).not.toContainText(v.vin);
    const cards = await page.getByRole('article').count();
    await expect(page.locator('.dealer-page-stats strong')).toHaveText(cards.toLocaleString('en-CA'));

    // Selling takes the ad down: the Ads table says so and the buyer site drops the card.
    await staffApi.sellVehicle(v);
    await page.goto('/ads');
    await filterAds(page, v.vin, 'TAKEN_DOWN');
    await expect(await adsRow(page, v)).toContainText('Taken down', LOAD);
    await page.goto(`/shop/${slug}`);
    await expect(page.getByRole('heading', { name: dealer.legalName, level: 1 })).toBeVisible(LOAD);
    await expect(page.getByRole('article').filter({ hasText: colour })).toHaveCount(0);
  });
});

test('Ad filters: a vehicle without a saved ad counts as its virtual draft, and an unknown check status is rejected', async ({
  staffApi,
}) => {
  const v = await staffApi.createVehicle();
  const ids = async (query: Record<string, string>) => {
    const res = await staffApi.get('/api/v1/vehicles', { q: v.vin, size: '50', ...query });
    await expectStatus(res, 200);
    return ((await res.json()) as { items: { id: number }[] }).items.map((x) => x.id);
  };

  // The virtual draft (14 §7.1) is Cash, Online, Needs AI review and not listed.
  expect(await ids({ adKind: 'CASH' })).toEqual([v.id]);
  expect(await ids({ medium: 'ONLINE' })).toEqual([v.id]);
  expect(await ids({ checkStatus: 'NEEDS_AI' })).toEqual([v.id]);
  expect(await ids({ buyerSite: 'NOT_LISTED' })).toEqual([v.id]);
  expect(await ids({ adKind: 'LEASE' })).toEqual([]);
  expect(await ids({ checkStatus: 'PASSED' })).toEqual([]);
  expect(await ids({ buyerSite: 'LISTED' })).toEqual([]);
  expect(await ids({ buyerSite: 'TAKEN_DOWN' })).toEqual([]);

  await expectError(await staffApi.get('/api/v1/vehicles', { checkStatus: 'APPROVED' }), 400, 'VALIDATION');
});
