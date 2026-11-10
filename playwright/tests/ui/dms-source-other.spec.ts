import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { randomVin, uniqueSuffix } from '../../support/api';

// DMS-19 (requirements/iteration-3/CR-Vehicle-Source-Other-2026-11-09.md): choosing source Other on
// the vehicle form shows a required "Other source" box, and the DMS list's Source filter shows a
// second dropdown of the dealership's custom sources when Other is chosen. DMS-20: once a source is
// chosen the form also offers the optional "Acquired from" name and address.

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

/** Picks make and model: selects when the NHTSA catalog is loaded, free text otherwise. */
async function chooseMakeModel(drawer: Locator, make: string, model: string) {
  const makeControl = field(drawer, 'Make').locator('input, select').first();
  const modelControl = field(drawer, 'Model').locator('input, select').first();
  if ((await makeControl.evaluate((el) => el.tagName)) === 'SELECT') {
    await makeControl.selectOption(make.toUpperCase());
    await modelControl.selectOption(model);
  } else {
    await makeControl.fill(make);
    await modelControl.fill(model);
  }
}

test('DMS-20 / ACQ-01, ACQ-06: Acquired from name and address appear once a source is picked and are saved', async ({
  staffPage: page,
}) => {
  const id = uniqueSuffix();
  const vin = randomVin(2020);
  await page.goto('/dms');
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  const drawer = page.getByRole('dialog', { name: 'Add vehicle' });
  await expect(drawer).toBeVisible();

  const name = drawer.getByLabel('Acquired from', { exact: true });
  const address = drawer.getByLabel('Acquired from address');
  await expect(name).toHaveCount(0);
  await expect(address).toHaveCount(0);

  await chooseMakeModel(drawer, 'Toyota', 'Camry');
  await field(drawer, 'Model year').locator('select').selectOption('2020');
  await field(drawer, 'VIN').locator('input').fill(vin);
  await field(drawer, 'Purchase cost').locator('input').fill('14200');
  await field(drawer, 'Added on').locator('input').fill('2026-09-01');
  await field(drawer, 'Condition').locator('select').selectOption('AS_IS');
  await field(drawer, 'Source').locator('select').selectOption('AUCTION');

  // Both are optional, with the agreed hints.
  await expect(name).toHaveAttribute('placeholder', 'Person or business name');
  await expect(address).toHaveAttribute('placeholder', 'Street, city, province');
  await expect(field(drawer, 'Acquired from').locator('label.form-label')).not.toHaveClass(/form-required/);
  await expect(field(drawer, 'Acquired from address').locator('label.form-label')).not.toHaveClass(/form-required/);

  const seller = `Jane Seller ${id}`;
  await name.fill(`  ${seller}  `);
  await address.fill('9 Elm St, Calgary, AB');
  const created = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/vehicles');
  await drawer.getByRole('button', { name: 'Save' }).click();
  const res = await created;
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.acquiredFromName).toBe(seller);
  expect(body.acquiredFromAddress).toBe('9 Elm St, Calgary, AB');

  // Reopening shows the saved values; an edit replaces them.
  let edit = await openEditDrawer(page, vin);
  await expect(edit.getByLabel('Acquired from', { exact: true })).toHaveValue(seller);
  await expect(edit.getByLabel('Acquired from address')).toHaveValue('9 Elm St, Calgary, AB');

  await edit.getByLabel('Acquired from', { exact: true }).fill(`${seller} Ltd`);
  await edit.getByLabel('Acquired from address').fill('');
  const saved = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().includes(`/vehicles/${body.id}`));
  await edit.getByRole('button', { name: 'Save' }).click();
  expect((await saved).status()).toBe(200);
  await expect(edit.getByText('Vehicle saved.')).toBeVisible();

  edit = await openEditDrawer(page, vin);
  await expect(edit.getByLabel('Acquired from', { exact: true })).toHaveValue(`${seller} Ltd`);
  await expect(edit.getByLabel('Acquired from address')).toHaveValue('');
});

test('DMS-19 / SRC-17: changing the Source filter on a later page goes back to the first page', async ({
  staffPage: page, staffApi,
}) => {
  test.setTimeout(60_000);
  const make = `Pg${uniqueSuffix()}`;
  for (let i = 0; i < 11; i++)
    await staffApi.createVehicle({ make, source: 'OTHER', sourceOther: `Paging ${make}` });

  await page.goto('/dms');
  await page.getByPlaceholder('Search VIN, stock #, make or model').fill(make);
  await page.getByRole('button', { name: 'Search' }).click();
  const rows = page.locator('.page tbody tr');
  await expect(rows).toHaveCount(10);

  const pagination = page.locator('.pagination');
  await pagination.getByRole('button', { name: '2', exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(pagination.getByRole('button', { name: '2', exact: true })).toHaveClass(/active/);

  // All 11 are Other, so the first page has 10 rows again rather than the offset of page 2.
  const firstPage = page.waitForResponse((r) => {
    const p = new URL(r.url()).searchParams;
    return p.get('source') === 'OTHER' && p.get('q') === make;
  });
  await page.getByRole('combobox', { name: 'Source', exact: true }).selectOption('OTHER');
  expect(new URL((await firstPage).url()).searchParams.get('page') ?? '0').toBe('0');
  await expect(rows).toHaveCount(10);
  await expect(pagination.getByRole('button', { name: '1', exact: true })).toHaveClass(/active/);
});
