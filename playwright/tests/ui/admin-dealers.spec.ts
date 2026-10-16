import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { expectStatus, randomDigits, uniqueSuffix, type Api } from '../../support/api';
import { env } from '../../support/env';

// Seeded dealers ("E2E Motors", "E2E Rival Autos") are only read here, never edited.

type Dealer = {
  id: number; legalName: string; contactPhone: string; contactEmail: string; contactAddress: string;
  staffCount: number | null; version: number; active: boolean;
};

function dealerBody() {
  const id = uniqueSuffix();
  return {
    legalName: `E2E Dealer ${id}`,
    contactPhone: `403-555-${randomDigits(4)}`,
    contactEmail: `e2e.dealer.${id}@example.com`,
    contactAddress: `${randomDigits(3)} Test Avenue, Calgary, AB`,
  };
}

async function createDealer(api: Api) {
  const res = await api.post('/api/v1/admin/dealers', dealerBody());
  await expectStatus(res, 201);
  return (await res.json()) as Dealer;
}

async function findDealer(api: Api, legalName: string) {
  const res = await api.get('/api/v1/admin/dealers', { q: legalName, page: 0, size: 10 });
  await expectStatus(res, 200);
  const body = (await res.json()) as { items: Dealer[] };
  return body.items.find((d) => d.legalName === legalName);
}

/** Types the name into the dealership search and returns the matching table row. */
async function searchDealer(page: Page, legalName: string): Promise<Locator> {
  await page.getByPlaceholder('Dealership name').fill(legalName);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  return page.getByRole('row').filter({ has: page.getByRole('cell', { name: legalName, exact: true }) });
}

const COLUMNS = ['Name', 'Contact', 'Staff count'] as const;

/** Cell of a dealer row by column header; the header order is asserted in the UI-10 test. */
async function cellOf(_page: Page, row: Locator, column: (typeof COLUMNS)[number]) {
  return row.getByRole('cell').nth(COLUMNS.indexOf(column));
}

function formField(drawer: Locator, label: string) {
  return drawer
    .locator('.form-item', { has: drawer.page().getByText(label, { exact: true }) })
    .locator('input');
}

test.describe('Admin dealerships', () => {
  test('UI-10: dealer list shows name, contact info and staff count', async ({ adminPage: page, adminApi }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
    const headers = page.locator('table.table').first().locator('thead th');
    await expect(headers).toHaveText([...COLUMNS, 'Actions']);

    const seeded = env.dealerA;
    // Compare with the stored values: the server may normalize the seeded phone number.
    const stored = await findDealer(adminApi, seeded.legalName);
    expect(stored, 'seeded dealer A exists').toBeDefined();
    const row = await searchDealer(page, seeded.legalName);
    await expect(row).toHaveCount(1);
    await expect(await cellOf(page, row, 'Contact')).toHaveText(`${stored!.contactPhone} / ${stored!.contactEmail}`);
    // Dealer A is seeded with two staff; other suites may bind more, never fewer.
    const staffCount = await (await cellOf(page, row, 'Staff count')).textContent();
    expect(staffCount?.trim()).toMatch(/^\d+$/);
    expect(Number(staffCount)).toBeGreaterThanOrEqual(seeded.staff.length);
  });

  test('UI-10: search filters the dealer list by name', async ({ adminPage: page, adminApi }) => {
    const dealer = await createDealer(adminApi);
    await page.goto('/admin');

    const row = await searchDealer(page, dealer.legalName);
    await expect(row).toHaveCount(1);
    await expect(await cellOf(page, row, 'Contact')).toHaveText(`${dealer.contactPhone} / ${dealer.contactEmail}`);
    // A brand-new dealership has no staff yet.
    await expect(await cellOf(page, row, 'Staff count')).toHaveText('0');
    // Only rows matching the query are listed.
    const bodyRows = page.locator('table.table').first().locator('tbody tr');
    await expect(bodyRows).toHaveCount(1);
    await expect(page.getByRole('cell', { name: env.dealerB.legalName, exact: true })).toHaveCount(0);

    // A query that matches nothing shows an empty state.
    await page.getByPlaceholder('Dealership name').fill(`No Such Dealer ${uniqueSuffix()}`);
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByText('No dealerships yet.')).toBeVisible();

    // Reset clears the query and lists dealerships again.
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByPlaceholder('Dealership name')).toHaveValue('');
    await expect(bodyRows.first()).toBeVisible();
    await expect(page.getByText('No dealerships yet.')).toHaveCount(0);
  });

  test('UI-11 AUTH-02: create dealership form requires every contact field', async ({ adminPage: page, adminApi }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: 'New dealership' }).click();
    const drawer = page.getByRole('dialog', { name: 'New dealership' });
    await expect(drawer).toBeVisible();

    // All four fields are marked required.
    for (const label of ['Legal name', 'Contact phone', 'Contact email', 'Contact address']) {
      await expect(drawer.locator('.form-label.form-required', { hasText: label })).toBeVisible();
    }

    let posted = false;
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/api\/v1\/admin\/dealers$/.test(r.url())) posted = true;
    });

    // Empty submit is rejected client-side.
    await drawer.getByRole('button', { name: 'Create' }).click();
    await expect(drawer.getByText('Check required contact fields')).toBeVisible();

    // Each missing field alone still blocks the submit.
    const body = dealerBody();
    const values: Record<string, string> = {
      'Legal name': body.legalName,
      'Contact phone': body.contactPhone,
      'Contact email': body.contactEmail,
      'Contact address': body.contactAddress,
    };
    for (const missing of Object.keys(values)) {
      for (const [label, value] of Object.entries(values)) {
        await formField(drawer, label).fill(label === missing ? '' : value);
      }
      await drawer.getByRole('button', { name: 'Create' }).click();
      await expect(drawer.getByText('Check required contact fields'), `missing ${missing}`).toBeVisible();
      await expect(drawer).toBeVisible();
    }
    expect(posted, 'no create request is sent while a required field is empty').toBe(false);

    await drawer.getByRole('button', { name: 'Close' }).click();
    await expect(drawer).toHaveCount(0);
    expect(await findDealer(adminApi, body.legalName)).toBeUndefined();
  });

  test('UI-11 AUTH-02: admin creates a dealership and it appears in the list', async ({ adminPage: page, adminApi }) => {
    const body = dealerBody();
    await page.goto('/admin');
    await page.getByRole('button', { name: 'New dealership' }).click();
    const drawer = page.getByRole('dialog', { name: 'New dealership' });

    await formField(drawer, 'Legal name').fill(body.legalName);
    await formField(drawer, 'Contact phone').fill(body.contactPhone);
    await formField(drawer, 'Contact email').fill(body.contactEmail);
    await formField(drawer, 'Contact address').fill(body.contactAddress);

    const created = page.waitForResponse(
      (r) => /\/api\/v1\/admin\/dealers$/.test(r.url()) && r.request().method() === 'POST',
    );
    await drawer.getByRole('button', { name: 'Create' }).click();
    expect((await created).status()).toBe(201);
    await expect(drawer).toHaveCount(0);

    const row = await searchDealer(page, body.legalName);
    await expect(row).toHaveCount(1);
    await expect(await cellOf(page, row, 'Contact')).toHaveText(`${body.contactPhone} / ${body.contactEmail}`);
    await expect(await cellOf(page, row, 'Staff count')).toHaveText('0');

    const saved = await findDealer(adminApi, body.legalName);
    expect(saved).toMatchObject(body);
  });

  test('UI-11: admin edits a dealership contact and the change persists', async ({ adminPage: page, adminApi }) => {
    const dealer = await createDealer(adminApi);
    const next = dealerBody();
    await page.goto('/admin');

    let row = await searchDealer(page, dealer.legalName);
    await expect(row).toHaveCount(1);
    await row.getByRole('button', { name: 'Edit' }).click();
    const drawer = page.getByRole('dialog', { name: 'Edit dealership' });

    // The form opens prefilled with the stored values.
    await expect(formField(drawer, 'Legal name')).toHaveValue(dealer.legalName);
    await expect(formField(drawer, 'Contact phone')).toHaveValue(dealer.contactPhone);
    await expect(formField(drawer, 'Contact email')).toHaveValue(dealer.contactEmail);
    await expect(formField(drawer, 'Contact address')).toHaveValue(dealer.contactAddress);

    // Clearing a required field is rejected.
    await formField(drawer, 'Contact phone').fill('');
    await drawer.getByRole('button', { name: 'Save' }).click();
    await expect(drawer.getByText('Check required contact fields')).toBeVisible();

    await formField(drawer, 'Contact phone').fill(next.contactPhone);
    await formField(drawer, 'Contact email').fill(next.contactEmail);
    await formField(drawer, 'Contact address').fill(next.contactAddress);
    const saved = page.waitForResponse(
      (r) => r.url().includes(`/api/v1/admin/dealers/${dealer.id}`) && r.request().method() === 'PATCH',
    );
    await drawer.getByRole('button', { name: 'Save' }).click();
    expect((await saved).status()).toBe(200);
    await expect(drawer).toHaveCount(0);
    await expect(await cellOf(page, row, 'Contact')).toHaveText(`${next.contactPhone} / ${next.contactEmail}`);

    // After a reload the list and the edit form show the new values.
    await page.reload();
    row = await searchDealer(page, dealer.legalName);
    await expect(row).toHaveCount(1);
    await expect(await cellOf(page, row, 'Contact')).toHaveText(`${next.contactPhone} / ${next.contactEmail}`);
    await row.getByRole('button', { name: 'Edit' }).click();
    const reopened = page.getByRole('dialog', { name: 'Edit dealership' });
    await expect(formField(reopened, 'Contact phone')).toHaveValue(next.contactPhone);
    await expect(formField(reopened, 'Contact email')).toHaveValue(next.contactEmail);
    await expect(formField(reopened, 'Contact address')).toHaveValue(next.contactAddress);

    const stored = await findDealer(adminApi, dealer.legalName);
    expect(stored).toMatchObject({
      legalName: dealer.legalName,
      contactPhone: next.contactPhone,
      contactEmail: next.contactEmail,
      contactAddress: next.contactAddress,
    });
  });
});
