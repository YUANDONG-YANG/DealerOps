import { test, expect } from '../../support/fixtures';
import { expectStatus, randomVin, today, type Api, type Vehicle } from '../../support/api';
import { env } from '../../support/env';
import type { Locator, Page } from '@playwright/test';

// UI-22 / DMS-08 / CRM-10 / AUD-06 / AT-11: the vehicle detail drawer on /dms shows every field,
// the linked customer (linking to CRM), the ad check status and the change history, newest first.

// Each test seeds several API writes before driving the drawer; allow for a busy shared stack.
test.describe.configure({ timeout: 90_000 });

type AuditItem = { action: string; actorUsername: string; createdAt: string };

const dealer = env.dealerA;
const contacts = `${dealer.contactPhone}, ${dealer.contactEmail}, ${dealer.contactAddress}`;

/** Same formatting as dateTimeLocal in frontend/react/src/format.ts (browser and runner share a timezone). */
function localDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function vehicleAudit(api: Api, vehicleId: number) {
  const res = await api.get('/api/v1/audit', { entityType: 'VEHICLE', entityId: vehicleId, page: 0, size: 10 });
  await expectStatus(res, 200);
  return ((await res.json()) as { items: AuditItem[] }).items;
}

/**
 * Seeds an in-stock vehicle with a linked customer, an edit by the second staff user and an ad
 * whose check is BLOCKED (a CASH ad without a price), so no AI call is needed.
 */
async function seedVehicle(staffApi: Api, staff2Api: Api) {
  const vin = randomVin();
  const created = await staffApi.createVehicle({
    vin, make: 'Toyota', model: 'Camry', modelYear: 2020, source: 'AUCTION', purchaseCost: 14200,
    addedOn: '2026-09-01', conditionCode: 'AS_IS', repairCost: 800,
    carfaxUrl: `https://example.invalid/carfax/${vin}`,
  });
  const customer = await staffApi.createCustomer();
  await expectStatus(await staffApi.put(`/api/v1/customers/${customer.id}/vehicles/${created.id}`), 200);

  // An edit by another staff user, so the history must show who did what.
  const current = await staffApi.getVehicle(created.id);
  const patched = await staff2Api.patch(`/api/v1/vehicles/${created.id}`, {
    version: current.version, make: current.make, model: current.model, modelYear: current.modelYear,
    vin: current.vin, source: current.source, purchaseCost: 15000, addedOn: current.addedOn,
    conditionCode: current.conditionCode, repairCost: current.repairCost, carfaxUrl: current.carfaxUrl,
  });
  await expectStatus(patched, 200);

  const listing = await staffApi.saveListing(created.id, {
    title: `${created.modelYear} ${created.make} ${created.model}`,
    body: `Used ${created.modelYear} ${created.make} ${created.model}, sold as-is. ${dealer.legalName}, ${contacts}.`,
    adKind: 'CASH',
    medium: 'ONLINE',
  });
  const { httpStatus, check } = await staffApi.runCheck(listing);
  expect(httpStatus).toBe(200);
  expect(check.checkStatus).toBe('BLOCKED');

  return { vehicle: await staffApi.getVehicle(created.id), customer };
}

function detailDrawer(page: Page) {
  return page.getByRole('dialog', { name: 'Edit vehicle' });
}

/** The `.form-item` row whose label text is exactly `label`. */
function field(drawer: Locator, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return drawer.locator('.form-item').filter({ has: drawer.page().locator('label', { hasText: new RegExp(`^${escaped}$`) }) });
}

function auditRows(drawer: Locator) {
  return drawer.locator('.detail-audit tbody tr');
}

/** Asserts the drawer's history table matches the API audit rows, newest first. */
async function expectHistory(drawer: Locator, api: Api, vehicleId: number, expected: [string, string][]) {
  const items = await vehicleAudit(api, vehicleId);
  expect(items.map((i) => [i.action, i.actorUsername])).toEqual(expected);
  // Newest first (AUD-06).
  const times = items.map((i) => Date.parse(i.createdAt));
  expect([...times].sort((a, b) => b - a)).toEqual(times);

  const rows = auditRows(drawer);
  await expect(rows).toHaveCount(expected.length);
  for (const [i, [action, actor]] of expected.entries()) {
    const cells = rows.nth(i).locator('td');
    await expect(cells.nth(0)).toHaveText(action);
    await expect(cells.nth(1)).toHaveText(actor);
    await expect(cells.nth(2)).toHaveText(localDateTime(items[i].createdAt));
  }
}

async function openFromList(page: Page, vehicle: Vehicle) {
  await page.goto('/dms');
  await page.getByPlaceholder('Search VIN, make or model').fill(vehicle.vin);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: vehicle.vin });
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: 'Edit' }).click();
  const drawer = detailDrawer(page);
  await expect(drawer).toBeVisible();
  return drawer;
}

test('UI-22 / DMS-08 / CRM-10 / AUD-06: vehicle detail shows all fields, the customer, the ad check and the history', async ({
  staffPage: page, staffApi, staff2Api,
}) => {
  const { vehicle, customer } = await seedVehicle(staffApi, staff2Api);
  const drawer = await openFromList(page, vehicle);

  // All fields.
  await expect(field(drawer, 'Make').locator('select, input')).toHaveValue(vehicle.make);
  await expect(field(drawer, 'Model').locator('select, input')).toHaveValue(vehicle.model);
  await expect(field(drawer, 'Model year').locator('select')).toHaveValue(String(vehicle.modelYear));
  await expect(field(drawer, 'VIN').locator('input')).toHaveValue(vehicle.vin);
  await expect(field(drawer, 'Purchase cost').locator('input')).toHaveValue(/^15000(\.0+)?$/);
  await expect(field(drawer, 'Added on').locator('input')).toHaveValue('2026-09-01');
  await expect(field(drawer, 'Repair cost').locator('input')).toHaveValue(/^800(\.0+)?$/);
  await expect(field(drawer, 'Carfax URL').locator('input')).toHaveValue(vehicle.carfaxUrl!);
  await expect(field(drawer, 'Source').locator('select')).toHaveValue('AUCTION');
  await expect(field(drawer, 'Condition').locator('select')).toHaveValue('AS_IS');
  await expect(field(drawer, 'Status')).toContainText('In stock');

  // Linked customer with a link to the customer in CRM (CRM-10).
  const customerLink = field(drawer, 'Linked customer').getByRole('link', { name: customer.name });
  await expect(customerLink).toHaveAttribute('href', `/crm?customerId=${customer.id}`);

  // Ad check status.
  await expect(field(drawer, 'Ad check status')).toContainText('Blocked');

  // History: newest first, with actor username, action and time.
  await expectHistory(drawer, staffApi, vehicle.id, [
    ['UPDATE', env.staff2.username],
    ['LINK', env.staff.username],
    ['CREATE', env.staff.username],
  ]);

  // Following the link opens that customer in CRM.
  await customerLink.click();
  await expect(page).toHaveURL(new RegExp(`/crm\\?customerId=${customer.id}$`));
  const customerDrawer = page.getByRole('dialog', { name: 'Customer' });
  await expect(customerDrawer).toBeVisible();
  await expect(customerDrawer.getByLabel('Name')).toHaveValue(customer.name);
});

test('AT-11 / AUD-06: editing a vehicle in the drawer adds an UPDATE by the signed-in user at the top', async ({
  staffPage: page, staffApi, staff2Api,
}) => {
  const { vehicle } = await seedVehicle(staffApi, staff2Api);
  const drawer = await openFromList(page, vehicle);
  await expect(auditRows(drawer)).toHaveCount(3);

  const repair = field(drawer, 'Repair cost').locator('input');
  await repair.fill('950');
  const saved = page.waitForResponse(
    (r) => r.url().includes(`/api/v1/vehicles/${vehicle.id}`) && r.request().method() === 'PATCH',
  );
  await drawer.getByRole('button', { name: 'Save', exact: true }).click();
  expect((await saved).status()).toBe(200);

  await expectHistory(drawer, staffApi, vehicle.id, [
    ['UPDATE', env.staff.username],
    ['UPDATE', env.staff2.username],
    ['LINK', env.staff.username],
    ['CREATE', env.staff.username],
  ]);
});

test('UI-22 / DMS-08 / AUD-06: a sold vehicle opened by link shows the sale, the customer and SELL at the top', async ({
  staffPage: page, staffApi, staff2Api,
}) => {
  const { vehicle, customer } = await seedVehicle(staffApi, staff2Api);
  const soldOn = today();
  await staffApi.sellVehicle(vehicle, 18900, soldOn);

  await page.goto(`/dms?vehicleId=${vehicle.id}`);
  const drawer = detailDrawer(page);
  await expect(drawer).toBeVisible();

  await expect(field(drawer, 'VIN').locator('input')).toHaveValue(vehicle.vin);
  await expect(field(drawer, 'Status')).toContainText('Sold');
  await expect(field(drawer, 'Sold date')).toContainText(soldOn);
  await expect(field(drawer, 'Sold price')).toContainText('18,900');
  // 18900 - 15000 - 800 = 3100.
  await expect(drawer.locator('.form-item', { hasText: 'Profit' })).toContainText('3,100');

  await expect(field(drawer, 'Linked customer').getByRole('link', { name: customer.name }))
    .toHaveAttribute('href', `/crm?customerId=${customer.id}`);
  await expect(field(drawer, 'Ad check status')).toContainText('Blocked');

  await expectHistory(drawer, staffApi, vehicle.id, [
    ['SELL', env.staff.username],
    ['UPDATE', env.staff2.username],
    ['LINK', env.staff.username],
    ['CREATE', env.staff.username],
  ]);
});
