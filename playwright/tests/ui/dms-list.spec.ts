import type { Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { uniqueSuffix, type Api, type Vehicle } from '../../support/api';

// Make and model values unique to one test, so filtering by them yields only this test's rows
// even though other tests write to the same dealer in parallel.
function uniqueName(prefix: string) {
  return `${prefix}${uniqueSuffix()}`.slice(0, 30);
}

function searchBox(page: Page) {
  return page.getByPlaceholder('Search VIN, make or model');
}

function statusFilter(page: Page) {
  return page.locator('.filters select').filter({ has: page.locator('option[value="IN_STOCK"]') });
}

function conditionFilter(page: Page) {
  return page.locator('.filters select').filter({ has: page.locator('option[value="CERTIFIED"]') });
}

function bodyRows(page: Page) {
  return page.locator('table.table tbody tr');
}

function recordCount(page: Page) {
  return page.locator('.toolbar .muted').first();
}

function isVehicleList(url: string) {
  const u = new URL(url);
  return u.pathname.endsWith('/api/v1/vehicles');
}

/** Types into the keyword box and waits until the debounced list request with that keyword returns. */
async function search(page: Page, keyword: string) {
  const listed = page.waitForResponse(
    (r) => isVehicleList(r.url()) && r.request().method() === 'GET'
      && new URL(r.url()).searchParams.get('q') === keyword,
  );
  await searchBox(page).fill(keyword);
  expect((await listed).status()).toBe(200);
}

async function openDms(page: Page) {
  await page.goto('/dms');
  await expect(page.getByRole('heading', { name: 'DMS' })).toBeVisible();
}

/** Text of each data cell in a row, keyed by its column header. */
async function rowByHeader(page: Page, rowText: string) {
  // textContent, not innerText: headers may be upper-cased by CSS.
  const headers = await page.locator('table.table thead th').allTextContents();
  const cells = await bodyRows(page).filter({ hasText: rowText }).first().locator('td').allTextContents();
  return Object.fromEntries(headers.map((h, i) => [h.trim(), (cells[i] ?? '').trim()]));
}

async function seedSequentially(api: Api, count: number, overrides: (i: number) => Record<string, unknown>) {
  const created: Vehicle[] = [];
  // Sequential on purpose: the list is ordered newest first, so creation order is asserted later.
  for (let i = 0; i < count; i++) created.push(await api.createVehicle(overrides(i)));
  return created;
}

test('UI-20 / NFR-02: list shows year make model, VIN, source, condition, CAD cost, date added and status', async ({ staffPage: page, staffApi }) => {
  const make = uniqueName('Cols');
  const model = uniqueName('Mdl');
  const vehicle = await staffApi.createVehicle({
    make, model, modelYear: 2020, source: 'TRADE_IN', conditionCode: 'CERTIFIED',
    purchaseCost: 14200.5, addedOn: '2026-09-01',
  });

  await openDms(page);
  const headers = page.locator('table.table thead th');
  for (const label of ['Year Make Model', 'VIN', 'Source', 'Condition', 'Cost', 'Date added', 'Status']) {
    await expect(headers.filter({ hasText: new RegExp(`^${label}$`) })).toHaveCount(1);
  }

  await search(page, make);
  await expect(bodyRows(page)).toHaveCount(1);
  const row = await rowByHeader(page, vehicle.vin);
  expect(row['Year Make Model']).toBe(`2020 ${make} ${model}`);
  expect(row['VIN']).toBe(vehicle.vin);
  expect(row['Source']).toBe('Trade in');
  expect(row['Condition']).toBe('Certified');
  // NFR-02: CAD with exactly two decimals.
  expect(row['Cost']).toBe('$14,200.50');
  expect(row['Cost']).toMatch(/^\$[\d,]+\.\d{2}$/);
  // NFR-02: dates as YYYY-MM-DD.
  expect(row['Date added']).toBe('2026-09-01');
  expect(row['Status']).toBe('In stock');
});

test('DMS-07 / UI-20: keyword search matches VIN, make and model', async ({ staffPage: page, staffApi }) => {
  const make = uniqueName('Kw');
  const certifiedModel = uniqueName('Cert');
  const soldModel = uniqueName('Sold');
  const certified = await staffApi.createVehicle({ make, model: certifiedModel, conditionCode: 'CERTIFIED' });
  const asIs = await staffApi.createVehicle({ make, model: soldModel, conditionCode: 'AS_IS' });
  await staffApi.sellVehicle(asIs);

  await openDms(page);

  // Make keyword.
  await search(page, make);
  await expect(bodyRows(page)).toHaveCount(2);
  await expect(recordCount(page)).toHaveText('2 records');

  // VIN keyword.
  await search(page, certified.vin);
  await expect(bodyRows(page)).toHaveCount(1);
  await expect(bodyRows(page).first()).toContainText(certified.vin);

  // Model keyword.
  await search(page, soldModel);
  await expect(bodyRows(page)).toHaveCount(1);
  await expect(bodyRows(page).first()).toContainText(asIs.vin);
});

test('DMS-07 / UI-20: status filter (In stock / Sold) and condition filter narrow the list', async ({ staffPage: page, staffApi }) => {
  const make = uniqueName('Kw');
  const certifiedModel = uniqueName('Cert');
  const soldModel = uniqueName('Sold');
  const certified = await staffApi.createVehicle({ make, model: certifiedModel, conditionCode: 'CERTIFIED' });
  const asIs = await staffApi.createVehicle({ make, model: soldModel, conditionCode: 'AS_IS' });
  await staffApi.sellVehicle(asIs);

  await openDms(page);

  await search(page, make);
  await expect(bodyRows(page)).toHaveCount(2);

  await statusFilter(page).selectOption('SOLD');
  await expect(bodyRows(page)).toHaveCount(1);
  await expect(bodyRows(page).first()).toContainText(asIs.vin);
  await expect(bodyRows(page).first()).toContainText('Sold');

  await statusFilter(page).selectOption('IN_STOCK');
  await expect(page.getByText('Could not load vehicles.')).toHaveCount(0);
  await expect(bodyRows(page)).toHaveCount(1);
  await expect(bodyRows(page).first()).toContainText(certified.vin);

  await statusFilter(page).selectOption('');
  await conditionFilter(page).selectOption('CERTIFIED');
  await expect(bodyRows(page)).toHaveCount(1);
  await expect(bodyRows(page).first()).toContainText(certified.vin);

  await conditionFilter(page).selectOption('AS_IS');
  await expect(page.getByText('Could not load vehicles.')).toHaveCount(0);
  await expect(bodyRows(page)).toHaveCount(1);
  await expect(bodyRows(page).first()).toContainText(asIs.vin);
});

test('UI-20: Reset clears the keyword, status and condition filters and reloads the full list', async ({ staffPage: page, staffApi }) => {
  const make = uniqueName('Kw');
  const certifiedModel = uniqueName('Cert');
  const soldModel = uniqueName('Sold');
  const certified = await staffApi.createVehicle({ make, model: certifiedModel, conditionCode: 'CERTIFIED' });
  const asIs = await staffApi.createVehicle({ make, model: soldModel, conditionCode: 'AS_IS' });
  await staffApi.sellVehicle(asIs);

  await openDms(page);

  await search(page, make);
  await statusFilter(page).selectOption('SOLD');
  await conditionFilter(page).selectOption('CERTIFIED');
  // The combination matches none of the seeded rows.
  await expect(page.getByText('No vehicles match.')).toBeVisible();

  const unfiltered = page.waitForResponse((r) => {
    if (!isVehicleList(r.url()) || r.request().method() !== 'GET') return false;
    const p = new URL(r.url()).searchParams;
    return !p.get('q') && !p.get('status') && !p.get('condition') && p.get('page') === '0';
  });
  await page.getByRole('button', { name: 'Reset' }).click();
  expect((await unfiltered).status()).toBe(200);
  await expect(searchBox(page)).toHaveValue('');
  await expect(statusFilter(page)).toHaveValue('');
  await expect(conditionFilter(page)).toHaveValue('');
  await expect(page.getByText('No vehicles match.')).toHaveCount(0);
  await expect(bodyRows(page).first()).toBeVisible();
  // The dealer has at least the two vehicles seeded here, so the unfiltered total is not narrowed.
  await expect(recordCount(page)).toHaveText(/^\d+ records$/);
  expect(Number((await recordCount(page).textContent())!.split(' ')[0])).toBeGreaterThanOrEqual(2);
});

test('DMS-06 / NFR-01 / UI-20: list pages 10 per page, newest first, and the next page shows the rest', async ({ staffPage: page, staffApi }) => {
  test.setTimeout(60_000);
  const make = uniqueName('Pg');
  const created = await seedSequentially(staffApi, 11, (i) => ({ make, model: `M${String(i).padStart(2, '0')}` }));
  const newestFirst = [...created].reverse();

  await openDms(page);
  await search(page, make);

  await expect(recordCount(page)).toHaveText('11 records');
  await expect(bodyRows(page)).toHaveCount(10);
  // DMS-06: newest first.
  for (let i = 0; i < 10; i++) {
    await expect(bodyRows(page).nth(i)).toContainText(newestFirst[i].vin);
  }

  const pagination = page.locator('.pagination');
  await expect(pagination.getByRole('button', { name: '1', exact: true })).toHaveClass(/active/);
  await expect(pagination.getByRole('button', { name: '2', exact: true })).toBeVisible();
  await expect(pagination.getByRole('button', { name: '3', exact: true })).toHaveCount(0);
  await expect(pagination.getByRole('button', { name: '‹' })).toBeDisabled();

  // Next page.
  const secondPage = page.waitForResponse((r) => {
    if (!isVehicleList(r.url()) || r.request().method() !== 'GET') return false;
    const p = new URL(r.url()).searchParams;
    return p.get('q') === make && p.get('page') === '1';
  });
  await pagination.getByRole('button', { name: '›' }).click();
  const res = await secondPage;
  expect(res.status()).toBe(200);
  expect(new URL(res.url()).searchParams.get('size')).toBe('10');

  await expect(bodyRows(page)).toHaveCount(1);
  await expect(bodyRows(page).first()).toContainText(created[0].vin);
  await expect(pagination.getByRole('button', { name: '2', exact: true })).toHaveClass(/active/);
  await expect(pagination.getByRole('button', { name: '›' })).toBeDisabled();
  await expect(recordCount(page)).toHaveText('11 records');

  // Back to the first page via its number.
  await pagination.getByRole('button', { name: '1', exact: true }).click();
  await expect(bodyRows(page)).toHaveCount(10);
  await expect(bodyRows(page).first()).toContainText(newestFirst[0].vin);

  // A filter change goes back to page 1 rather than staying on an offset that may not exist.
  await pagination.getByRole('button', { name: '2', exact: true }).click();
  await expect(bodyRows(page)).toHaveCount(1);
  // Year filter (all seeded rows are 2020), kept independent of the enum filters.
  await page.locator('.filters select').filter({ has: page.locator('option', { hasText: /^Year$/ }) }).selectOption('2020');
  await expect(bodyRows(page)).toHaveCount(10);
  await expect(pagination.getByRole('button', { name: '1', exact: true })).toHaveClass(/active/);
});
