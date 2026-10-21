import type { Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { expectStatus } from '../../support/api';

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

  for (const label of ['In stock', 'Outstanding work orders', 'Workshop cost settled', 'Sold this month',
    'Vehicles sold', 'Gross profit', 'Open pipeline', 'Overdue follow-ups', 'Win rate']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible(LOAD);
  }
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

test('AD-14: the ad workspace links to the full disclaimer and the buyer site', async ({ staffPage: page, staffApi }) => {
  const v = await staffApi.createVehicle();
  await page.goto(`/ads?vehicleId=${v.id}`);
  await expect(page.getByRole('button', { name: 'Save draft' })).toBeEnabled(LOAD);
  await expect(page.getByRole('link', { name: 'Read the full disclaimer' })).toHaveAttribute('href', '/disclaimer');
  await expect(page.getByRole('link', { name: 'buyer site' })).toHaveAttribute('href', /^\/shop\/\d+$/);
});
