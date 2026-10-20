import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { type Api, type Vehicle, expectStatus } from '../../support/api';

// Selling a vehicle on /dms: the separate sell action (UI-23, DMS-10), the sold lock in the edit
// drawer (UI-24, DMS-11), no second sale (DMS-12), profit (DMS-16), and the open work-order block
// (design/21 WO-05, contract §4.5 WORK_ORDERS_OPEN).

/** Local yyyy-mm-dd, offset by whole days; the app compares sold dates against the local date. */
function localDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const SOLD_ON = localDate(-1);

// The shared local stack is slow under parallel runs; allow for slow list loads.
test.describe.configure({ timeout: 90_000 });
const LOAD = { timeout: 30_000 };

async function openDmsRow(page: Page, vin: string): Promise<Locator> {
  await page.goto('/dms');
  await page.getByPlaceholder('Search VIN, make or model').fill(vin);
  const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: vin, exact: true }) });
  await expect(row).toHaveCount(1, LOAD);
  return row;
}

/** The sell confirm dialog (ConfirmDialog renders a plain .dialog with the title as header). */
function sellDialog(page: Page, v: Vehicle) {
  return page.locator('.dialog').filter({ hasText: `Sell ${v.modelYear} ${v.make} ${v.model} · VIN ${v.vin}` });
}

function field(scope: Locator, label: string) {
  return scope.locator('.form-item', { has: scope.page().getByText(label, { exact: true }) });
}

async function fillSale(dialog: Locator, soldOn: string, soldPrice: string) {
  await field(dialog, 'Sold date').locator('input').fill(soldOn);
  await field(dialog, 'Sold price').locator('input').fill(soldPrice);
}

function isSellRequest(url: string, method: string, id: number) {
  return method === 'POST' && url.includes(`/api/v1/vehicles/${id}/sell`);
}

async function expectInStock(api: Api, id: number) {
  const v = await api.getVehicle(id);
  expect(v.status).toBe('IN_STOCK');
  // Null fields may be omitted from the response.
  expect(v.soldOn ?? null).toBeNull();
  expect(v.soldPrice ?? null).toBeNull();
}

test('UI-23 DMS-10: Sell from the list needs both date and price before it sells', async ({ staffPage: page, staffApi }) => {
  const v = await staffApi.createVehicle();
  const row = await openDmsRow(page, v.vin);

  const sellCalls: string[] = [];
  page.on('request', (r) => { if (isSellRequest(r.url(), r.method(), v.id)) sellCalls.push(r.url()); });

  await row.getByRole('button', { name: 'Sell', exact: true }).click();
  const dialog = sellDialog(page, v);
  await expect(dialog).toBeVisible();
  await expect(field(dialog, 'Sold date').locator('input')).toHaveValue('');
  await expect(field(dialog, 'Sold price').locator('input')).toHaveValue('');
  const confirm = dialog.getByRole('button', { name: 'Confirm sale' });
  const pairError = dialog.getByText('Sold date and price are required together');

  // Neither value.
  await confirm.click();
  await expect(pairError).toBeVisible();

  // Date only.
  await fillSale(dialog, SOLD_ON, '');
  await confirm.click();
  await expect(pairError).toBeVisible();

  // Price only.
  await fillSale(dialog, '', '18900');
  await confirm.click();
  await expect(pairError).toBeVisible();

  await expect(dialog).toBeVisible();
  expect(sellCalls, 'no sell request is sent while the pair is incomplete').toEqual([]);
  await expectInStock(staffApi, v.id);
  await expect(row.getByRole('status')).toHaveText('In stock', LOAD);

  // Both values: the sale goes through.
  await fillSale(dialog, SOLD_ON, '18900');
  const sold = page.waitForResponse((r) => isSellRequest(r.url(), r.request().method(), v.id));
  await confirm.click();
  const res = await sold;
  expect(res.status(), await res.text()).toBe(200);
  expect(res.request().postDataJSON()).toMatchObject({ soldOn: SOLD_ON, soldPrice: 18900, version: v.version });

  await expect(dialog).toBeHidden();
  await expect(row.getByRole('status')).toHaveText('Sold', LOAD);
  // DMS-12: a sold row offers no Sell action.
  await expect(row.getByRole('button', { name: 'Sell', exact: true })).toHaveCount(0);

  const after = await staffApi.getVehicle(v.id);
  expect(after.status).toBe('SOLD');
  expect(after.soldOn).toBe(SOLD_ON);
  expect(Number(after.soldPrice)).toBe(18900);
});

test('UI-23: "Mark as sold" in the edit drawer opens the confirm dialog and sells', async ({ staffPage: page, staffApi }) => {
  const v = await staffApi.createVehicle();
  const row = await openDmsRow(page, v.vin);
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Edit vehicle' });
  await expect(drawer).toBeVisible();

  // Sold date and price are not editable fields of the vehicle form (DMS-02): an in-stock
  // vehicle shows them as empty read-only rows.
  await expect(field(drawer, 'Sold date')).toContainText('—');
  await expect(field(drawer, 'Sold date').locator('input')).toHaveCount(0);
  await expect(field(drawer, 'Sold price')).toContainText('—');
  await expect(field(drawer, 'Sold price').locator('input')).toHaveCount(0);

  await drawer.getByRole('button', { name: 'Mark as sold' }).click();
  const dialog = sellDialog(page, v);
  await expect(dialog).toBeVisible();

  // Price without date is rejected client-side.
  await fillSale(dialog, '', '21000.50');
  await dialog.getByRole('button', { name: 'Confirm sale' }).click();
  await expect(dialog.getByText('Sold date and price are required together')).toBeVisible();
  await expectInStock(staffApi, v.id);

  await fillSale(dialog, SOLD_ON, '21000.50');
  const sold = page.waitForResponse((r) => isSellRequest(r.url(), r.request().method(), v.id));
  await dialog.getByRole('button', { name: 'Confirm sale' }).click();
  expect((await sold).status()).toBe(200);

  await expect(dialog).toBeHidden();
  await expect(drawer).toBeHidden();
  await expect(row.getByRole('status')).toHaveText('Sold', LOAD);
  const after = await staffApi.getVehicle(v.id);
  expect(after.status).toBe('SOLD');
  expect(Number(after.soldPrice)).toBe(21000.5);
});

test('UI-24 DMS-11 DMS-12 DMS-16: a sold vehicle opens read-only with sale facts and profit', async ({ staffPage: page, staffApi }) => {
  // Profit = 18900 - 14200 - 800 = 3900.
  const created = await staffApi.createVehicle({ purchaseCost: 14200, repairCost: 800 });
  const v = await staffApi.sellVehicle(created, 18900, SOLD_ON);

  const row = await openDmsRow(page, v.vin);
  await expect(row.getByRole('status')).toHaveText('Sold', LOAD);
  await expect(row.getByRole('button', { name: 'Sell', exact: true })).toHaveCount(0);

  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Edit vehicle' });
  await expect(drawer).toBeVisible();

  // Every locked purchase field is disabled (DMS-11 list).
  for (const label of ['Make', 'Model', 'Model year', 'VIN', 'Purchase cost', 'Added on', 'Repair cost', 'Carfax URL', 'Source']) {
    const control = field(drawer, label).locator('input, select');
    await expect(control, `${label} is locked after sale`).toHaveCount(1);
    await expect(control, `${label} is locked after sale`).toBeDisabled();
  }
  await expect(field(drawer, 'VIN').locator('input')).toHaveValue(v.vin);
  await expect(field(drawer, 'Purchase cost').locator('input')).toHaveValue(/^14200(\.0+)?$/);
  // Condition stays editable after sale (only the purchase fields are locked).
  await expect(field(drawer, 'Condition').locator('select')).toBeEnabled();

  // No second sale (DMS-12).
  await expect(drawer.getByRole('button', { name: 'Mark as sold' })).toHaveCount(0);

  // Sale facts and profit (DMS-16).
  await expect(field(drawer, 'Sold date')).toContainText(SOLD_ON);
  await expect(field(drawer, 'Sold price')).toContainText('$18,900.00');
  await expect(field(drawer, 'Profit (sold price − purchase cost − repair cost)')).toContainText('$3,900.00');
  await expect(field(drawer, 'Status')).toContainText('Sold');
});

test('DMS-12: confirming a sale that another session already made shows SOLD_LOCKED', async ({ staffPage: page, staffApi, staff2Api, allowBrowserErrors }) => {
  allowBrowserErrors(/409|Conflict/i);
  const v = await staffApi.createVehicle();
  const row = await openDmsRow(page, v.vin);
  await row.getByRole('button', { name: 'Sell', exact: true }).click();
  const dialog = sellDialog(page, v);
  await expect(dialog).toBeVisible();

  // A colleague sells it while the dialog is open; the stale dialog must not sell it twice.
  await staff2Api.sellVehicle(v, 17000, SOLD_ON);

  await fillSale(dialog, SOLD_ON, '19999');
  const attempt = page.waitForResponse((r) => isSellRequest(r.url(), r.request().method(), v.id));
  await dialog.getByRole('button', { name: 'Confirm sale' }).click();
  const res = await attempt;
  expect(res.status()).toBe(409);
  expect(['SOLD_LOCKED', 'VERSION_CONFLICT']).toContain((await res.json()).code);

  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.danger-text')).toBeVisible();
  const after = await staffApi.getVehicle(v.id);
  expect(Number(after.soldPrice), 'the first sale is kept').toBe(17000);
});

test('WO-05: a vehicle with an open work order cannot be sold and the user is told why', async ({ staffPage: page, staffApi, allowBrowserErrors }) => {
  allowBrowserErrors(/409|Conflict/i);
  const v = await staffApi.createVehicle();
  const wo = await staffApi.post(`/api/v1/vehicles/${v.id}/work-orders`, { task: 'Replace front brake pads' });
  await expectStatus(wo, 201);

  const row = await openDmsRow(page, v.vin);
  // WO-07: the list shows the open work-order count.
  await expect(row.getByRole('cell', { name: '1', exact: true })).toBeVisible();

  await row.getByRole('button', { name: 'Sell', exact: true }).click();
  const dialog = sellDialog(page, v);
  await fillSale(dialog, SOLD_ON, '18900');
  const attempt = page.waitForResponse((r) => isSellRequest(r.url(), r.request().method(), v.id));
  await dialog.getByRole('button', { name: 'Confirm sale' }).click();
  const res = await attempt;
  expect(res.status()).toBe(409);
  expect((await res.json()).code).toBe('WORK_ORDERS_OPEN');

  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Finish or cancel open work orders before selling')).toBeVisible();
  await expectInStock(staffApi, v.id);

  // Closing the dialog leaves the vehicle in stock with its Sell action.
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(row.getByRole('status')).toHaveText('In stock', LOAD);
  await expect(row.getByRole('button', { name: 'Sell', exact: true })).toBeVisible();
});

test('DMS-10 / CRM-05: the sale can name its buyer, which links the vehicle to that CRM customer', async ({
  staffPage: page, staffApi,
}) => {
  const v = await staffApi.createVehicle();
  const buyer = await staffApi.createCustomer();
  const row = await openDmsRow(page, v.vin);

  await row.getByRole('button', { name: 'Sell', exact: true }).click();
  const dialog = sellDialog(page, v);
  await fillSale(dialog, SOLD_ON, '19500');
  const buyerSelect = dialog.getByLabel('Buyer');
  await expect(buyerSelect).toHaveValue('');
  await buyerSelect.selectOption(String(buyer.id));

  const linked = page.waitForResponse((r) =>
    r.request().method() === 'PUT' && r.url().includes(`/api/v1/customers/${buyer.id}/vehicles/${v.id}`));
  await dialog.getByRole('button', { name: 'Confirm sale' }).click();
  expect((await linked).ok()).toBe(true);
  await expect(dialog).toBeHidden();

  const sold = await staffApi.getVehicle(v.id);
  expect(sold.status).toBe('SOLD');
  expect(sold.linkedCustomer?.id).toBe(buyer.id);
});

test('DMS-10: a sale without a buyer still sells and leaves the vehicle unlinked', async ({ staffPage: page, staffApi }) => {
  const v = await staffApi.createVehicle();
  const row = await openDmsRow(page, v.vin);

  let linkCalls = 0;
  page.on('request', (r) => { if (r.method() === 'PUT' && r.url().includes(`/vehicles/${v.id}`)) linkCalls++; });
  await row.getByRole('button', { name: 'Sell', exact: true }).click();
  const dialog = sellDialog(page, v);
  await fillSale(dialog, SOLD_ON, '19500');
  await dialog.getByRole('button', { name: 'Confirm sale' }).click();
  await expect(dialog).toBeHidden();

  const sold = await staffApi.getVehicle(v.id);
  expect(sold.status).toBe('SOLD');
  expect(sold.linkedCustomer ?? null).toBeNull();
  expect(linkCalls).toBe(0);
});
