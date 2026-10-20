import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { customerBody, expectStatus, randomDigits, uniqueSuffix, type Api, type Customer, type Vehicle } from '../../support/api';

// UI-30 / UI-31 / CRM-01..03 / AT-26 / AT-29: the CRM customer list and the create/edit drawer.

const SEARCH = 'Name / Email / Phone';

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
  test('UI-30 / CRM-03: list shows name, email, phone and vehicles purchased count', async ({ staffPage: page, staffApi }) => {
    const customer = await staffApi.createCustomer();
    const vehicle = await staffApi.createVehicle({ make: 'Honda', model: 'Civic', modelYear: 2019 });
    await linkVehicle(staffApi, customer, vehicle);

    await page.goto('/crm');
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    for (const header of ['Email', 'Phone', 'Linked vehicles', 'Vehicles purchased']) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }

    await search(page, customer.email);
    const row = rowOf(page, customer.email);
    await expect(row).toHaveCount(1);
    const cells = row.getByRole('cell');
    await expect(cells.nth(0)).toHaveText(customer.name);
    await expect(cells.nth(1)).toHaveText(customer.email);
    await expect(cells.nth(2)).toHaveText(customer.phone);
    await expect(cells.nth(3)).toHaveText('2019 Honda Civic');
    await expect(cells.nth(4)).toHaveText('1');
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
    const c = customerBody();

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
    await expect(row.getByRole('cell').nth(3)).toHaveText('2021 Mazda CX-5');
    await expect(row.getByRole('cell').nth(4)).toHaveText('1');

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
    const c = customerBody();

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
    await expect(row.getByRole('cell').nth(3)).toHaveText('—');
    await expect(row.getByRole('cell').nth(4)).toHaveText('0');

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

  test('CRM-13: duplicate email is saved and the drawer shows the warning', async ({ staffPage: page, staffApi }) => {
    const existing = await staffApi.createCustomer();
    const c = customerBody({ email: existing.email });

    await page.goto('/crm');
    await page.getByRole('button', { name: 'Add customer' }).click();
    const drawer = drawerOf(page);
    await fillCustomer(drawer, c);

    const created = waitForCustomerWrite(page, 'POST');
    await drawer.getByRole('button', { name: 'Save' }).click();
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

  test('CRM-01: duplicate phone shows the server field error', async ({ staffPage: page, staffApi, allowBrowserErrors }) => {
    allowBrowserErrors(/409|Conflict/);
    const existing = await staffApi.createCustomer({ phone: `+1587${randomDigits(7)}` });
    const c = customerBody({ phone: existing.phone });

    await page.goto('/crm');
    await page.getByRole('button', { name: 'Add customer' }).click();
    const drawer = drawerOf(page);
    await fillCustomer(drawer, c);

    const created = waitForCustomerWrite(page, 'POST');
    await drawer.getByRole('button', { name: 'Save' }).click();
    const res = await created;
    expect(res.status()).toBe(409);
    expect((await res.json()).code).toBe('PHONE_TAKEN');

    await expect(drawer).toBeVisible();
    await expect(fieldItem(drawer, 'Phone').locator('.form-error')).toBeVisible();
    await expect(fieldItem(drawer, 'Email').locator('.form-error')).toHaveCount(0);
    await expect(drawer.locator('.danger-text')).toBeVisible();
  });

  test('CRM-13: editing to another customer\'s email saves and shows the warning', async ({ staffPage: page, staffApi }) => {
    const first = await staffApi.createCustomer();
    const second = await staffApi.createCustomer();

    await page.goto(`/crm?customerId=${second.id}`);
    const drawer = drawerOf(page);
    await expect(drawer.getByLabel('Email', { exact: true })).toHaveValue(second.email);
    await drawer.getByLabel('Email', { exact: true }).fill(first.email);

    const saved = waitForCustomerWrite(page, 'PATCH');
    await drawer.getByRole('button', { name: 'Save' }).click();
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
