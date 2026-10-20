import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { expectStatus, uniqueSuffix, type Api, type Customer, type Vehicle } from '../../support/api';

// The picker collects every vehicle page of the dealership before filtering, which can take
// a while in a busy shared dealer, so positive picker assertions get a longer timeout.
const PICKER_TIMEOUT = 20_000;

/** A model name unique to this test, so a model search matches only our vehicle. */
function uniqueModel() {
  return `M${uniqueSuffix()}`.slice(0, 20);
}

async function link(api: Api, customer: Customer, vehicle: Vehicle) {
  await expectStatus(await api.put(`/api/v1/customers/${customer.id}/vehicles/${vehicle.id}`), 200);
}

async function openCustomer(page: Page, customerId: number) {
  await page.goto(`/crm?customerId=${customerId}`);
  const drawer = page.getByRole('dialog', { name: 'Customer' });
  await expect(drawer).toBeVisible();
  return drawer;
}

function picker(drawer: Locator) {
  return {
    search: drawer.getByPlaceholder('Search by VIN or model'),
    listbox: drawer.getByRole('listbox', { name: 'Unlinked vehicles' }),
    options: drawer.getByRole('listbox', { name: 'Unlinked vehicles' }).getByRole('option'),
    empty: drawer.getByRole('listbox', { name: 'Unlinked vehicles' }).getByText('No unlinked vehicles match.'),
    linkButton: drawer.getByRole('button', { name: 'Link vehicle' }),
  };
}

/** The linked-vehicle row of the drawer: the element wrapping the vehicle's DMS link. */
function linkedRow(drawer: Locator, vehicleId: number) {
  return drawer.locator(`a[href="/dms?vehicleId=${vehicleId}"]`).locator('..');
}

function confirmDialog(page: Page) {
  return page.locator('.dialog', { hasText: 'Remove this vehicle link?' });
}

test.describe('CRM link and unlink (UI)', () => {
  // Loading the picker pages through every vehicle of the shared dealer.
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(({ allowBrowserErrors }) => {
    // Known defect: the picker concatenates offset pages without de-duplicating, so a vehicle
    // created by a parallel test between page fetches appears twice and React logs a
    // duplicate-key warning (CrmPage.tsx collectAllPages). Reported; not the behavior under test.
    allowBrowserErrors(/Encountered two children with the same key/);
  });

  test('UI-32 / CRM-04: drawer shows linked vehicles with VIN and status, and they open in DMS', async ({ staffPage: page, staffApi }) => {
    const customer = await staffApi.createCustomer();
    const model = uniqueModel();
    const inStock = await staffApi.createVehicle({ model, modelYear: 2021, make: 'Honda' });
    const toSell = await staffApi.createVehicle();
    await link(staffApi, customer, inStock);
    await link(staffApi, customer, toSell);
    await staffApi.sellVehicle(toSell);

    const drawer = await openCustomer(page, customer.id);

    const inStockRow = linkedRow(drawer, inStock.id);
    await expect(inStockRow).toContainText(`2021 Honda ${model}`);
    await expect(inStockRow).toContainText(inStock.vin);
    await expect(inStockRow).toContainText('In stock');
    await expect(inStockRow.getByRole('button', { name: 'Unlink' })).toBeVisible();

    const soldRow = linkedRow(drawer, toSell.id);
    await expect(soldRow).toContainText(toSell.vin);
    await expect(soldRow).toContainText('Sold');

    // History section is part of the detail view (CUSTOMER / CREATE at least).
    await expect(drawer.locator('.detail-audit')).toBeVisible();
    await expect(drawer.locator('.detail-audit')).toContainText('CREATE');

    await drawer.getByRole('link', { name: `2021 Honda ${model}` }).click();
    await expect(page).toHaveURL(new RegExp(`/dms\\?vehicleId=${inStock.id}$`));
  });

  test('UI-33 / CRM-05 / CRM-06: picker lists only unlinked vehicles of this dealer, searchable by VIN and model, and links', async ({ staffPage: page, staffApi, rivalApi }) => {
    const customer = await staffApi.createCustomer();
    const other = await staffApi.createCustomer();
    const model = uniqueModel();
    const free = await staffApi.createVehicle({ model });
    const taken = await staffApi.createVehicle({ model });
    await link(staffApi, other, taken);
    const rival = await rivalApi.createVehicle({ model });

    const drawer = await openCustomer(page, customer.id);
    const p = picker(drawer);

    // Search by VIN finds the free vehicle (also proves the options have loaded).
    await p.search.fill(free.vin);
    await expect(p.options).toHaveCount(1, { timeout: PICKER_TIMEOUT });
    await expect(p.options.first()).toContainText(free.vin);
    await expect(p.options.first()).toContainText('In stock');

    // Already linked (to another customer) and other-dealer vehicles are never offered.
    await p.search.fill(taken.vin);
    await expect(p.empty).toBeVisible();
    await expect(p.options).toHaveCount(0);
    await p.search.fill(rival.vin);
    await expect(p.empty).toBeVisible();
    await expect(p.options).toHaveCount(0);

    // Search by model: three vehicles share the model, only the free one is linkable here.
    await p.search.fill(model.toLowerCase());
    await expect(p.options).toHaveCount(1);
    await expect(p.options.first()).toContainText(free.vin);

    // Link it.
    await expect(p.linkButton).toBeDisabled();
    await p.options.first().click();
    await expect(p.options.first()).toHaveAttribute('aria-selected', 'true');
    const put = page.waitForResponse(
      (r) => r.url().includes(`/api/v1/customers/${customer.id}/vehicles/${free.id}`) && r.request().method() === 'PUT',
    );
    await p.linkButton.click();
    expect((await put).status()).toBe(200);

    await expect(linkedRow(drawer, free.id)).toContainText(free.vin);
    // The vehicle is now linked, so it leaves the picker.
    await p.search.fill(free.vin);
    await expect(p.empty).toBeVisible();

    const after = await staffApi.getVehicle(free.id);
    expect(after.linkedCustomer?.id).toBe(customer.id);
  });

  test('CRM-08: unlinking an in-stock vehicle asks for confirmation and then removes the link', async ({ staffPage: page, staffApi }) => {
    const customer = await staffApi.createCustomer();
    const vehicle = await staffApi.createVehicle({ model: uniqueModel() });
    await link(staffApi, customer, vehicle);

    const drawer = await openCustomer(page, customer.id);
    const row = linkedRow(drawer, vehicle.id);
    await expect(row).toContainText(vehicle.vin);

    // Cancel keeps the link and sends no request.
    let deletes = 0;
    page.on('request', (r) => {
      if (r.method() === 'DELETE' && r.url().includes(`/vehicles/${vehicle.id}`)) deletes++;
    });
    await row.getByRole('button', { name: 'Unlink' }).click();
    await expect(confirmDialog(page)).toBeVisible();
    await expect(confirmDialog(page)).toContainText('Unlink vehicle');
    await confirmDialog(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(confirmDialog(page)).toBeHidden();
    await expect(row).toBeVisible();
    expect(deletes).toBe(0);

    // Confirm removes it.
    await row.getByRole('button', { name: 'Unlink' }).click();
    const del = page.waitForResponse(
      (r) => r.url().includes(`/api/v1/customers/${customer.id}/vehicles/${vehicle.id}`) && r.request().method() === 'DELETE',
    );
    await confirmDialog(page).getByRole('button', { name: 'Confirm' }).click();
    expect((await del).status()).toBe(204);
    await expect(drawer.locator(`a[href="/dms?vehicleId=${vehicle.id}"]`)).toHaveCount(0);

    // Back to unlinked: offered again in the picker, and status unchanged.
    const p = picker(drawer);
    await p.search.fill(vehicle.vin);
    await expect(p.options).toHaveCount(1, { timeout: PICKER_TIMEOUT });
    const after = await staffApi.getVehicle(vehicle.id);
    // Core serializes with WhenWritingNull, so an unlinked vehicle omits linkedCustomer.
    expect(after.linkedCustomer ?? null).toBeNull();
    expect(after.status).toBe('IN_STOCK');
  });

  test('CRM-08: a sold vehicle cannot be unlinked and the drawer says so', async ({ staffPage: page, staffApi }) => {
    const customer = await staffApi.createCustomer();
    const vehicle = await staffApi.createVehicle();
    await link(staffApi, customer, vehicle);
    await staffApi.sellVehicle(vehicle);

    const drawer = await openCustomer(page, customer.id);
    const row = linkedRow(drawer, vehicle.id);
    await expect(row).toContainText('Sold');
    await expect(row).toContainText('Sold vehicles cannot be unlinked');
    await expect(row.getByRole('button', { name: 'Unlink' })).toHaveCount(0);
  });

  test('CRM-08: a vehicle sold while the drawer is open is refused with SOLD_LOCKED on unlink', async ({ staffPage: page, staffApi, allowBrowserErrors }) => {
    // The browser logs the expected 409 response as a console error.
    allowBrowserErrors(/409|Conflict/i);
    const customer = await staffApi.createCustomer();
    const vehicle = await staffApi.createVehicle();
    await link(staffApi, customer, vehicle);

    const drawer = await openCustomer(page, customer.id);
    const row = linkedRow(drawer, vehicle.id);
    await expect(row.getByRole('button', { name: 'Unlink' })).toBeVisible();

    // Sold by someone else after the drawer loaded.
    await staffApi.sellVehicle(await staffApi.getVehicle(vehicle.id));

    await row.getByRole('button', { name: 'Unlink' }).click();
    const del = page.waitForResponse(
      (r) => r.url().includes(`/api/v1/customers/${customer.id}/vehicles/${vehicle.id}`) && r.request().method() === 'DELETE',
    );
    await confirmDialog(page).getByRole('button', { name: 'Confirm' }).click();
    const res = await del;
    expect(res.status()).toBe(409);
    expect((await res.json()).code).toBe('SOLD_LOCKED');

    await expect(drawer.locator('.danger-text', { hasText: 'Sold vehicles cannot be unlinked' })).toBeVisible();
    await expect(row).toBeVisible();
    expect((await staffApi.getVehicle(vehicle.id)).linkedCustomer?.id).toBe(customer.id);
  });

  test('AT-25 / CRM-05 / CRM-07: a sold unlinked vehicle can be linked from the picker once, then is locked', async ({ staffPage: page, staffApi }) => {
    const customer = await staffApi.createCustomer();
    const second = await staffApi.createCustomer();
    const vehicle = await staffApi.sellVehicle(await staffApi.createVehicle({ model: uniqueModel() }));
    // An unlinked vehicle used only to prove the second picker has loaded.
    const probe = await staffApi.createVehicle();

    const drawer = await openCustomer(page, customer.id);
    const p = picker(drawer);
    await p.search.fill(vehicle.vin);
    await expect(p.options).toHaveCount(1, { timeout: PICKER_TIMEOUT });
    await expect(p.options.first()).toContainText('Sold');
    await p.options.first().click();
    const put = page.waitForResponse(
      (r) => r.url().includes(`/api/v1/customers/${customer.id}/vehicles/${vehicle.id}`) && r.request().method() === 'PUT',
    );
    await p.linkButton.click();
    expect((await put).status()).toBe(200);

    const row = linkedRow(drawer, vehicle.id);
    await expect(row).toContainText('Sold vehicles cannot be unlinked');
    await expect(row.getByRole('button', { name: 'Unlink' })).toHaveCount(0);

    // A second customer's picker no longer offers it.
    const secondDrawer = await openCustomer(page, second.id);
    const p2 = picker(secondDrawer);
    await p2.search.fill(probe.vin);
    await expect(p2.options).toHaveCount(1, { timeout: PICKER_TIMEOUT });
    await p2.search.fill(vehicle.vin);
    await expect(p2.empty).toBeVisible();

    // CRM-07 / CRM-08 at the API boundary.
    const again = await staffApi.put(`/api/v1/customers/${second.id}/vehicles/${vehicle.id}`);
    expect(again.status()).toBe(409);
    expect((await again.json()).code).toBe('VEHICLE_ALREADY_LINKED');
    const unlink = await staffApi.delete(`/api/v1/customers/${customer.id}/vehicles/${vehicle.id}`);
    expect(unlink.status()).toBe(409);
    expect((await unlink.json()).code).toBe('SOLD_LOCKED');
  });

  test('CRM-11: history shows LINK and UNLINK without contact values', async ({ staffPage: page, staffApi }) => {
    const customer = await staffApi.createCustomer();
    const vehicle = await staffApi.createVehicle({ model: uniqueModel() });

    const drawer = await openCustomer(page, customer.id);
    const p = picker(drawer);
    await p.search.fill(vehicle.vin);
    await expect(p.options).toHaveCount(1, { timeout: PICKER_TIMEOUT });
    await p.options.first().click();
    await p.linkButton.click();
    const row = linkedRow(drawer, vehicle.id);
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Unlink' }).click();
    await confirmDialog(page).getByRole('button', { name: 'Confirm' }).click();
    await expect(drawer.locator(`a[href="/dms?vehicleId=${vehicle.id}"]`)).toHaveCount(0);

    const audit = drawer.locator('.detail-audit');
    // Rows of the related link record carry its label (AuditTrail).
    await expect(audit.getByRole('cell', { name: 'Vehicle link · LINK', exact: true })).toHaveCount(1);
    await expect(audit.getByRole('cell', { name: 'Vehicle link · UNLINK', exact: true })).toHaveCount(1);
    await expect(audit.getByRole('cell', { name: 'CREATE', exact: true })).toHaveCount(1);

    const historyText = (await audit.innerText()).toLowerCase();
    for (const secret of [customer.email, customer.phone, customer.homeAddress]) {
      expect(historyText, 'history must not show contact values').not.toContain(secret.toLowerCase());
    }

    // The underlying audit response must not carry the values either.
    const res = await staffApi.get('/api/v1/audit', { entityType: 'CUSTOMER', entityId: customer.id });
    await expectStatus(res, 200);
    const raw = (await res.text()).toLowerCase();
    for (const secret of [customer.email, customer.phone, customer.homeAddress]) {
      expect(raw, 'audit API must not carry contact values').not.toContain(secret.toLowerCase());
    }
  });
});
