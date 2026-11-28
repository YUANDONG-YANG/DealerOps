import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { expectStatus, randomDigits, randomVin, type Vehicle } from '../../support/api';
import { env } from '../../support/env';

// DMS listing details in the add/edit drawer (design/21 DMS-18), the payment panel of a sold
// vehicle (PAY-01 to PAY-04) and the printable bill of sale (SALE-01).

test.describe.configure({ timeout: 90_000 });
const LOAD = { timeout: 30_000 };

/** Local yyyy-mm-dd, offset by whole days; the app compares dates against the local date. */
function localDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const SOLD_ON = localDate(-1);

/** The `.form-item` row whose label reads exactly `label`. */
function field(drawer: Locator, label: string) {
  return drawer.locator('.form-item').filter({
    has: drawer.page().locator('label.form-label', { hasText: new RegExp(`^${label.replace(/[()]/g, '\\$&')}$`) }),
  });
}

function control(drawer: Locator, label: string) {
  return field(drawer, label).locator('input, select').first();
}

/**
 * Sets one catalog box. Make and Model are a `select` once the catalog answers and a text input
 * while it has not, and the Model box swaps from one to the other right after a make is chosen, so
 * the element kind is read again on each attempt.
 */
async function setCatalogValue(box: Locator, typed: string, option = typed) {
  await expect(box).toBeVisible();
  // Short per-attempt timeouts: a box that swapped kind, or a catalog option that has not arrived
  // yet, is retried instead of holding the whole attempt open.
  for (let attempt = 5; ; attempt--) {
    const act = { timeout: attempt === 0 ? 20_000 : 5_000 };
    try {
      if ((await box.evaluate((el) => el.tagName)) === 'SELECT') await box.selectOption(option, act);
      else await box.fill(typed, act);
      return;
    } catch (err) {
      if (attempt === 0) throw err;
      await box.page().waitForTimeout(250);
    }
  }
}

async function chooseMakeModel(drawer: Locator, make: string, model: string) {
  await setCatalogValue(control(drawer, 'Make'), make, make.toUpperCase());
  await setCatalogValue(control(drawer, 'Model'), model);
}

/** The model year `fillRequired` picks; the VIN's 10th character must match it (D-8). */
const FORM_YEAR = 2022;

async function fillRequired(drawer: Locator, vin: string) {
  await chooseMakeModel(drawer, 'Honda', 'Civic');
  await control(drawer, 'Model year').selectOption(String(FORM_YEAR));
  await control(drawer, 'VIN').fill(vin);
  await control(drawer, 'Purchase cost').fill('15000');
  await control(drawer, 'Added on').fill('2026-10-02');
  await control(drawer, 'Source').selectOption('AUCTION');
  await control(drawer, 'Condition').selectOption('CERTIFIED');
}

async function openAddDrawer(page: Page) {
  await page.goto('/dms');
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  const drawer = page.getByRole('dialog', { name: 'Add vehicle' });
  await expect(drawer).toBeVisible();
  return drawer;
}

async function findRow(page: Page, text: string, vin: string) {
  await page.goto('/dms');
  const box = page.getByPlaceholder('Search VIN, stock #, make or model');
  await box.fill(text);
  // The type-ahead listbox opens over the Search button, so close it before clicking. Leaving the
  // box also keeps a late suggestion response from reopening it.
  await box.press('Escape');
  await box.blur();
  await expect(page.locator('.suggest-list')).toHaveCount(0);
  await page.getByRole('button', { name: 'Search' }).click();
  const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: vin, exact: true }) });
  await expect(row).toHaveCount(1, LOAD);
  return row;
}

test('DMS-18: add a vehicle with listing details, see them in the list and the edit drawer', async ({ staffPage: page }) => {
  const vin = randomVin(FORM_YEAR);
  const stock = `UI${randomDigits(8)}`;
  const drawer = await openAddDrawer(page);
  await fillRequired(drawer, vin);
  await control(drawer, 'Stock number').fill(stock);

  // Client validation: mileage must be a whole number.
  await control(drawer, 'Mileage (km)').fill('abc');
  await control(drawer, 'Exterior colour').click();
  await expect(field(drawer, 'Mileage (km)').locator('.form-error')).not.toBeEmpty();

  await control(drawer, 'Mileage (km)').fill('38200');
  await control(drawer, 'Exterior colour').fill('Red');
  await control(drawer, 'List price').fill('21995');
  await control(drawer, 'Fuel type').selectOption('HYBRID');
  await drawer.getByRole('button', { name: 'Save' }).click();
  await expect(drawer).toBeHidden(LOAD);

  // The list searches by stock number and shows the Stock # and List price columns.
  const row = await findRow(page, stock, vin);
  await expect(row).toContainText(stock);
  await expect(row).toContainText('$21,995.00');

  await row.getByRole('button', { name: 'Edit' }).click();
  const edit = page.getByRole('dialog', { name: 'Edit vehicle' });
  await expect(control(edit, 'Mileage (km)')).toHaveValue('38200');
  await expect(control(edit, 'Exterior colour')).toHaveValue('Red');
  await expect(control(edit, 'Fuel type')).toHaveValue('HYBRID');
  await expect(control(edit, 'Stock number')).toHaveValue(stock);
});

test('DMS-18: a duplicate stock number shows the server error under the field', async ({ staffPage: page, staffApi }) => {
  const stock = `UI${randomDigits(8)}`;
  await staffApi.createVehicle({ stockNumber: stock });
  const drawer = await openAddDrawer(page);
  await fillRequired(drawer, randomVin(FORM_YEAR));
  await control(drawer, 'Stock number').fill(stock);
  await drawer.getByRole('button', { name: 'Save' }).click();
  await expect(field(drawer, 'Stock number').locator('.form-error')).toHaveText('Stock number is already used by another vehicle.');
  await expect(drawer).toBeVisible();
});

test('PAY-01 to PAY-04 / SALE-01: record and remove payments on a sold vehicle, then print the bill of sale', async ({
  staffPage: page, staffApi,
}) => {
  const customer = await staffApi.createCustomer();
  const created = await staffApi.createVehicle({ mileageKm: 38200, exteriorColor: 'Red' });
  await staffApi.put(`/api/v1/customers/${customer.id}/vehicles/${created.id}`);
  // CR-D8: the sale names its buyer, and a vehicle already linked in CRM is sold to that customer.
  const current = await staffApi.getVehicle(created.id);
  const sale = await staffApi.post(`/api/v1/vehicles/${created.id}/sell`, {
    soldOn: SOLD_ON, soldPrice: 21000, version: current.version, buyerCustomerId: customer.id,
  });
  await expectStatus(sale, 200);
  const v = (await sale.json()) as Vehicle;

  const row = await findRow(page, v.vin, v.vin);
  await row.getByRole('button', { name: 'Edit' }).click();
  const drawer = page.getByRole('dialog', { name: 'Edit vehicle' });
  const panel = drawer.getByRole('region', { name: 'Payments' });
  await expect(panel.getByText('Balance due $21,000.00')).toBeVisible(LOAD);

  // Overpayment is refused with the server message; nothing is recorded.
  await panel.getByLabel('Payment amount').fill('25000');
  await panel.getByLabel('Payment method').selectOption('CASH');
  await panel.getByLabel('Payment date').fill(SOLD_ON);
  await panel.getByRole('button', { name: 'Record payment' }).click();
  await expect(panel.locator('.danger-text')).not.toBeEmpty();
  await expect(panel.getByText('Balance due $21,000.00')).toBeVisible();

  await panel.getByLabel('Payment amount').fill('6000');
  await panel.getByLabel('Payment note').fill('Deposit');
  await panel.getByRole('button', { name: 'Record payment' }).click();
  await expect(panel.getByText('Balance due $15,000.00')).toBeVisible(LOAD);

  await panel.getByLabel('Payment amount').fill('15000');
  await panel.getByLabel('Payment method').selectOption('FINANCING');
  await panel.getByLabel('Payment date').fill(SOLD_ON);
  await panel.getByRole('button', { name: 'Record payment' }).click();
  await expect(panel.getByText('Balance due $0.00')).toBeVisible(LOAD);
  // A settled sale takes no further payments.
  await expect(panel.getByRole('button', { name: 'Record payment' })).toHaveCount(0);
  await expect(drawer.getByText(/paymentAdded/).first()).toBeVisible(LOAD);

  await panel.getByRole('button', { name: 'Remove' }).first().click();
  await page.getByRole('button', { name: 'Remove payment' }).click();
  await expect(panel.getByText(/Balance due \$(6,000|15,000)\.00/)).toBeVisible(LOAD);
  await expect(drawer.getByText(/paymentRemoved/).first()).toBeVisible(LOAD);

  // SALE-01: the bill of sale carries the dealer, buyer, vehicle and payment figures.
  await drawer.getByRole('link', { name: 'Open printable bill of sale' }).click();
  const doc = page.getByRole('article', { name: 'Bill of sale' });
  await expect(doc).toBeVisible(LOAD);
  for (const text of [env.dealerA.legalName, customer.name, v.vin, '38,200 km', 'Red', '$21,000.00']) {
    await expect(doc).toContainText(text);
  }
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('button', { name: 'Print' })).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
});

test('PAY-01: an in-stock vehicle shows no payment panel', async ({ staffPage: page, staffApi }) => {
  const v = await staffApi.createVehicle();
  const row = await findRow(page, v.vin, v.vin);
  await row.getByRole('button', { name: 'Edit' }).click();
  const drawer = page.getByRole('dialog', { name: 'Edit vehicle' });
  await expect(control(drawer, 'VIN')).toHaveValue(v.vin);
  await expect(drawer.getByRole('region', { name: 'Payments' })).toHaveCount(0);
  await expect(drawer.getByRole('link', { name: 'Open printable bill of sale' })).toHaveCount(0);
});
