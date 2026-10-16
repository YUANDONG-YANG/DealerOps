import { test, expect } from '../support/fixtures';

test('staff creates a customer and finds it by search', async ({ staffPage: page }) => {
  // Unique per run: email and phone are unique per dealership.
  const stamp = Date.now().toString();
  const name = `E2E Customer ${stamp}`;

  await page.goto('/crm');
  await page.getByRole('button', { name: 'Add customer' }).click();

  const drawer = page.getByRole('dialog', { name: 'Customer' });
  await drawer.getByLabel('Name').fill(name);
  await drawer.getByLabel('Email').fill(`e2e.${stamp}@example.com`);
  await drawer.getByLabel('Phone').fill(`+1403${stamp.slice(-7)}`);
  await drawer.getByLabel('Home address').fill('1 Test Street, Calgary, AB');

  const created = page.waitForResponse(
    (r) => r.url().includes('/api/v1/customers') && r.request().method() === 'POST',
  );
  await drawer.getByRole('button', { name: 'Save' }).click();
  expect((await created).status()).toBe(201);

  await page.getByPlaceholder('Name / Email / Phone').fill(name);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('cell', { name })).toBeVisible();
});

test('customer form shows validation errors for an empty submit', async ({ staffPage: page }) => {
  await page.goto('/crm');
  await page.getByRole('button', { name: 'Add customer' }).click();
  const drawer = page.getByRole('dialog', { name: 'Customer' });
  await drawer.getByRole('button', { name: 'Save' }).click();
  await expect(drawer.locator('.form-error').first()).toBeVisible();
});
