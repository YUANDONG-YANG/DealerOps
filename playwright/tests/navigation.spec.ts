import { test, expect } from '../support/fixtures';
import { env } from '../support/env';

// Each dealer page must render its heading without browser errors or 5xx responses
// (the auto browserErrors fixture enforces the latter).
const dealerPages = [
  { path: '/dashboard', heading: 'Dashboard' },
  { path: '/dms', heading: 'DMS' },
  { path: '/crm', heading: 'CRM' },
  { path: '/leads', heading: 'Leads' },
  { path: '/reports/sales-funnel', heading: 'Sales report' },
  { path: '/ads', heading: 'Ad compliance' },
  { path: '/team', heading: 'Team' },
  { path: '/profile', heading: 'Profile' },
];

for (const { path, heading } of dealerPages) {
  test(`staff can open ${path}`, async ({ staffPage }) => {
    await staffPage.goto(path);
    await expect(staffPage.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(staffPage.locator('.alert-error')).toHaveCount(0);
  });
}

test('side menu navigates between dealer pages', async ({ staffPage }) => {
  await staffPage.goto('/dms');
  for (const label of ['Dashboard', 'CRM', 'Leads', 'Sales report', 'Ad compliance', 'Team', 'DMS']) {
    await staffPage.locator('.side-menu').getByRole('link', { name: label }).click();
    await expect(staffPage.getByRole('heading', { name: label, exact: true })).toBeVisible();
  }
});

test('admin page lists the seeded dealership', async ({ adminPage }) => {
  await adminPage.goto('/admin');
  await expect(adminPage.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible();
  // Specs keep creating dealerships, so search instead of relying on the first page.
  await adminPage.getByPlaceholder('Dealership name').fill(env.dealerName);
  await adminPage.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(adminPage.getByText(env.dealerName).first()).toBeVisible();
});
