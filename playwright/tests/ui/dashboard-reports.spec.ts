import type { Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { expectStatus, today } from '../../support/api';
import { env } from '../../support/env';

// KPI dashboard (design/21 DASH-01), lead stage history (CRM-16) and workshop settlement (WO-08)
// on the sales report, and the ad workspace links to the disclaimer and buyer site (AD-14).

test.describe.configure({ timeout: 90_000 });
const LOAD = { timeout: 30_000 };

async function fitsPhoneWidth(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

test('DASH-01: the dashboard is first in the menu and shows inventory, sales and lead KPIs', async ({ staffPage: page }) => {
  await page.goto('/dms');
  const menu = page.locator('.side-menu').getByRole('link');
  await expect(menu.first()).toHaveText('Dashboard');
  await menu.first().click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

  // CR-C3 replaced the fixed "Sold this month" card with the period selector over the Sales KPIs.
  for (const label of ['In stock', 'Outstanding work orders', 'Workshop cost settled',
    'Vehicles sold', 'Revenue', 'Gross profit', 'Open pipeline', 'Overdue follow-ups', 'Win rate']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible(LOAD);
  }
  await expect(page.getByLabel('Sales period')).toHaveValue('MONTH');
  await expect(page.getByRole('link', { name: 'Open buyer site' })).toHaveAttribute('href', /^\/shop\/\d+$/);
  await page.getByRole('link', { name: 'Full sales report' }).click();
  await expect(page.getByRole('heading', { name: 'Sales report', level: 1 })).toBeVisible();
});

test('CRM-16 / WO-08: the sales report shows stage history and the settled workshop cost', async ({
  staffPage: page, staffApi,
}) => {
  const vehicle = await staffApi.createVehicle();
  const created = await staffApi.post(`/api/v1/vehicles/${vehicle.id}/work-orders`, { task: 'Detail and polish' });
  await expectStatus(created, 201);
  const wo = (await created.json()) as { id: number; task: string; version: number };
  await expectStatus(await staffApi.patch(`/api/v1/work-orders/${wo.id}`, {
    status: 'DONE', task: wo.task, assigneeUsername: null, dueOn: null, cost: 120.5, completionNote: 'Done', version: wo.version,
  }), 200);
  const customer = await staffApi.createCustomer();
  await expectStatus(await staffApi.post('/api/v1/leads', { customerId: customer.id }), 201);

  await page.goto('/reports/sales-funnel');
  await expect(page.getByRole('heading', { name: 'Stage history' })).toBeVisible(LOAD);
  const month = new Date().toISOString().slice(0, 7);
  const history = page.getByRole('table', { name: 'Lead stage history' });
  await expect(history).toContainText(month);
  await expect(history.getByRole('columnheader')).toContainText(['Month']);

  await expect(page.getByRole('heading', { name: 'Workshop settlement' })).toBeVisible();
  const byMonth = page.getByRole('table', { name: 'Workshop settlement by month' });
  await expect(byMonth.getByRole('row').filter({ hasText: month })).toHaveCount(1);
  await expect(page.getByRole('table', { name: 'Workshop settlement by assignee' })).toBeVisible();
});

test('DASH-01 / UI: the dashboard and sales report do not scroll sideways at phone width', async ({ staffPage: page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, heading] of [['/dashboard', 'Dashboard'], ['/reports/sales-funnel', 'Sales report']]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible(LOAD);
    await expect(page.getByText(/Loading/)).toHaveCount(0, LOAD);
    expect(await fitsPhoneWidth(page), path).toBe(true);
  }
});

test('AD-14: the ad workspace opens the full disclaimer and links to the buyer site', async ({ staffPage: page, staffApi }) => {
  const v = await staffApi.createVehicle();
  await page.goto(`/ads?vehicleId=${v.id}`);
  await expect(page.getByRole('button', { name: 'Save draft' })).toBeEnabled(LOAD);
  // The listed-count line above the table repeats the link once this dealership lists any ad.
  await expect(page.getByRole('region', { name: 'Demo publishing' }).getByRole('link', { name: 'buyer site' }))
    .toHaveAttribute('href', /^\/shop\/[a-z0-9-]+$/);
  await page.getByRole('button', { name: 'Read the full disclaimer' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('ROLE / CR-C3: the sales report lists every member who sold a vehicle, including the one leading the dealership', async ({
  staffPage: page, staffApi,
}) => {
  const v = await staffApi.createVehicle({ purchaseCost: 10000, repairCost: 0 });
  await expectStatus(await staffApi.post(`/api/v1/vehicles/${v.id}/sell`, {
    soldOn: today(), soldPrice: 12000, version: v.version, buyerName: 'Report Buyer',
  }), 200);

  await page.goto('/reports/sales-funnel');
  await page.getByLabel('Sales period').selectOption('MONTH');
  await expect(page.getByRole('heading', { name: 'Sales for this month' })).toBeVisible(LOAD);

  // The table is not filtered by dealership role: the signed-in member sold this vehicle.
  const table = page.getByRole('table', { name: 'Sales by salesperson' });
  await expect(table).toBeVisible(LOAD);
  // Filtered on the exact name cell: "E2E Staff" is also a prefix of the sales member's name.
  const row = table.getByRole('row')
    .filter({ has: page.getByRole('cell', { name: env.staff.displayName, exact: true }) });
  await expect(row).toHaveCount(1);

  // The dealership is shared with the other specs, which sell as the same member, so the row's
  // own figures are checked for this sale's contribution instead of an exact total.
  const cells = await row.getByRole('cell').allInnerTexts();
  const [, soldCount, revenue] = cells;
  expect(Number(soldCount), 'vehicles sold').toBeGreaterThanOrEqual(1);
  expect(Number(revenue.replace(/[^0-9.]/g, '')), 'revenue includes this sale').toBeGreaterThanOrEqual(12000);
});

test('CR-C3 / DASH-01: the dashboard sales section has the same period selector', async ({ staffPage: page }) => {
  await page.goto('/dashboard');
  const selector = page.getByLabel('Sales period');
  await expect(selector).toBeVisible(LOAD);
  await expect(selector.getByRole('option')).toHaveText(['Today', 'This week', 'This month', 'This year']);

  // Only the Sales KPIs follow the selector; the inventory and lead cards stay put.
  const reloaded = page.waitForResponse((r) =>
    r.url().includes('/api/v1/vehicles/report/sales') && new URL(r.url()).searchParams.get('period') === 'YEAR');
  await selector.selectOption('YEAR');
  expect((await reloaded).status()).toBe(200);
  await expect(page.getByText('In stock', { exact: true })).toBeVisible();
  await expect(page.getByText('Win rate', { exact: true })).toBeVisible();

  // TODAY narrows the sold window to one day, shown as the hint under "Vehicles sold".
  const sameDay = page.waitForResponse((r) =>
    r.url().includes('/api/v1/vehicles/report/sales') && new URL(r.url()).searchParams.get('period') === 'TODAY');
  await selector.selectOption('TODAY');
  expect((await sameDay).status()).toBe(200);
  // The window is today to today; the server computes both dates in UTC, as `today()` does.
  const hint = page.getByText(/^\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}$/);
  await expect(hint).toHaveText(`${today()} to ${today()}`, LOAD);
});

test('CR / DASH-01: the sales period selector reloads the period totals', async ({ staffPage: page }) => {
  await page.goto('/reports/sales-funnel');
  const selector = page.getByLabel('Sales period');
  await expect(selector).toBeVisible(LOAD);

  for (const [value, heading] of [['TODAY', 'Sales for today'], ['WEEK', 'Sales for this week'],
    ['MONTH', 'Sales for this month'], ['YEAR', 'Sales for this year']] as const) {
    const reloaded = page.waitForResponse((r) =>
      r.url().includes('/api/v1/vehicles/report/sales') && new URL(r.url()).searchParams.get('period') === value);
    await selector.selectOption(value);
    expect((await reloaded).status()).toBe(200);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible(LOAD);
  }

  // TODAY narrows the window to a single day; the server computes the dates in UTC.
  const sameDay = page.waitForResponse((r) =>
    r.url().includes('/api/v1/vehicles/report/sales') && new URL(r.url()).searchParams.get('period') === 'TODAY');
  await selector.selectOption('TODAY');
  expect((await sameDay).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Sales for today' })).toBeVisible(LOAD);
  // The window is today to today; the server computes both dates in UTC, as `today()` does.
  const hint = page.getByText(/^\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}$/);
  await expect(hint).toHaveText(`${today()} to ${today()}`, LOAD);
});
