import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { customerBody, expectError, expectStatus, randomVin, uniqueSuffix, type Api } from '../../support/api';
import { env } from '../../support/env';

// Lead follow-up UI on /leads (design/21 §3, LEAD-01..09; API design/14 §5.5).

// The shared local stack is slow under parallel load; each test drives several round trips.
test.beforeEach(() => test.slow());

type Lead = {
  id: number; customerId: number; customerName: string; stage: string; ownerUsername: string | null;
  nextFollowUpOn: string | null; lostReason: string | null; version: number;
  vehicle: { id: number; vin: string } | null;
  notes: { id: number; authorUsername: string; body: string; createdAt: string }[];
};

/** Form fields on this page have labels without htmlFor, so they are scoped by their .form-item. */
function field(scope: Locator, label: string) {
  return scope.locator('.form-item', { has: scope.page().getByText(label, { exact: true }) });
}

async function createLeadApi(api: Api, body: Record<string, unknown>) {
  const res = await api.post('/api/v1/leads', body);
  await expectStatus(res, 201);
  return (await res.json()) as Lead;
}

async function getLeadApi(api: Api, id: number) {
  const res = await api.get(`/api/v1/leads/${id}`);
  await expectStatus(res, 200);
  return (await res.json()) as Lead;
}

/** Filters the list by customer name and returns that lead's row. */
async function findRow(page: Page, customerName: string) {
  await page.getByPlaceholder('Customer name').fill(customerName);
  await page.getByRole('button', { name: 'Search' }).click();
  const row = page.getByRole('row').filter({ hasText: customerName });
  await expect(row).toHaveCount(1);
  return row;
}

async function openLead(page: Page, id: number) {
  await page.goto(`/leads?leadId=${id}`);
  const drawer = page.getByRole('dialog', { name: 'Lead' });
  await expect(drawer).toBeVisible({ timeout: 30_000 });
  return drawer;
}

function waitForPatch(page: Page, id: number) {
  return page.waitForResponse((r) => r.url().includes(`/api/v1/leads/${id}`) && r.request().method() === 'PATCH');
}

test('LEAD-01 LEAD-02 LEAD-04 LEAD-05: add a lead for an existing customer with an in-stock vehicle, owner and due date', async ({ staffPage: page, staffApi }) => {
  const customer = await staffApi.createCustomer();
  const vehicle = await staffApi.createVehicle({ make: 'Honda', model: 'Civic', modelYear: 2021 });
  const firstNote = `First call ${uniqueSuffix()}`;

  await page.goto('/leads');
  await page.getByRole('button', { name: 'Add lead' }).click();
  const drawer = page.getByRole('dialog', { name: 'Add lead' });

  const customerItem = field(drawer, 'Customer');
  await customerItem.getByPlaceholder('Search customers').fill(customer.name);
  await expect(customerItem.locator(`option[value="${customer.id}"]`)).toBeAttached();
  await customerItem.locator('select').selectOption(String(customer.id));

  const vehicleItem = field(drawer, 'Vehicle of interest (in stock)');
  await vehicleItem.getByPlaceholder('Search vehicles').fill(vehicle.vin);
  await expect(vehicleItem.locator(`option[value="${vehicle.id}"]`)).toBeAttached();
  await vehicleItem.locator('select').selectOption(String(vehicle.id));

  await field(drawer, 'Owner').locator('select').selectOption(env.staff2.username);
  await field(drawer, 'Next follow-up').locator('input').fill('2030-03-15');
  await field(drawer, 'First note').locator('textarea').fill(firstNote);

  const created = page.waitForResponse((r) => r.url().endsWith('/api/v1/leads') && r.request().method() === 'POST');
  await drawer.getByRole('button', { name: 'Save' }).click();
  const res = await created;
  expect(res.status()).toBe(201);
  const lead = (await res.json()) as Lead;
  expect(lead).toMatchObject({
    customerId: customer.id, stage: 'NEW', ownerUsername: env.staff2.username, nextFollowUpOn: '2030-03-15',
  });
  expect(lead.vehicle?.id).toBe(vehicle.id);
  await expect(drawer).toBeHidden();

  // LEAD-05: the list shows customer, vehicle of interest, stage, owner and next follow-up.
  const row = await findRow(page, customer.name);
  await expect(row).toContainText('2021 Honda Civic');
  await expect(row).toContainText('New');
  await expect(row).toContainText(env.staff2.username);
  await expect(row).toContainText('2030-03-15');
  await expect(row).not.toContainText('Overdue');

  await row.getByRole('button', { name: 'Open' }).click();
  const detail = page.getByRole('dialog', { name: 'Lead' });
  await expect(detail.getByRole('link', { name: customer.name })).toBeVisible();
  await expect(detail.locator('.lead-note')).toHaveCount(1);
  await expect(detail.locator('.lead-note')).toContainText(firstNote);
  await expect(detail.locator('.lead-note')).toContainText(env.staff.username);
});

test('LEAD-01: add a lead for a new prospect creates the customer in the same save', async ({ staffPage: page, staffApi }) => {
  const prospect = customerBody();

  await page.goto('/leads');
  await page.getByRole('button', { name: 'Add lead' }).click();
  const drawer = page.getByRole('dialog', { name: 'Add lead' });
  await drawer.getByRole('radio', { name: 'New customer' }).check();

  // All four CRM fields are required before anything is sent.
  await field(drawer, 'Name').locator('input').fill(prospect.name);
  await drawer.getByRole('button', { name: 'Save' }).click();
  await expect(drawer.getByText('Check required fields')).toBeVisible();

  await field(drawer, 'Email').locator('input').fill(prospect.email);
  await field(drawer, 'Phone').locator('input').fill(prospect.phone);
  await field(drawer, 'Home address').locator('input').fill(prospect.homeAddress);

  const created = page.waitForResponse((r) => r.url().endsWith('/api/v1/leads') && r.request().method() === 'POST');
  await drawer.getByRole('button', { name: 'Save' }).click();
  const res = await created;
  expect(res.status()).toBe(201);
  const lead = (await res.json()) as Lead;
  expect(lead.stage).toBe('NEW');
  // Null fields may be omitted from the JSON.
  expect(lead.vehicle ?? null).toBeNull();
  expect(lead.ownerUsername ?? null).toBeNull();
  await expect(drawer).toBeHidden();

  const row = await findRow(page, prospect.name);
  await expect(row).toContainText('New');

  // The prospect now exists as a CRM customer of this dealership.
  const customers = await staffApi.get('/api/v1/customers', { q: prospect.email });
  await expectStatus(customers, 200);
  const items = ((await customers.json()) as { items: { id: number; email: string }[] }).items;
  expect(items.map((c) => c.id)).toContain(lead.customerId);
});

test('LEAD-01 LEAD-02: a customer is required and only in-stock vehicles are offered', async ({ staffPage: page, staffApi }) => {
  // Two vehicles sharing a unique VIN prefix: one in stock, one sold.
  const prefix = randomVin().slice(0, 12);
  const inStock = await staffApi.createVehicle({ vin: prefix + randomVin().slice(0, 5) });
  const sold = await staffApi.sellVehicle(await staffApi.createVehicle({ vin: prefix + randomVin().slice(0, 5) }));

  await page.goto('/leads');
  await page.getByRole('button', { name: 'Add lead' }).click();
  const drawer = page.getByRole('dialog', { name: 'Add lead' });

  let posted = false;
  page.on('request', (r) => { if (r.url().endsWith('/api/v1/leads') && r.method() === 'POST') posted = true; });
  await drawer.getByRole('button', { name: 'Save' }).click();
  await expect(drawer.getByText('Choose a customer')).toBeVisible();
  expect(posted).toBe(false);

  const vehicleItem = field(drawer, 'Vehicle of interest (in stock)');
  await vehicleItem.getByPlaceholder('Search vehicles').fill(prefix);
  await expect(vehicleItem.locator(`option[value="${inStock.id}"]`)).toBeAttached();
  await expect(vehicleItem.locator(`option[value="${sold.id}"]`)).toHaveCount(0);
});

test('LEAD-03: move a lead through the pipeline to Won, after which it cannot be changed', async ({ staffPage: page, staffApi }) => {
  const customer = await staffApi.createCustomer();
  const created = await createLeadApi(staffApi, { customerId: customer.id });

  const drawer = await openLead(page, created.id);
  const stage = field(drawer, 'Stage').locator('select');
  await expect(stage).toHaveValue('NEW');

  for (const value of ['CONTACTED', 'QUALIFIED'] as const) {
    await stage.selectOption(value);
    const saved = waitForPatch(page, created.id);
    await drawer.getByRole('button', { name: 'Save' }).click();
    expect((await saved).status()).toBe(200);
    await expect(stage).toHaveValue(value);
    await expect(drawer.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect((await getLeadApi(staffApi, created.id)).stage).toBe(value);
  }

  // Owner and due date are edited in the same drawer.
  await field(drawer, 'Owner').locator('select').selectOption(env.staff.username);
  await field(drawer, 'Next follow-up').locator('input').fill('2030-05-01');
  await stage.selectOption('WON');
  const won = waitForPatch(page, created.id);
  await drawer.getByRole('button', { name: 'Save' }).click();
  expect((await won).status()).toBe(200);

  const after = await getLeadApi(staffApi, created.id);
  expect(after).toMatchObject({ stage: 'WON', ownerUsername: env.staff.username, nextFollowUpOn: '2030-05-01' });

  // A WON lead is final: every editable control is locked and Save is gone.
  await expect(drawer.getByText('This lead is closed. You can still add notes.')).toBeVisible();
  await expect(stage).toBeDisabled();
  await expect(field(drawer, 'Owner').locator('select')).toBeDisabled();
  await expect(field(drawer, 'Next follow-up').locator('input')).toBeDisabled();
  await expect(field(drawer, 'Vehicle of interest (in stock)').locator('select')).toBeDisabled();
  await expect(drawer.getByRole('button', { name: 'Save' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  const row = await findRow(page, customer.name);
  await expect(row).toContainText('Won');
  await expect(row).toContainText(env.staff.username);
  await expect(row).toContainText('2030-05-01');

  // The server enforces it too.
  const reopen = await staffApi.patch(`/api/v1/leads/${created.id}`, {
    stage: 'CONTACTED', ownerUsername: null, nextFollowUpOn: null, vehicleId: null, lostReason: null,
    version: after.version,
  });
  await expectError(reopen, 409, 'LEAD_CLOSED');

  // Reloading keeps it locked.
  const reopened = await openLead(page, created.id);
  await expect(field(reopened, 'Stage').locator('select')).toHaveValue('WON');
  await expect(field(reopened, 'Stage').locator('select')).toBeDisabled();
});

test('LEAD-03: marking a lead Lost requires a reason and closes it', async ({ staffPage: page, staffApi }) => {
  const customer = await staffApi.createCustomer();
  const created = await createLeadApi(staffApi, { customerId: customer.id });
  const reason = `Bought elsewhere ${uniqueSuffix()}`;

  const drawer = await openLead(page, created.id);
  const stage = field(drawer, 'Stage').locator('select');
  await stage.selectOption('LOST');
  const reasonInput = field(drawer, 'Lost reason').locator('input');
  await expect(reasonInput).toBeVisible();

  let patched = false;
  page.on('request', (r) => { if (r.url().includes(`/api/v1/leads/${created.id}`) && r.method() === 'PATCH') patched = true; });
  await drawer.getByRole('button', { name: 'Save' }).click();
  await expect(drawer.getByText('A lost lead needs a reason')).toBeVisible();
  expect(patched).toBe(false);
  expect((await getLeadApi(staffApi, created.id)).stage).toBe('NEW');

  await reasonInput.fill(reason);
  const saved = waitForPatch(page, created.id);
  await drawer.getByRole('button', { name: 'Save' }).click();
  expect((await saved).status()).toBe(200);

  const after = await getLeadApi(staffApi, created.id);
  expect(after).toMatchObject({ stage: 'LOST', lostReason: reason });
  await expect(stage).toBeDisabled();
  await expect(reasonInput).toHaveValue(reason);
  await expect(reasonInput).toBeDisabled();
  await expect(drawer.getByRole('button', { name: 'Save' })).toHaveCount(0);
  await expect(drawer.getByText('This lead is closed. You can still add notes.')).toBeVisible();

  await page.keyboard.press('Escape');
  const row = await findRow(page, customer.name);
  await expect(row).toContainText('Lost');
});

test('LEAD-07 LEAD-08: notes are append-only, newest first, with author, and still allowed on a closed lead', async ({ staffPage: page, staffApi, staff2Api }) => {
  const customer = await staffApi.createCustomer();
  const created = await createLeadApi(staffApi, { customerId: customer.id });
  // A note by another member of the dealership.
  const older = `Left voicemail ${uniqueSuffix()}`;
  await expectStatus(await staff2Api.post(`/api/v1/leads/${created.id}/notes`, { body: older }), 201);

  const drawer = await openLead(page, created.id);
  const notes = drawer.locator('.lead-note');
  await expect(notes).toHaveCount(1);
  await expect(notes.first()).toContainText(env.staff2.username);

  const addButton = drawer.getByRole('button', { name: 'Add note' });
  await expect(addButton).toBeDisabled();
  const newer = `Booked test drive ${uniqueSuffix()}`;
  await drawer.getByPlaceholder('Add a follow-up note').fill(newer);
  const posted = page.waitForResponse((r) => r.url().endsWith(`/api/v1/leads/${created.id}/notes`) && r.request().method() === 'POST');
  await addButton.click();
  expect((await posted).status()).toBe(201);
  await expect(drawer.getByPlaceholder('Add a follow-up note')).toHaveValue('');

  await expect(notes).toHaveCount(2);
  await expect(notes.nth(0)).toContainText(newer);
  await expect(notes.nth(0)).toContainText(env.staff.username);
  await expect(notes.nth(1)).toContainText(older);
  // Append-only: no edit or delete control on notes.
  await expect(notes.getByRole('button')).toHaveCount(0);
  await expect(notes.getByRole('textbox')).toHaveCount(0);

  // LEAD-08: the note is audited without its text.
  const audit = drawer.locator('.detail-audit');
  await expect(audit.getByRole('cell', { name: 'NOTE', exact: true }).first()).toBeVisible();
  await expect(audit).not.toContainText(newer);
  await expect(audit).not.toContainText(older);

  // Close the lead; notes are still accepted and order is preserved after reload.
  const current = await getLeadApi(staffApi, created.id);
  await expectStatus(await staffApi.patch(`/api/v1/leads/${created.id}`, {
    stage: 'WON', ownerUsername: null, nextFollowUpOn: null, vehicleId: null, lostReason: null, version: current.version,
  }), 200);
  const closed = await openLead(page, created.id);
  const closing = `Delivered ${uniqueSuffix()}`;
  await closed.getByPlaceholder('Add a follow-up note').fill(closing);
  await closed.getByRole('button', { name: 'Add note' }).click();
  const closedNotes = closed.locator('.lead-note');
  await expect(closedNotes).toHaveCount(3);
  await expect(closedNotes.nth(0)).toContainText(closing);
  await expect(closedNotes.nth(1)).toContainText(newer);
  await expect(closedNotes.nth(2)).toContainText(older);
});

test('LEAD-05 LEAD-06: overdue open leads are flagged and filterable; closed leads are not overdue', async ({ staffPage: page, staffApi }) => {
  const tag = uniqueSuffix();
  const openCustomer = await staffApi.createCustomer({ name: `E2E Late Open ${tag}` });
  const closedCustomer = await staffApi.createCustomer({ name: `E2E Late Closed ${tag}` });
  await createLeadApi(staffApi, { customerId: openCustomer.id, nextFollowUpOn: '2025-01-15' });
  const closed = await createLeadApi(staffApi, { customerId: closedCustomer.id, nextFollowUpOn: '2025-01-15' });
  await expectStatus(await staffApi.patch(`/api/v1/leads/${closed.id}`, {
    stage: 'LOST', ownerUsername: null, nextFollowUpOn: '2025-01-15', vehicleId: null, lostReason: 'No budget',
    version: closed.version,
  }), 200);

  await page.goto('/leads');
  await page.getByPlaceholder('Customer name').fill(tag);
  await page.getByRole('button', { name: 'Search' }).click();
  const openRow = page.getByRole('row').filter({ hasText: openCustomer.name });
  const closedRow = page.getByRole('row').filter({ hasText: closedCustomer.name });
  await expect(openRow).toContainText('Overdue');
  await expect(closedRow).toBeVisible();
  await expect(closedRow).not.toContainText('Overdue');

  await page.getByText('Overdue only').click();
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(openRow).toBeVisible();
  await expect(closedRow).toHaveCount(0);

  // Stage filter.
  await page.getByText('Overdue only').click();
  await page.locator('.filters select').first().selectOption('LOST');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(closedRow).toBeVisible();
  await expect(openRow).toHaveCount(0);
});
