import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { customerBody, expectStatus, uniqueSuffix, type Api, type Customer, type Vehicle } from '../../support/api';

// UI-30 / UI-31 / CRM-01..03 / AT-26 / AT-29: the CRM customer list and the create/edit drawer.
// The 2026-11-03 change request adds R1 (a Leads column in place of Vehicles purchased),
// R2 (New lead from the customer drawer), R3 (customer notes) and R4 (nothing about a customer
// is unique: a match on name, email, phone or address only asks for confirmation).

const SEARCH = 'Name / Email / Phone';

/**
 * Customer data with a home address nobody else uses. The default address is shared by every
 * seeded customer, and the drawer's duplicate check (R4) would stop on it.
 */
function freshCustomer(overrides: Record<string, unknown> = {}) {
  return customerBody({ homeAddress: `${uniqueSuffix()} Birch Lane, Calgary, AB`, ...overrides });
}

// The shared dealer holds hundreds of vehicles and other workers create data concurrently,
// so drawer loads (the purchase picker pages through every vehicle) can be slow.
test.describe.configure({ timeout: 120_000 });

// Known defect (reported, not covered here): the purchase picker collects vehicle pages by
// offset without de-duplicating, so a vehicle created by another user while the pages load
// shows up twice and React logs a duplicate-key warning. It is unrelated to these flows.
test.beforeEach(({ allowBrowserErrors }) => {
  allowBrowserErrors(/Encountered two children with the same key/);
});

function drawerOf(page: Page) {
  return page.getByRole('dialog', { name: 'Customer' });
}

const FIELD_IDS: Record<string, string> = {
  Name: 'customer-name', Email: 'customer-email', Phone: 'customer-phone', 'Home address': 'customer-homeAddress',
};

function fieldItem(drawer: Locator, label: string) {
  return drawer.locator(`.form-item:has(#${FIELD_IDS[label]})`);
}

function rowOf(page: Page, text: string) {
  return page.locator('table.table tbody tr', { hasText: text });
}

async function linkVehicle(api: Api, customer: Customer, vehicle: Vehicle) {
  const res = await api.put(`/api/v1/customers/${customer.id}/vehicles/${vehicle.id}`);
  expect([200, 204], await res.text()).toContain(res.status());
}

async function search(page: Page, q: string) {
  await page.getByPlaceholder(SEARCH).fill(q);
  await page.getByRole('button', { name: 'Search' }).click();
}

async function fillCustomer(drawer: Locator, c: { name: string; email: string; phone: string; homeAddress: string }) {
  await drawer.getByLabel('Name', { exact: true }).fill(c.name);
  await drawer.getByLabel('Email', { exact: true }).fill(c.email);
  await drawer.getByLabel('Phone', { exact: true }).fill(c.phone);
  await drawer.getByLabel('Home address', { exact: true }).fill(c.homeAddress);
}

function waitForCustomerWrite(page: Page, method: string) {
  return page.waitForResponse(
    (r) => /\/api\/v1\/customers(\/\d+)?$/.test(new URL(r.url()).pathname) && r.request().method() === method,
  );
}

test.describe('CRM list', () => {
  test('UI-30 / CRM-03 / R1: list shows name, email, phone, home address, linked vehicles and the lead count', async ({ staffPage: page, staffApi }) => {
    const customer = await staffApi.createCustomer();
    const vehicle = await staffApi.createVehicle({ make: 'Honda', model: 'Civic', modelYear: 2019 });
    await linkVehicle(staffApi, customer, vehicle);
    await expectStatus(await staffApi.post('/api/v1/leads', { customerId: customer.id }), 201);

    await page.goto('/crm');
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    for (const header of ['Email', 'Phone', 'Home address', 'Linked vehicles', 'Leads']) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
    // R1: the Leads count replaced the Vehicles purchased column.
    await expect(page.getByRole('columnheader', { name: 'Vehicles purchased' })).toHaveCount(0);

    await search(page, customer.email);
    const row = rowOf(page, customer.email);
    await expect(row).toHaveCount(1);
    const cells = row.getByRole('cell');
    await expect(cells.nth(0)).toHaveText(customer.name);
    await expect(cells.nth(1)).toHaveText(customer.email);
    await expect(cells.nth(2)).toHaveText(customer.phone);
    await expect(cells.nth(3)).toHaveText(customer.homeAddress);
    await expect(cells.nth(4)).toHaveText('2019 Honda Civic');
    await expect(cells.nth(5)).toHaveText('1');
  });

  test('UI-30 / CRM-03: search matches name, email and phone', async ({ staffPage: page, staffApi }) => {
    const token = uniqueSuffix();
    const target = await staffApi.createCustomer({ name: `E2E Search ${token}` });
    const other = await staffApi.createCustomer();

    await page.goto('/crm');
    for (const q of [target.name, target.email, target.phone]) {
      await search(page, q);
      await expect(rowOf(page, target.email)).toHaveCount(1);
      await expect(rowOf(page, other.email)).toHaveCount(0);
      await expect(page.getByText(/^1 record$/)).toBeVisible();
    }

    // Typing alone also applies the search after the debounce.
    await page.getByPlaceholder(SEARCH).fill(other.email);
    await expect(rowOf(page, other.email)).toHaveCount(1);
    await expect(rowOf(page, target.email)).toHaveCount(0);

    await search(page, `no-such-customer-${uniqueSuffix()}`);
    await expect(page.getByText('No customers match.')).toBeVisible();
  });

  test('UI-30: Linked / Not linked filter', async ({ staffPage: page, staffApi }) => {
    const token = uniqueSuffix();
    const linked = await staffApi.createCustomer({ name: `E2E Filter ${token} linked` });
    const unlinked = await staffApi.createCustomer({ name: `E2E Filter ${token} unlinked` });
    await linkVehicle(staffApi, linked, await staffApi.createVehicle());

    await page.goto('/crm');
    await search(page, `E2E Filter ${token}`);
    await expect(rowOf(page, linked.email)).toHaveCount(1);
    await expect(rowOf(page, unlinked.email)).toHaveCount(1);

    const select = page.locator('.filters select');
    await select.selectOption({ label: 'Linked' });
    await expect(rowOf(page, unlinked.email)).toHaveCount(0);
    await expect(rowOf(page, linked.email)).toHaveCount(1);

    await select.selectOption({ label: 'Not linked' });
    await expect(rowOf(page, linked.email)).toHaveCount(0);
    await expect(rowOf(page, unlinked.email)).toHaveCount(1);

    await select.selectOption({ label: 'Any' });
    await expect(rowOf(page, linked.email)).toHaveCount(1);
    await expect(rowOf(page, unlinked.email)).toHaveCount(1);

    // Reset clears both the search text and the filter.
    await select.selectOption({ label: 'Linked' });
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByPlaceholder(SEARCH)).toHaveValue('');
    await expect(select).toHaveValue('');
  });

  test('CRM-03: list pages at 10 customers per page', async ({ staffPage: page, staffApi }) => {
    const token = uniqueSuffix();
    const created: Customer[] = [];
    for (let i = 0; i < 11; i++) {
      created.push(await staffApi.createCustomer({ name: `E2E Page ${token} ${String(i).padStart(2, '0')}` }));
    }

    await page.goto('/crm');
    await search(page, `E2E Page ${token}`);
    const rows = page.locator('table.table tbody tr');
    await expect(page.getByText(/^11 records$/)).toBeVisible();
    await expect(rows).toHaveCount(10);

    const pager = page.locator('.pagination');
    await pager.getByRole('button', { name: '2', exact: true }).click();
    await expect(rows).toHaveCount(1);
    await expect(pager.getByRole('button', { name: '2', exact: true })).toHaveClass(/active/);
    await expect(pager.getByRole('button', { name: '›' })).toBeDisabled();

    await pager.getByRole('button', { name: '‹' }).click();
    await expect(rows).toHaveCount(10);
    await expect(pager.getByRole('button', { name: '‹' })).toBeDisabled();

    // Every created customer appears exactly once across the two pages.
    const seen = new Set<string>();
    for (const text of await rows.locator('td:nth-child(2)').allInnerTexts()) seen.add(text.trim());
    await pager.getByRole('button', { name: '›' }).click();
    await expect(rows).toHaveCount(1);
    for (const text of await rows.locator('td:nth-child(2)').allInnerTexts()) seen.add(text.trim());
    expect([...seen].sort()).toEqual(created.map((c) => c.email).sort());
  });
});

test.describe('CRM create and edit', () => {
  test('CRM-01 / AT-26: each required field left blank shows its own error', async ({ staffPage: page }) => {
    await page.goto('/crm');
    await page.getByRole('button', { name: 'Add customer' }).click();
    const drawer = drawerOf(page);
    const valid = customerBody();
    const labels: [keyof typeof valid, string][] = [
      ['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['homeAddress', 'Home address'],
    ];

    let posts = 0;
    page.on('request', (r) => {
      if (r.method() === 'POST' && new URL(r.url()).pathname.endsWith('/api/v1/customers')) posts++;
    });

    for (const [blankKey, blankLabel] of labels) {
      // Whitespace-only input counts as blank.
      await fillCustomer(drawer, { ...valid, [blankKey]: '   ' });
      await drawer.getByRole('button', { name: 'Save' }).click();
      await expect(fieldItem(drawer, blankLabel).locator('.form-error')).toHaveText('Check required fields');
      for (const [, otherLabel] of labels.filter(([k]) => k !== blankKey)) {
        await expect(fieldItem(drawer, otherLabel).locator('.form-error')).toHaveCount(0);
      }
    }

    // All four blank at once: four separate errors.
    await fillCustomer(drawer, { name: '', email: '', phone: '', homeAddress: '' });
    await drawer.getByRole('button', { name: 'Save' }).click();
    await expect(drawer.locator('.form-error')).toHaveCount(4);
    expect(posts, 'no create request for an invalid form').toBe(0);
    await expect(drawer).toBeVisible();
  });

  test('AT-29 / CRM-01: create with a purchased car selected links that car', async ({ staffPage: page, staffApi }) => {
    const vehicle = await staffApi.createVehicle({ make: 'Mazda', model: 'CX-5', modelYear: 2021 });
    const c = freshCustomer();

    await page.goto('/crm');
    await page.getByRole('button', { name: 'Add customer' }).click();
    const drawer = drawerOf(page);
    await fillCustomer(drawer, c);

    const picker = drawer.getByLabel('Car(s) purchased');
    const label = `2021 Mazda CX-5 · ${vehicle.vin} · In stock`;
    await expect(picker.locator('option', { hasText: vehicle.vin })).toHaveCount(1, { timeout: 60_000 });
    await picker.selectOption({ label });

    const created = waitForCustomerWrite(page, 'POST');
    const linked = page.waitForResponse(
      (r) => r.url().includes(`/vehicles/${vehicle.id}`) && r.request().method() === 'PUT',
    );
    await drawer.getByRole('button', { name: 'Save' }).click();
    expect((await created).status()).toBe(201);
    expect((await linked).ok()).toBeTruthy();
    await expect(drawer).toBeHidden();

    await search(page, c.email);
    const row = rowOf(page, c.email);
    await expect(row.getByRole('cell').nth(4)).toHaveText('2021 Mazda CX-5');
    // R1: the last column counts leads, and a brand-new customer has none.
    await expect(row.getByRole('cell').nth(5)).toHaveText('0');

    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(drawer.getByRole('link', { name: '2021 Mazda CX-5' })).toBeVisible();
    await expect(drawer.getByText(`· ${vehicle.vin} · In stock`, { exact: true })).toBeVisible();
    // A linked vehicle is no longer offered for linking.
    const options = drawer.getByRole('listbox', { name: 'Unlinked vehicles' });
    await expect(options.getByRole('option').first()).toBeVisible({ timeout: 60_000 });
    await expect(options.getByRole('option', { name: new RegExp(vehicle.vin) })).toHaveCount(0);

    const after = await staffApi.getVehicle(vehicle.id);
    expect(after.linkedCustomer?.name).toBe(c.name);
  });

  test('AT-29 / CRM-01: create without a car saves an unlinked customer', async ({ staffPage: page, staffApi }) => {
    const c = freshCustomer();

    await page.goto('/crm');
    await page.getByRole('button', { name: 'Add customer' }).click();
    const drawer = drawerOf(page);
    await fillCustomer(drawer, c);
    await expect(drawer.getByLabel('Car(s) purchased')).toHaveValue('');

    const created = waitForCustomerWrite(page, 'POST');
    await drawer.getByRole('button', { name: 'Save' }).click();
    const res = await created;
    expect(res.status()).toBe(201);
    const id = ((await res.json()) as Customer).id;
    await expect(drawer).toBeHidden();

    await search(page, c.email);
    const row = rowOf(page, c.email);
    await expect(row.getByRole('cell').nth(4)).toHaveText('None');
    await expect(row.getByRole('cell').nth(5)).toHaveText('0');

    const detail = await staffApi.get(`/api/v1/customers/${id}`);
    await expectStatus(detail, 200);
    expect(((await detail.json()) as Customer).linkedVehicles).toEqual([]);
  });

  test('CRM-02 / UI-31 / AT-26: edited fields persist after reopening', async ({ staffPage: page, staffApi }) => {
    const customer = await staffApi.createCustomer();
    const changed = customerBody({ homeAddress: `99 Elm Ave ${uniqueSuffix()}, Edmonton, AB` });

    await page.goto(`/crm?customerId=${customer.id}`);
    const drawer = drawerOf(page);
    await expect(drawer.getByLabel('Name', { exact: true })).toHaveValue(customer.name);
    await expect(drawer.getByLabel('Email', { exact: true })).toHaveValue(customer.email);
    await expect(drawer.getByLabel('Phone', { exact: true })).toHaveValue(customer.phone);
    await expect(drawer.getByLabel('Home address', { exact: true })).toHaveValue(customer.homeAddress);
    // The purchase picker is only offered on create.
    await expect(drawer.getByLabel('Car(s) purchased')).toHaveCount(0);

    await fillCustomer(drawer, changed);
    const saved = waitForCustomerWrite(page, 'PATCH');
    await drawer.getByRole('button', { name: 'Save' }).click();
    expect((await saved).status()).toBe(200);
    // The save reloads the drawer from the server; wait for it before closing.
    await expect(drawer.getByText('Customer saved.')).toBeVisible();

    // Close, load the list fresh (without the deep link), and reopen from the list.
    await drawer.getByRole('button', { name: 'Close' }).click();
    await expect(drawer).toBeHidden();
    await page.goto('/crm');
    await search(page, changed.email);
    await rowOf(page, changed.email).getByRole('button', { name: 'Edit' }).click();

    await expect(drawer.getByLabel('Name', { exact: true })).toHaveValue(changed.name);
    await expect(drawer.getByLabel('Email', { exact: true })).toHaveValue(changed.email);
    await expect(drawer.getByLabel('Phone', { exact: true })).toHaveValue(changed.phone);
    await expect(drawer.getByLabel('Home address', { exact: true })).toHaveValue(changed.homeAddress);

    // The old email no longer finds anyone.
    await drawer.getByRole('button', { name: 'Close' }).click();
    await search(page, customer.email);
    await expect(page.getByText('No customers match.')).toBeVisible();
  });

  test('CRM-13 / R4: a duplicate email is confirmed, then saved with the warning', async ({ staffPage: page, staffApi }) => {
    const existing = await staffApi.createCustomer();
    const c = freshCustomer({ email: existing.email });

    await page.goto('/crm');
    await page.getByRole('button', { name: 'Add customer' }).click();
    const drawer = drawerOf(page);
    await fillCustomer(drawer, c);

    // R4: the matching email is only a warning the user confirms.
    const created = waitForCustomerWrite(page, 'POST');
    await drawer.getByRole('button', { name: 'Save' }).click();
    const confirm = page.locator('.dialog', { hasText: 'Possible duplicate customer' });
    await expect(confirm).toContainText('A customer with this email already exists. Create anyway?');
    await confirm.getByRole('button', { name: 'Create anyway' }).click();
    const res = await created;
    expect(res.status()).toBe(201);
    const saved = await res.json();
    expect(saved.email).toBe(existing.email);
    expect(saved.emailWarning).toMatch(/already uses this email/i);

    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(saved.emailWarning)).toBeVisible();
    await expect(fieldItem(drawer, 'Email').locator('.form-error')).toHaveCount(0);
    await expect(fieldItem(drawer, 'Phone').locator('.form-error')).toHaveCount(0);
    const reread = await staffApi.get(`/api/v1/customers/${saved.id}`);
    expect(((await reread.json()) as Customer).email).toBe(existing.email);
  });

  test('R4: a shared phone is confirmed and then saved; cancelling sends nothing', async ({ staffPage: page, staffApi }) => {
    // A household shares a phone, so the phone is no longer unique (decision D1).
    const existing = await staffApi.createCustomer();
    const c = freshCustomer({ phone: existing.phone });

    await page.goto('/crm');
    await page.getByRole('button', { name: 'Add customer' }).click();
    const drawer = drawerOf(page);
    await fillCustomer(drawer, c);

    let posts = 0;
    page.on('request', (r) => {
      if (r.method() === 'POST' && new URL(r.url()).pathname.endsWith('/api/v1/customers')) posts++;
    });

    const confirm = page.locator('.dialog', { hasText: 'Possible duplicate customer' });
    await drawer.getByRole('button', { name: 'Save' }).click();
    await expect(confirm).toContainText('A customer with this phone already exists. Create anyway?');
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).toBeHidden();
    expect(posts, 'nothing is created while the confirm is open').toBe(0);
    await expect(fieldItem(drawer, 'Phone').locator('.form-error')).toHaveCount(0);

    const created = waitForCustomerWrite(page, 'POST');
    await drawer.getByRole('button', { name: 'Save' }).click();
    await confirm.getByRole('button', { name: 'Create anyway' }).click();
    const res = await created;
    expect(res.status()).toBe(201);
    expect((await res.json()).phone).toBe(existing.phone);
    await expect(drawer).toBeHidden();

    // Both customers keep the shared phone, so a search on it finds the two of them.
    await search(page, existing.phone);
    await expect(page.locator('table.table tbody tr')).toHaveCount(2);
  });

  test('R3: customer notes are saved and reloaded with the customer', async ({ staffPage: page, staffApi }) => {
    // Its own address, so saving from the drawer does not stop on the duplicate confirm (R4).
    const customer = await staffApi.createCustomer(freshCustomer());
    const note = `Prefers evening calls ${uniqueSuffix()}`;

    await page.goto(`/crm?customerId=${customer.id}`);
    const drawer = drawerOf(page);
    const notes = drawer.getByLabel('Notes', { exact: true });
    await expect(notes).toHaveValue('');
    await notes.fill(note);

    const saved = waitForCustomerWrite(page, 'PATCH');
    await drawer.getByRole('button', { name: 'Save' }).click();
    expect((await saved).status()).toBe(200);
    await expect(drawer.getByText('Customer saved.')).toBeVisible();

    // Reopen from the list: the note came back from the server.
    await drawer.getByRole('button', { name: 'Close' }).click();
    await page.goto('/crm');
    await search(page, customer.email);
    await rowOf(page, customer.email).getByRole('button', { name: 'Edit' }).click();
    await expect(drawer.getByLabel('Notes', { exact: true })).toHaveValue(note);
    expect((await (await staffApi.get(`/api/v1/customers/${customer.id}`)).json()).notes).toBe(note);
  });

  test('CR-022: the customer drawer asks before it discards unsaved changes', async ({ staffPage: page, staffApi }) => {
    const customer = await staffApi.createCustomer(freshCustomer());

    await page.goto(`/crm?customerId=${customer.id}`);
    const drawer = drawerOf(page);
    await expect(drawer.getByLabel('Name', { exact: true })).toHaveValue(customer.name);

    let writes = 0;
    page.on('request', (r) => { if (r.method() === 'PATCH' && r.url().includes('/api/v1/customers/')) writes++; });

    // An untouched drawer closes straight away.
    await drawer.getByRole('button', { name: 'Close' }).click();
    await expect(drawer).toBeHidden();

    await page.goto(`/crm?customerId=${customer.id}`);
    await drawer.getByLabel('Notes', { exact: true }).fill(`Draft ${uniqueSuffix()}`);
    const discard = page.locator('.dialog', { hasText: 'Discard unsaved changes?' });

    // Cancelling keeps the drawer and the typed text.
    await drawer.getByRole('button', { name: 'Close' }).click();
    await expect(discard).toBeVisible();
    await discard.getByRole('button', { name: 'Cancel' }).click();
    await expect(discard).toBeHidden();
    await expect(drawer).toBeVisible();

    await drawer.getByRole('button', { name: 'Close' }).click();
    await discard.getByRole('button', { name: 'Discard' }).click();
    await expect(drawer).toBeHidden();
    // Nothing was saved: the discarded note never reached the server.
    expect(writes, 'a discard saves nothing').toBe(0);
    expect((await (await staffApi.get(`/api/v1/customers/${customer.id}`)).json()).notes ?? null).toBeNull();
  });

  test('R2: New lead in the customer drawer opens Add lead for that customer', async ({ staffPage: page, staffApi }) => {
    const customer = await staffApi.createCustomer();

    await page.goto(`/crm?customerId=${customer.id}`);
    const drawer = drawerOf(page);
    await expect(drawer.getByText('No leads for this customer.')).toBeVisible();
    await drawer.getByRole('link', { name: 'New lead' }).click();

    await expect(page).toHaveURL(new RegExp(`/leads\\?newLeadFor=${customer.id}$`));
    const addLead = page.getByRole('dialog', { name: 'Add lead' });
    await expect(addLead).toBeVisible();
    // The customer is preselected, so the lead only needs saving.
    await expect(addLead.getByRole('combobox', { name: 'Customer', exact: true })).toHaveValue(customer.name);

    const created = page.waitForResponse((r) => r.url().endsWith('/api/v1/leads') && r.request().method() === 'POST');
    await addLead.getByRole('button', { name: 'Save' }).click();
    const res = await created;
    expect(res.status()).toBe(201);
    expect((await res.json()).customerId).toBe(customer.id);

    // The lead now shows on the customer and the list counts it.
    await page.goto(`/crm?customerId=${customer.id}`);
    await expect(drawer.getByRole('link', { name: /^New · No vehicle$/ })).toBeVisible();
    await drawer.getByRole('button', { name: 'Close' }).click();
    await search(page, customer.email);
    await expect(rowOf(page, customer.email).getByRole('cell').nth(5)).toHaveText('1');
  });

  test('CRM-13 / R4: editing to another customer\'s email is confirmed, then saved with the warning', async ({ staffPage: page, staffApi }) => {
    // Addresses of their own, so only the email matches and the confirm names just that field.
    const first = await staffApi.createCustomer(freshCustomer());
    const second = await staffApi.createCustomer(freshCustomer());

    await page.goto(`/crm?customerId=${second.id}`);
    const drawer = drawerOf(page);
    await expect(drawer.getByLabel('Email', { exact: true })).toHaveValue(second.email);
    await drawer.getByLabel('Email', { exact: true }).fill(first.email);

    const saved = waitForCustomerWrite(page, 'PATCH');
    await drawer.getByRole('button', { name: 'Save' }).click();
    const confirm = page.locator('.dialog', { hasText: 'Possible duplicate customer' });
    await expect(confirm).toContainText('A customer with this email already exists. Save anyway?');
    await confirm.getByRole('button', { name: 'Save anyway' }).click();
    const res = await saved;
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.email).toBe(first.email);
    expect(body.emailWarning).toMatch(/already uses this email/i);
    await expect(drawer.getByText(body.emailWarning)).toBeVisible();
    await expect(fieldItem(drawer, 'Email').locator('.form-error')).toHaveCount(0);

    const reread = await staffApi.get(`/api/v1/customers/${second.id}`);
    expect(((await reread.json()) as Customer).email).toBe(first.email);
  });
});
