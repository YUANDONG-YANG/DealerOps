import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { uniqueSuffix } from '../../support/api';

// DMS-19 (requirements/iteration-3/CR-Vehicle-Source-Other-2026-11-09.md): choosing source Other on
// the vehicle form shows a required "Other source" box, and the DMS list's Source filter shows a
// second dropdown of the dealership's custom sources when Other is chosen.

function field(drawer: Locator, label: string) {
  return drawer.locator('.form-item').filter({
    has: drawer.page().locator('label.form-label', { hasText: new RegExp(`^${label}$`) }),
  });
}

async function openEditDrawer(page: Page, vin: string) {
  await page.goto('/dms');
  await page.getByPlaceholder('Search VIN, stock #, make or model').fill(vin);
  await page.getByRole('button', { name: 'Search' }).click();
  const row = page.locator('.page tbody tr', { hasText: vin });
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: 'Edit' }).click();
  const drawer = page.getByRole('dialog', { name: 'Edit vehicle' });
  await expect(drawer).toBeVisible();
  return drawer;
}

test('DMS-19 / SRC-01, SRC-03: the Other source box appears only for Other and is required', async ({
  staffPage: page, staffApi,
}) => {
  const vehicle = await staffApi.createVehicle({ source: 'AUCTION' });
  const drawer = await openEditDrawer(page, vehicle.vin);
  const source = field(drawer, 'Source').locator('select');
  const otherBox = field(drawer, 'Other source');

  await expect(otherBox).toHaveCount(0);
  await source.selectOption('OTHER');
  await expect(otherBox.locator('label.form-label')).toHaveClass(/form-required/);

  // An empty box blocks the save without a request.
  let patched = false;
  page.on('request', (r) => { if (r.method() === 'PATCH') patched = true; });
  await drawer.getByRole('button', { name: 'Save' }).click();
  await expect(otherBox.locator('.form-error')).toHaveText('Enter the source when Other is selected');
  expect(patched).toBe(false);

  const name = `Lease return ${uniqueSuffix()}`;
  await otherBox.locator('input').fill(name);
  const saved = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().includes(`/vehicles/${vehicle.id}`));
  await drawer.getByRole('button', { name: 'Save' }).click();
  expect((await saved).status()).toBe(200);
  await expect(drawer.getByText('Vehicle saved.')).toBeVisible();

  // The list shows the custom source in the Source column.
  await expect(page.locator('.page tbody tr', { hasText: vehicle.vin })).toContainText(`Other: ${name}`);

  // Switching to another source hides the box again.
  await source.selectOption('TRADE_IN');
  await expect(otherBox).toHaveCount(0);
});

test('DMS-19 / SRC-02, SRC-04: Source = Other shows a second dropdown of custom sources', async ({
  staffPage: page, staffApi,
}) => {
  const name = `Fleet sale ${uniqueSuffix()}`;
  const other = await staffApi.createVehicle({ source: 'OTHER', sourceOther: name });
  const auction = await staffApi.createVehicle({ source: 'AUCTION' });

  await page.goto('/dms');
  const sourceFilter = page.getByRole('combobox', { name: 'Source', exact: true });
  const otherFilter = page.getByRole('combobox', { name: 'Other source' });
  await expect(otherFilter).toHaveCount(0);

  await sourceFilter.selectOption('OTHER');
  await expect(otherFilter).toBeVisible();
  await expect(otherFilter.locator('option').first()).toHaveText('All other');
  await expect(otherFilter.locator('option', { hasText: name })).toHaveCount(1);

  const listed = page.waitForResponse((r) => new URL(r.url()).searchParams.get('sourceOther') === name);
  await otherFilter.selectOption(name);
  await listed;
  const rows = page.locator('.page tbody tr');
  await expect(rows.filter({ hasText: other.vin })).toHaveCount(1);
  await expect(rows.filter({ hasText: auction.vin })).toHaveCount(0);
  await expect(rows).toHaveCount(1);

  // Changing the first filter hides and clears the second.
  await sourceFilter.selectOption('AUCTION');
  await expect(otherFilter).toHaveCount(0);
  await sourceFilter.selectOption('OTHER');
  await expect(otherFilter).toHaveValue('');
});
