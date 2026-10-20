import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { randomVin } from '../../support/api';

// Covers the DMS add/edit drawer: UI-21 (required marks, client validation, per-field server
// errors), DMS-01 (create), DMS-03 (VIN_DUP), DMS-04 (VIN format), DMS-05 (enum drop-downs),
// DMS-09 (edit an in-stock vehicle).

const REQUIRED_LABELS = ['Make', 'Model', 'Model year', 'VIN', 'Purchase cost', 'Added on', 'Source', 'Condition'];
const OPTIONAL_LABELS = ['Repair cost', 'Carfax URL', 'Body type'];

/** The `.form-item` row whose label reads exactly `label`. */
function field(drawer: Locator, label: string) {
  return drawer.locator('.form-item').filter({
    has: drawer.page().locator('label.form-label', { hasText: new RegExp(`^${label}$`) }),
  });
}

/** The editable control (input or select) of a form row. */
function control(drawer: Locator, label: string) {
  return field(drawer, label).locator('input, select').first();
}

function fieldError(drawer: Locator, label: string) {
  return field(drawer, label).locator('.form-error');
}

async function openAddDrawer(page: Page) {
  await page.goto('/dms');
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  const drawer = page.getByRole('dialog', { name: 'Add vehicle' });
  await expect(drawer).toBeVisible();
  return drawer;
}

/**
 * Picks make and model. With the NHTSA catalog loaded both are selects (make in catalog
 * casing); without it the form falls back to free-text inputs.
 */
async function chooseMakeModel(drawer: Locator, make: string, model: string) {
  const makeControl = control(drawer, 'Make');
  const isSelect = (await makeControl.evaluate((el) => el.tagName)) === 'SELECT';
  if (isSelect) {
    await makeControl.selectOption(make.toUpperCase());
    // Models load asynchronously after the make; selectOption waits for the option to exist.
    await control(drawer, 'Model').selectOption(model);
  } else {
    await makeControl.fill(make);
    await control(drawer, 'Model').fill(model);
  }
}

async function fillValidVehicle(drawer: Locator, vin: string) {
  await chooseMakeModel(drawer, 'Toyota', 'Camry');
  await control(drawer, 'Model year').selectOption('2020');
  await control(drawer, 'VIN').fill(vin);
  await control(drawer, 'Purchase cost').fill('14200');
  await control(drawer, 'Added on').fill('2026-09-01');
  await control(drawer, 'Repair cost').fill('800');
  await control(drawer, 'Source').selectOption('AUCTION');
  await control(drawer, 'Condition').selectOption('AS_IS');
}

function vehicleWrite(page: Page, method: 'POST' | 'PATCH' | 'PUT') {
  return page.waitForResponse(
    (r) => /\/api\/v1\/vehicles(\/\d+)?$/.test(new URL(r.url()).pathname) && r.request().method() === method,
  );
}

async function searchList(page: Page, text: string) {
  await page.getByPlaceholder('Search VIN, make or model').fill(text);
  await page.getByRole('button', { name: 'Search' }).click();
}

test('UI-21 / DMS-01 / DMS-05: Add vehicle drawer marks required fields and offers only enum drop-downs', async ({
  staffPage: page,
}) => {
  const drawer = await openAddDrawer(page);

  for (const label of REQUIRED_LABELS) {
    const lbl = field(drawer, label).locator('label.form-label');
    await expect(lbl, `${label} is marked required`).toHaveClass(/form-required/);
    const after = await lbl.evaluate((el) => getComputedStyle(el, '::after').content);
    expect(after, `${label} shows a * marker`).toContain('*');
  }
  for (const label of OPTIONAL_LABELS) {
    await expect(field(drawer, label).locator('label.form-label'), `${label} is optional`).not.toHaveClass(
      /form-required/,
    );
  }

  // DMS-05: source and condition are drop-downs limited to the enum values. A new vehicle starts
  // with neither chosen, so the only other option is the empty "Select …" prompt.
  await expect(control(drawer, 'Source')).toHaveValue('');
  await expect(control(drawer, 'Condition')).toHaveValue('');
  const sourceValues = await control(drawer, 'Source').locator('option').evaluateAll((os) =>
    os.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
  );
  expect(sourceValues.sort()).toEqual(['AUCTION', 'OTHER', 'PRIVATE_PURCHASE', 'TRADE_IN']);
  const conditionValues = await control(drawer, 'Condition').locator('option').evaluateAll((os) =>
    os.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
  );
  expect(conditionValues.sort()).toEqual(['AS_IS', 'CERTIFIED', 'IRREPARABLE', 'UNFIT']);
});

test('UI-21 / DMS-01: an empty submit shows an error per required field and sends no request', async ({
  staffPage: page,
}) => {
  const drawer = await openAddDrawer(page);
  let posted = false;
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/v1/vehicles') posted = true;
  });

  await drawer.getByRole('button', { name: 'Save' }).click();

  // Every required field is blank, source and condition included: none is pre-filled.
  await expect(fieldError(drawer, 'Make')).toHaveText('Required');
  await expect(fieldError(drawer, 'Model')).toHaveText('Required');
  await expect(fieldError(drawer, 'Model year')).toHaveText(/Year must be 1900 to \d{4}/);
  await expect(fieldError(drawer, 'VIN')).toHaveText(/17 letters or digits/);
  await expect(fieldError(drawer, 'Purchase cost')).toBeVisible();
  await expect(fieldError(drawer, 'Added on')).toBeVisible();
  await expect(fieldError(drawer, 'Source')).toHaveText('Required');
  await expect(fieldError(drawer, 'Condition')).toHaveText('Required');
  await expect(fieldError(drawer, 'Repair cost')).toHaveCount(0);
  await expect(fieldError(drawer, 'Carfax URL')).toHaveCount(0);
  await expect(drawer).toBeVisible();
  expect(posted, 'no create request for an invalid form').toBe(false);
});

test('UI-21 / DMS-04: VIN with I/O/Q or wrong length is rejected client-side on blur', async ({
  staffPage: page,
}) => {
  const drawer = await openAddDrawer(page);
  const vin = control(drawer, 'VIN');
  const vinError = fieldError(drawer, 'VIN');

  // Typing alone stays quiet; leaving the field checks it.
  await vin.fill('1HGCM82633A00435I');
  await expect(vinError).toHaveCount(0);
  await control(drawer, 'Purchase cost').focus();
  await expect(vinError).toHaveText('VIN must be 17 letters or digits, without I, O or Q');

  for (const bad of ['1HGCM82633A00435O', '1HGCM82633A00435Q', '1HGCM82633A0043', '1HGCM82633A0043521']) {
    await vin.fill(bad);
    await vin.blur();
    await expect(vinError, `VIN ${bad}`).toBeVisible();
  }

  // A valid VIN (lower case is accepted and upper-cased on save) clears the error.
  await vin.fill(randomVin().toLowerCase());
  await vin.blur();
  await expect(vinError).toHaveCount(0);
});

test('UI-21: model year can only be picked from 1900 to next year, and invalid amounts and URLs are flagged', async ({
  staffPage: page,
}) => {
  const drawer = await openAddDrawer(page);
  const maxYear = new Date().getFullYear() + 1;

  const years = (
    await control(drawer, 'Model year').locator('option').evaluateAll((os) =>
      os.map((o) => (o as HTMLOptionElement).value),
    )
  )
    .filter(Boolean)
    .map(Number);
  expect(Math.max(...years)).toBe(maxYear);
  expect(Math.min(...years)).toBe(1900);

  // Choosing then clearing the year shows the range error immediately (select is "settled").
  await control(drawer, 'Model year').selectOption(String(maxYear));
  await expect(fieldError(drawer, 'Model year')).toHaveCount(0);
  await control(drawer, 'Model year').selectOption('');
  await expect(fieldError(drawer, 'Model year')).toHaveText(`Year must be 1900 to ${maxYear}`);

  await control(drawer, 'Purchase cost').fill('-5');
  await control(drawer, 'Purchase cost').blur();
  await expect(fieldError(drawer, 'Purchase cost')).toHaveText(
    'Must be an amount of 0 or more with at most 2 decimals',
  );
  await control(drawer, 'Repair cost').fill('12.345');
  await control(drawer, 'Repair cost').blur();
  await expect(fieldError(drawer, 'Repair cost')).toBeVisible();
  await control(drawer, 'Carfax URL').fill('carfax.ca/report');
  await control(drawer, 'Carfax URL').blur();
  await expect(fieldError(drawer, 'Carfax URL')).toHaveText('Must be an http(s) URL of at most 500 characters');

  // Future "Added on" date is rejected.
  const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  await control(drawer, 'Added on').fill(tomorrow);
  await expect(fieldError(drawer, 'Added on')).toHaveText('Date cannot be in the future');
});

test('DMS-01 / DMS-04: staff adds a vehicle through the drawer and finds it in the list with an upper-cased VIN', async ({
  staffPage: page,
  staffApi,
}) => {
  const vin = randomVin();
  const drawer = await openAddDrawer(page);
  await fillValidVehicle(drawer, vin.toLowerCase());

  const created = vehicleWrite(page, 'POST');
  await drawer.getByRole('button', { name: 'Save' }).click();
  const res = await created;
  expect(res.status(), await res.text()).toBe(201);
  const body = await res.json();
  expect(body.vin).toBe(vin);
  expect(body.status).toBe('IN_STOCK');
  await expect(drawer).toBeHidden();

  await searchList(page, vin);
  const row = page.getByRole('row').filter({ hasText: vin });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(/2020 Toyota Camry/i);
  await expect(row).toContainText('Auction');
  await expect(row).toContainText('As-is');
  await expect(row).toContainText('2026-09-01');
  await expect(row).toContainText(/In stock/i);

  const stored = await staffApi.getVehicle(body.id);
  expect(stored).toMatchObject({ vin, modelYear: 2020, purchaseCost: 14200, repairCost: 800, addedOn: '2026-09-01' });
});

test('UI-21 / DMS-03: a duplicate VIN shows the server VIN_DUP error on the VIN field', async ({
  staffPage: page,
  staffApi,
  allowBrowserErrors,
}) => {
  allowBrowserErrors(/400/);
  const existing = await staffApi.createVehicle();

  const drawer = await openAddDrawer(page);
  await fillValidVehicle(drawer, existing.vin);

  const attempt = vehicleWrite(page, 'POST');
  await drawer.getByRole('button', { name: 'Save' }).click();
  const res = await attempt;
  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe('VIN_DUP');

  // The drawer stays open with the input kept, and the error is visible to the user.
  await expect(drawer).toBeVisible();
  await expect(control(drawer, 'VIN')).toHaveValue(existing.vin);
  await expect(drawer.locator('.danger-text', { hasText: /VIN already (exists )?in this dealership/i })).toBeVisible();
  // UI-21: server errors are shown per field, so VIN_DUP belongs under the VIN input.
  await expect(fieldError(drawer, 'VIN')).toHaveText(/VIN already/i);
});

test('DMS-09: staff edits every non-sold field of an in-stock vehicle through the Edit drawer', async ({
  staffPage: page,
  staffApi,
}) => {
  const vehicle = await staffApi.createVehicle({ make: 'Honda', model: 'Civic', modelYear: 2018 });
  const newVin = randomVin();

  await page.goto('/dms');
  await searchList(page, vehicle.vin);
  const row = page.getByRole('row').filter({ hasText: vehicle.vin });
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: 'Edit' }).click();

  const drawer = page.getByRole('dialog', { name: 'Edit vehicle' });
  await expect(drawer).toBeVisible();
  await expect(control(drawer, 'VIN')).toHaveValue(vehicle.vin);
  await expect(control(drawer, 'Purchase cost')).toHaveValue('14200');
  await expect(drawer.getByText('In stock', { exact: true })).toBeVisible();
  // Sold fields are not editable in the form; selling is a separate action.
  await expect(drawer.getByRole('button', { name: 'Mark as sold' })).toBeVisible();
  // An in-stock vehicle shows the sold date and price as empty read-only rows, with no input.
  await expect(field(drawer, 'Sold date')).toContainText('—');
  await expect(field(drawer, 'Sold date').locator('input')).toHaveCount(0);
  await expect(field(drawer, 'Sold price')).toContainText('—');
  await expect(field(drawer, 'Sold price').locator('input')).toHaveCount(0);

  await chooseMakeModel(drawer, 'Toyota', 'Corolla');
  await control(drawer, 'Model year').selectOption('2021');
  await control(drawer, 'VIN').fill(newVin);
  await control(drawer, 'Purchase cost').fill('15999.50');
  await control(drawer, 'Added on').fill('2026-08-15');
  await control(drawer, 'Repair cost').fill('1200');
  await control(drawer, 'Carfax URL').fill('https://www.carfax.ca/report/e2e');
  await control(drawer, 'Source').selectOption('TRADE_IN');
  await control(drawer, 'Condition').selectOption('CERTIFIED');
  await control(drawer, 'Body type').selectOption('HATCHBACK');

  const updated = page.waitForResponse(
    (r) => new URL(r.url()).pathname === `/api/v1/vehicles/${vehicle.id}` && ['PATCH', 'PUT'].includes(r.request().method()),
  );
  await drawer.getByRole('button', { name: 'Save' }).click();
  const res = await updated;
  expect(res.status(), await res.text()).toBe(200);
  await expect(drawer.locator('.danger-text')).toHaveCount(0);

  const stored = await staffApi.getVehicle(vehicle.id);
  expect(stored).toMatchObject({
    make: expect.stringMatching(/^toyota$/i),
    model: 'Corolla',
    modelYear: 2021,
    vin: newVin,
    purchaseCost: 15999.5,
    addedOn: '2026-08-15',
    repairCost: 1200,
    carfaxUrl: 'https://www.carfax.ca/report/e2e',
    source: 'TRADE_IN',
    conditionCode: 'CERTIFIED',
    bodyType: 'HATCHBACK',
    status: 'IN_STOCK',
  });
  // Sold fields stay unset: only the sell action writes them (DMS-09).
  expect(stored.soldOn ?? null).toBeNull();
  expect(stored.soldPrice ?? null).toBeNull();
  expect(stored.version).toBeGreaterThan(vehicle.version);

  // Saving an edit keeps the drawer open; close it to get back to the list.
  await drawer.getByRole('button', { name: 'Close' }).click();
  await expect(drawer).toBeHidden();
  await searchList(page, newVin);
  await expect(page.getByRole('row').filter({ hasText: newVin })).toContainText(/2021 toyota Corolla/i);
});

test('DMS-02: a stored Carfax URL is shown as a link that opens the report in a new tab', async ({
  staffPage: page,
  staffApi,
}) => {
  const carfaxUrl = 'https://www.carfax.ca/report/e2e-link';
  const vehicle = await staffApi.createVehicle({ carfaxUrl });

  await page.goto('/dms');
  await searchList(page, vehicle.vin);
  await page.getByRole('row').filter({ hasText: vehicle.vin }).getByRole('button', { name: 'Edit' }).click();
  const drawer = page.getByRole('dialog', { name: 'Edit vehicle' });

  const link = field(drawer, 'Carfax URL').getByRole('link', { name: 'Open Carfax report' });
  await expect(link).toHaveAttribute('href', carfaxUrl);
  await expect(link).toHaveAttribute('target', '_blank');

  // An invalid URL shows no link, only the validation error.
  await control(drawer, 'Carfax URL').fill('not a url');
  await expect(link).toHaveCount(0);
});
