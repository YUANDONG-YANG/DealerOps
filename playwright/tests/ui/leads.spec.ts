import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import {
  customerBody, expectError, expectStatus, randomVin, today, uniqueSuffix, type Api, type Vehicle,
} from '../../support/api';
import { env } from '../../support/env';

// Lead follow-up UI on /leads (design/21 §3, LEAD-01..09; API design/14 §5.5).
// The 2026-11-03 change request adds L1 (owner prefilled), L2 (vehicle search and live customer
// filter), L3 (suggest boxes for Customer and Vehicle of interest), L4 (reopen a closed lead),
// L5 (no duplicate open lead), CR-012 (server-side sort) and CR-022 (unsaved-change and
// close-lead confirmations).

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

/** A home address nobody else uses, so the duplicate-customer confirm (R4) stays out of the way. */
function freshCustomer(overrides: Record<string, unknown> = {}) {
  return customerBody({ homeAddress: `${uniqueSuffix()} Lead Road, Calgary, AB`, ...overrides });
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

async function patchLeadApi(api: Api, lead: Lead, overrides: Record<string, unknown>) {
  const res = await api.patch(`/api/v1/leads/${lead.id}`, {
    stage: lead.stage, ownerUsername: lead.ownerUsername, nextFollowUpOn: lead.nextFollowUpOn,
    vehicleId: lead.vehicle?.id ?? null, lostReason: lead.lostReason, version: lead.version, ...overrides,
  });
  await expectStatus(res, 200);
  return (await res.json()) as Lead;
}

/** A sale needs a buyer since the change request (D8), so `Api.sellVehicle` cannot be used. */
async function sell(api: Api, v: Vehicle, buyerCustomerId: number | null = null) {
  const res = await api.post(`/api/v1/vehicles/${v.id}/sell`, {
    soldOn: today(), soldPrice: 18900, version: v.version,
    buyerCustomerId, buyerName: buyerCustomerId == null ? 'Walk-in buyer' : null,
  });
  await expectStatus(res, 200);
  return (await res.json()) as Vehicle;
}

/** Types into a suggest box (L3) and picks the suggestion matching `option`. */
async function pickSuggestion(scope: Locator, ariaLabel: string, typed: string, option: string | RegExp) {
  const box = scope.getByRole('combobox', { name: ariaLabel, exact: true });
  await box.fill(typed);
  const choice = scope.getByRole('listbox', { name: `${ariaLabel} suggestions` })
    .getByRole('option').filter({ hasText: option });
  await expect(choice.first()).toBeVisible({ timeout: 20_000 });
  await choice.first().click();
  return box;
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

function dialog(page: Page, text: string | RegExp) {
  return page.locator('.dialog').filter({ hasText: text });
}

/** Won and lost are final, so the drawer asks before it saves the close (CR-022). */
async function saveClosing(page: Page, drawer: Locator, id: number) {
  await drawer.getByRole('button', { name: 'Save' }).click();
  const confirm = dialog(page, /Close this lead as/);
  await expect(confirm).toBeVisible();
  const saved = waitForPatch(page, id);
  await confirm.getByRole('button', { name: 'Close lead' }).click();
  return saved;
}

const CLOSED_NOTICE = 'This lead is closed. Reopen it to change it; you can still add notes.';

test('LEAD-01 LEAD-02 LEAD-04 LEAD-05 L1 L3: add a lead for an existing customer with an in-stock vehicle, owner and due date', async ({ staffPage: page, staffApi }) => {
  const customer = await staffApi.createCustomer();
  const vehicle = await staffApi.createVehicle({ make: 'Honda', model: 'Civic', modelYear: 2021 });
  const firstNote = `First call ${uniqueSuffix()}`;

  await page.goto('/leads');
  // The owner prefill reads the signed-in username, so wait until /me has filled the session.
  await expect(page.getByRole('link', { name: 'Leads' })).toBeVisible();
  await page.getByRole('button', { name: 'Add lead' }).click();
  const drawer = page.getByRole('dialog', { name: 'Add lead' });

  // L1: the creating user owns the new lead by default and can still change it.
  const ownerSelect = field(drawer, 'Owner').locator('select');
  await expect(ownerSelect.locator(`option[value="${env.staff.username}"]`)).toBeAttached();
  await expect(ownerSelect).toHaveValue(env.staff.username);

  const customerBox = await pickSuggestion(drawer, 'Customer', customer.name, customer.name);
  await expect(customerBox).toHaveValue(customer.name);
  const vehicleBox = await pickSuggestion(drawer, 'Vehicle of interest', vehicle.vin, '2021 Honda Civic');
  await expect(vehicleBox).toHaveValue('2021 Honda Civic');

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
  await expect(page.getByText('Lead added.')).toBeVisible();

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
  const prospect = freshCustomer();

  await page.goto('/leads');
  await expect(page.getByRole('link', { name: 'Leads' })).toBeVisible();
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
  expect(lead.ownerUsername).toBe(env.staff.username);
  await expect(drawer).toBeHidden();

  const row = await findRow(page, prospect.name);
  await expect(row).toContainText('New');

  // The prospect now exists as a CRM customer of this dealership.
  const customers = await staffApi.get('/api/v1/customers', { q: prospect.email });
  await expectStatus(customers, 200);
  const items = ((await customers.json()) as { items: { id: number; email: string }[] }).items;
  expect(items.map((c) => c.id)).toContain(lead.customerId);
});

test('R4 / LEAD-01: a new prospect matching an existing customer asks to confirm before it is created', async ({
  staffPage: page, staffApi,
}) => {
  const existing = await staffApi.createCustomer({ homeAddress: `${uniqueSuffix()} Twin Street, Calgary, AB` });

  await page.goto('/leads');
  await page.getByRole('button', { name: 'Add lead' }).click();
  const drawer = page.getByRole('dialog', { name: 'Add lead' });
  await drawer.getByRole('radio', { name: 'New customer' }).check();
  // The same person phoning in again: name, email, phone and address all match.
  for (const [label, value] of [
    ['Name', existing.name], ['Email', existing.email], ['Phone', existing.phone],
    ['Home address', existing.homeAddress],
  ] as [string, string][]) {
    await field(drawer, label).locator('input').fill(value);
  }

  let posts = 0;
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/api/v1/leads')) posts++; });

  await drawer.getByRole('button', { name: 'Save' }).click();
  const confirm = dialog(page, 'Possible duplicate customer');
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText('A customer with this name, email, phone and address already exists.');

  // Cancel sends nothing and leaves the drawer filled in.
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toBeHidden();
  expect(posts, 'no lead is created while the confirm is open').toBe(0);
  await expect(field(drawer, 'Name').locator('input')).toHaveValue(existing.name);

  await drawer.getByRole('button', { name: 'Save' }).click();
  const created = page.waitForResponse((r) => r.url().endsWith('/api/v1/leads') && r.request().method() === 'POST');
  await dialog(page, 'Possible duplicate customer').getByRole('button', { name: 'Create anyway' }).click();
  const res = await created;
  expect(res.status()).toBe(201);
  const lead = (await res.json()) as Lead;
  // A second customer record is created, as the user confirmed; nothing about a customer is unique.
  expect(lead.customerId).not.toBe(existing.id);
  expect(lead.customerName).toBe(existing.name);
});

test('LEAD-01 LEAD-02 L3: a customer is required and only in-stock vehicles are suggested', async ({ staffPage: page, staffApi }) => {
  // Two vehicles sharing a unique VIN prefix: one in stock, one sold.
  // The shared prefix covers character 10, so both VINs carry the 2020 model-year code (D-8).
  const prefix = randomVin(2020).slice(0, 12);
  const inStock = await staffApi.createVehicle({ vin: prefix + randomVin().slice(0, 5) });
  const sold = await sell(staffApi, await staffApi.createVehicle({ vin: prefix + randomVin().slice(0, 5) }));

  await page.goto('/leads');
  await page.getByRole('button', { name: 'Add lead' }).click();
  const drawer = page.getByRole('dialog', { name: 'Add lead' });

  let posted = false;
  page.on('request', (r) => { if (r.url().endsWith('/api/v1/leads') && r.method() === 'POST') posted = true; });
  await drawer.getByRole('button', { name: 'Save' }).click();
  await expect(drawer.getByText('Choose a customer')).toBeVisible();
  expect(posted).toBe(false);

  // The shared prefix suggests the in-stock vehicle only; the sold one is never offered.
  const vehicleBox = drawer.getByRole('combobox', { name: 'Vehicle of interest', exact: true });
  await vehicleBox.fill(prefix);
  const options = drawer.getByRole('listbox', { name: 'Vehicle of interest suggestions' }).getByRole('option');
  await expect(options).toHaveCount(1, { timeout: 20_000 });
  await expect(options.first()).toContainText(inStock.vin);
  await vehicleBox.fill(sold.vin);
  await expect(drawer.getByRole('listbox', { name: 'Vehicle of interest suggestions' })
    .getByText('No matches')).toBeVisible({ timeout: 20_000 });
});

test('LEAD-03 CR-022: move a lead through the pipeline to Won, confirming the close, after which it cannot be changed', async ({ staffPage: page, staffApi }) => {
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

  // CR-022: cancelling the confirm leaves the lead open and sends nothing.
  let patches = 0;
  page.on('request', (r) => {
    if (r.url().includes(`/api/v1/leads/${created.id}`) && r.method() === 'PATCH') patches++;
  });
  await drawer.getByRole('button', { name: 'Save' }).click();
  const confirm = dialog(page, /Close this lead as Won/);
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toBeHidden();
  expect(patches).toBe(0);
  expect((await getLeadApi(staffApi, created.id)).stage).toBe('QUALIFIED');

  expect((await saveClosing(page, drawer, created.id)).status()).toBe(200);

  const after = await getLeadApi(staffApi, created.id);
  expect(after).toMatchObject({ stage: 'WON', ownerUsername: env.staff.username, nextFollowUpOn: '2030-05-01' });

  // A WON lead is final: every editable control is locked and Save is gone.
  await expect(drawer.getByText(CLOSED_NOTICE)).toBeVisible();
  await expect(stage).toBeDisabled();
  await expect(field(drawer, 'Owner').locator('select')).toBeDisabled();
  await expect(field(drawer, 'Next follow-up').locator('input')).toBeDisabled();
  await expect(drawer.getByLabel('Vehicle of interest', { exact: true })).toBeDisabled();
  await expect(drawer.getByRole('button', { name: 'Save' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  const row = await findRow(page, customer.name);
  await expect(row).toContainText('Won');
  await expect(row).toContainText(env.staff.username);
  // A closed lead needs no follow-up, so the column says so instead of the stored date.
  await expect(row).toContainText('Not needed');

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
  expect((await saveClosing(page, drawer, created.id)).status()).toBe(200);

  const after = await getLeadApi(staffApi, created.id);
  expect(after).toMatchObject({ stage: 'LOST', lostReason: reason });
  await expect(stage).toBeDisabled();
  await expect(reasonInput).toHaveValue(reason);
  await expect(reasonInput).toBeDisabled();
  await expect(drawer.getByRole('button', { name: 'Save' })).toHaveCount(0);
  await expect(drawer.getByText(CLOSED_NOTICE)).toBeVisible();

  await page.keyboard.press('Escape');
  const row = await findRow(page, customer.name);
  await expect(row).toContainText('Lost');
});

test('L4 / D7: a closed lead is reopened to a chosen open stage and becomes editable again', async ({
  staffPage: page, staffApi,
}) => {
  const customer = await staffApi.createCustomer();
  const created = await createLeadApi(staffApi, { customerId: customer.id });
  const lost = await patchLeadApi(staffApi, created, { stage: 'LOST', lostReason: 'Went quiet' });

  const drawer = await openLead(page, lost.id);
  await expect(drawer.getByText(CLOSED_NOTICE)).toBeVisible();
  const reopenAs = drawer.getByLabel('Reopen as', { exact: true });
  // Only open stages can be chosen, so the lead cannot be "reopened" as won or lost.
  await expect(reopenAs.locator('option')).toHaveText(['New', 'Contacted', 'Qualified']);
  await expect(reopenAs).toHaveValue('CONTACTED');
  await reopenAs.selectOption('QUALIFIED');

  const reopened = page.waitForResponse(
    (r) => r.url().endsWith(`/api/v1/leads/${lost.id}/reopen`) && r.request().method() === 'POST');
  await drawer.getByRole('button', { name: 'Reopen lead' }).click();
  expect((await reopened).status()).toBe(200);

  // The drawer is editable again: the lost reason is gone and Save is back.
  await expect(drawer.getByText(CLOSED_NOTICE)).toHaveCount(0);
  await expect(drawer.getByRole('button', { name: 'Reopen lead' })).toHaveCount(0);
  const stage = field(drawer, 'Stage').locator('select');
  await expect(stage).toHaveValue('QUALIFIED');
  await expect(stage).toBeEnabled();
  await expect(field(drawer, 'Lost reason')).toHaveCount(0);
  const reloaded = await getLeadApi(staffApi, lost.id);
  // Null fields are omitted from the JSON, so an absent lost reason reads as undefined.
  expect(reloaded.stage).toBe('QUALIFIED');
  expect(reloaded.lostReason ?? null).toBeNull();

  await field(drawer, 'Next follow-up').locator('input').fill('2030-07-09');
  const saved = waitForPatch(page, lost.id);
  await drawer.getByRole('button', { name: 'Save' }).click();
  expect((await saved).status()).toBe(200);

  await page.keyboard.press('Escape');
  const row = await findRow(page, customer.name);
  await expect(row).toContainText('Qualified');
  await expect(row).toContainText('2030-07-09');
});

test('L4 / D7 / CR-041: a won lead whose vehicle was sold to that customer cannot be reopened', async ({
  staffPage: page, staffApi, allowBrowserErrors,
}) => {
  // The browser logs the expected 409 as a console error.
  allowBrowserErrors(/409|Conflict/i);
  const buyer = await staffApi.createCustomer();
  const vehicle = await staffApi.createVehicle();
  const lead = await createLeadApi(staffApi, { customerId: buyer.id, vehicleId: vehicle.id });
  // L6: the sale closes the buyer's own lead as won.
  await sell(staffApi, vehicle, buyer.id);
  expect((await getLeadApi(staffApi, lead.id)).stage).toBe('WON');

  const drawer = await openLead(page, lead.id);
  const refused = page.waitForResponse(
    (r) => r.url().endsWith(`/api/v1/leads/${lead.id}/reopen`) && r.request().method() === 'POST');
  await drawer.getByRole('button', { name: 'Reopen lead' }).click();
  expect((await refused).status()).toBe(409);

  await expect(drawer.locator('.danger-text')).toContainText('sold to this customer');
  await expect(drawer.getByText(CLOSED_NOTICE)).toBeVisible();
  expect((await getLeadApi(staffApi, lead.id)).stage).toBe('WON');
});

test('L5 / CR-022: a second open lead for the same customer and vehicle is refused, and the unsaved drawer asks before it closes', async ({
  staffPage: page, staffApi, allowBrowserErrors,
}) => {
  allowBrowserErrors(/409|Conflict/i);
  const customer = await staffApi.createCustomer();
  const vehicle = await staffApi.createVehicle({ make: 'Toyota', model: 'Corolla', modelYear: 2022 });
  await createLeadApi(staffApi, { customerId: customer.id, vehicleId: vehicle.id });

  await page.goto('/leads');
  await page.getByRole('button', { name: 'Add lead' }).click();
  const drawer = page.getByRole('dialog', { name: 'Add lead' });
  await pickSuggestion(drawer, 'Customer', customer.name, customer.name);
  await pickSuggestion(drawer, 'Vehicle of interest', vehicle.vin, '2022 Toyota Corolla');

  const refused = page.waitForResponse((r) => r.url().endsWith('/api/v1/leads') && r.request().method() === 'POST');
  await drawer.getByRole('button', { name: 'Save' }).click();
  const res = await refused;
  expect(res.status()).toBe(409);
  expect((await res.json()).code).toBe('LEAD_DUPLICATE');
  await expect(drawer.getByText('This customer already has an open lead for this vehicle. Open that lead instead of adding another.')).toBeVisible();
  await expect(drawer).toBeVisible();

  // CR-022: the drawer still holds unsaved work, so closing it asks first.
  await drawer.getByRole('button', { name: 'Close' }).click();
  const discard = dialog(page, 'Discard unsaved changes?');
  await expect(discard).toBeVisible();
  await discard.getByRole('button', { name: 'Cancel' }).click();
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'Close' }).click();
  await dialog(page, 'Discard unsaved changes?').getByRole('button', { name: 'Discard' }).click();
  await expect(drawer).toBeHidden();
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
  await patchLeadApi(staffApi, await getLeadApi(staffApi, created.id), { stage: 'WON' });
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
  await patchLeadApi(staffApi, closed, { stage: 'LOST', lostReason: 'No budget' });

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
  await page.getByLabel('Stage', { exact: true }).selectOption('LOST');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(closedRow).toBeVisible();
  await expect(openRow).toHaveCount(0);
});

test('L2: the customer filter applies while typing and the vehicle filter searches by name and VIN', async ({
  staffPage: page, staffApi,
}) => {
  const tag = `E2E Live ${uniqueSuffix()}`;
  const wanted = await staffApi.createCustomer({ name: `${tag} Wanted` });
  const other = await staffApi.createCustomer({ name: `${tag} Other` });
  const model = `Mdl${tag.slice(-8)}`.slice(0, 18);
  const vehicle = await staffApi.createVehicle({ make: 'Subaru', model, modelYear: 2023 });
  await createLeadApi(staffApi, { customerId: wanted.id, vehicleId: vehicle.id });
  await createLeadApi(staffApi, { customerId: other.id });

  await page.goto('/leads');
  const wantedRow = page.getByRole('row').filter({ hasText: wanted.name });
  const otherRow = page.getByRole('row').filter({ hasText: other.name });

  // Typing alone narrows the list after the debounce; no Search click.
  await page.getByPlaceholder('Customer name').fill(tag);
  await expect(wantedRow).toHaveCount(1);
  await expect(otherRow).toHaveCount(1);
  await page.getByPlaceholder('Customer name').fill(wanted.name);
  await expect(wantedRow).toHaveCount(1);
  await expect(otherRow).toHaveCount(0);

  // The vehicle box filters on the name as the column shows it, and on the VIN.
  await page.getByPlaceholder('Customer name').fill(tag);
  await expect(otherRow).toHaveCount(1);
  for (const term of [model, '2023 Subaru', vehicle.vin]) {
    await page.getByPlaceholder('Vehicle', { exact: true }).fill(term);
    await expect(wantedRow).toHaveCount(1);
    await expect(otherRow).toHaveCount(0);
  }

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByPlaceholder('Customer name')).toHaveValue('');
  await expect(page.getByPlaceholder('Vehicle', { exact: true })).toHaveValue('');
});

test('CR-012: the Leads columns sort on the server, across every page', async ({ staffPage: page, staffApi }) => {
  const tag = `E2E UI Sort ${uniqueSuffix()}`;
  const names = ['Charlie', 'Alpha', 'Bravo'];
  for (const name of names) {
    const customer = await staffApi.createCustomer({ name: `${tag} ${name}` });
    await createLeadApi(staffApi, { customerId: customer.id });
  }

  await page.goto('/leads');
  await page.getByPlaceholder('Customer name').fill(tag);
  await page.getByRole('button', { name: 'Search' }).click();
  const firstCells = page.locator('table.table tbody tr td:first-child');
  // Created Charlie, Alpha, Bravo, so the default order is newest first.
  await expect(firstCells).toHaveText([`${tag} Bravo`, `${tag} Alpha`, `${tag} Charlie`]);

  const header = page.getByRole('columnheader', { name: 'Customer' });
  const sorted = page.waitForResponse((r) => r.url().includes('sort=customerName%2Casc') || r.url().includes('sort=customerName,asc'));
  await header.getByRole('button', { name: 'Customer' }).click();
  await sorted;
  await expect(header).toHaveAttribute('aria-sort', 'ascending');
  await expect(firstCells).toHaveText([`${tag} Alpha`, `${tag} Bravo`, `${tag} Charlie`]);

  // Clicking the same header flips the direction.
  await header.getByRole('button', { name: 'Customer' }).click();
  await expect(header).toHaveAttribute('aria-sort', 'descending');
  await expect(firstCells).toHaveText([`${tag} Charlie`, `${tag} Bravo`, `${tag} Alpha`]);
});
