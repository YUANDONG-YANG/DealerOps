import type { Locator, Page, Route } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { env } from '../../support/env';
import type { Check } from '../../support/api';

const DISCLAIMER = 'This check is not legal advice and is not an OMVIC approval.';

// Seeded dealer A contact block; with it every dealer-contact rule passes.
const { legalName, contactPhone, contactEmail, contactAddress } = env.dealerA;
const CONTACTS = `${legalName}. Call ${contactPhone}, email ${contactEmail}, visit ${contactAddress}.`;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resultPane(page: Page) {
  return page.locator('.result-pane');
}

function field(page: Page, label: string) {
  return page.locator('.form-item', { has: page.getByText(label, { exact: true }) });
}

/** The checklist row whose label is exactly `label` (the row text is "<icon> <label>"). */
function checklistRow(pane: Locator, label: string) {
  return pane.locator('li').filter({ hasText: new RegExp(`^\\S*\\s*${escapeRegex(label)}$`) });
}

async function openAd(page: Page, vehicleId: number) {
  await page.goto(`/ads?vehicleId=${vehicleId}`);
  // The deep link selects the vehicle from an effect; in the React StrictMode dev build that
  // effect runs twice, so a late second load can reset the form. Edits must start only after
  // every selection request has settled.
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Select a vehicle to start.')).toHaveCount(0);
  await expect(page.getByText('Loading listing…')).toHaveCount(0);
}

/** Clicks Run check and returns the check returned by the server. */
async function runCheck(page: Page) {
  const response = page.waitForResponse(
    (r) => /\/api\/v1\/listings\/\d+\/checks$/.test(r.url()) && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Run check' }).click();
  const res = await response;
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()) as Check;
}

test.describe('Ad compliance check (UI)', () => {
  // UI flows share the stack with other parallel suites; allow for a slow gateway.
  test.describe.configure({ timeout: 60_000 });

  test('UI-42 / UI-43 / UI-44 / UI-46 / AT-12: a CASH ad without a price is Blocked with per-rule marks and the AI is not called', async ({
    staffPage: page, staffApi,
  }) => {
    const v = await staffApi.createVehicle({ conditionCode: 'AS_IS', modelYear: 2020 });
    await openAd(page, v.id);

    const pane = resultPane(page);
    await expect(pane.getByText(DISCLAIMER, { exact: true })).toBeVisible();

    // The model year is left out on purpose so one REVIEW row (⚠️) appears next to the BLOCK.
    await field(page, 'Title').locator('input').fill('Used Toyota Camry, sold as-is');
    await field(page, 'Body').locator('textarea').fill(`Used Toyota Camry, sold as-is. ${CONTACTS}`);
    await field(page, 'Type').locator('select').selectOption('CASH');

    const runButton = page.getByRole('button', { name: 'Run check' });
    await expect(runButton).toBeDisabled();

    const saved = page.waitForResponse(
      (r) => r.url().endsWith(`/api/v1/vehicles/${v.id}/listing`) && r.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Save draft' }).click();
    expect((await saved).status()).toBe(200);
    await expect(runButton).toBeEnabled();

    // Hold the check request so the loading state is observable without a fixed sleep.
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route(/\/api\/v1\/listings\/\d+\/checks$/, async (route: Route) => {
      await held;
      await route.continue();
    });

    const response = page.waitForResponse(
      (r) => /\/api\/v1\/listings\/\d+\/checks$/.test(r.url()) && r.request().method() === 'POST',
    );
    await runButton.click();
    await expect(page.getByRole('button', { name: 'Checking…' })).toBeDisabled();
    release();
    const res = await response;
    expect(res.status()).toBe(200);
    const check = (await res.json()) as Check;

    // AT-12: rule block short-circuits the AI review.
    expect(check.checkStatus).toBe('BLOCKED');
    expect(check.aiStatus).toBe('SKIPPED');
    expect(check.ruleFindings.filter((f) => f.severity === 'BLOCK').map((f) => f.ruleId)).toEqual(['PRICE_MISSING']);

    await expect(page.getByRole('button', { name: 'Run check' })).toBeVisible();
    await expect(pane.getByRole('status')).toHaveText('Blocked');

    // UI-43: failing rule ❌ with its reason, review rule ⚠️, passing rows ✅.
    await expect(pane.locator('li', { hasText: 'PRICE_MISSING' })).toHaveText(
      '❌ Block · PRICE_MISSING: Advertised price not found in the ad body.',
    );
    await expect(pane.locator('li', { hasText: 'YEAR_NOT_IN_COPY' })).toHaveText(
      '⚠️ Review · YEAR_NOT_IN_COPY: Model year is not present in the ad copy.',
    );
    await expect(checklistRow(pane, 'Price')).toHaveText('❌ Price');
    await expect(checklistRow(pane, 'New/used and year')).toHaveText('⚠️ New/used and year');
    await expect(checklistRow(pane, 'Dealership name and contacts')).toHaveText('✅ Dealership name and contacts');
    await expect(checklistRow(pane, 'Condition')).toHaveText('✅ Condition');

    // UI-46: the disclaimer stays visible next to the result.
    await expect(pane.getByText(DISCLAIMER, { exact: true })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Mark ready' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Export TXT' })).toBeDisabled();
  });

  test('AT-13 / UI-43: a FINANCE ad with a payment but no APR is Blocked on FINANCE_APR_MISSING', async ({
    staffPage: page, staffApi,
  }) => {
    const v = await staffApi.createVehicle({ conditionCode: 'AS_IS', modelYear: 2020 });
    await staffApi.saveListing(v.id, {
      title: 'Used 2020 Toyota Camry',
      body: `Used 2020 Toyota Camry, sold as-is. Cash price $18,900 or $299 per month for 60 months. ${CONTACTS}`,
      adKind: 'FINANCE',
      medium: 'ONLINE',
    });
    await openAd(page, v.id);

    const check = await runCheck(page);
    expect(check.checkStatus).toBe('BLOCKED');
    expect(check.aiStatus).toBe('SKIPPED');
    expect(check.ruleFindings.filter((f) => f.severity === 'BLOCK').map((f) => f.ruleId)).toEqual(['FINANCE_APR_MISSING']);

    const pane = resultPane(page);
    await expect(pane.getByRole('status')).toHaveText('Blocked');
    await expect(pane.locator('li', { hasText: 'FINANCE_APR_MISSING' })).toHaveText(
      '❌ Block · FINANCE_APR_MISSING: Finance APR is missing from the ad.',
    );
    // With no APR at all there is nothing to place next to the payment: only the APR row fails.
    await expect(pane.locator('li', { hasText: 'FINANCE_APR_PROXIMITY' })).toHaveCount(0);
    await expect(checklistRow(pane, 'APR')).toHaveText('❌ APR');
    await expect(checklistRow(pane, 'APR shown as prominently as the payment amount'))
      .toHaveText('✅ APR shown as prominently as the payment amount');
    await expect(checklistRow(pane, 'Finance term')).toHaveText('✅ Finance term');
    await expect(checklistRow(pane, 'Cash price or cost of borrowing')).toHaveText('✅ Cash price or cost of borrowing');
    await expect(checklistRow(pane, 'Price')).toHaveText('✅ Price');
    await expect(pane.getByText(DISCLAIMER, { exact: true })).toBeVisible();
  });

  test('AT-16 / UI-43: an AS_IS vehicle advertised as Certified is Blocked on CONDITION_MISMATCH', async ({
    staffPage: page, staffApi,
  }) => {
    const v = await staffApi.createVehicle({ conditionCode: 'AS_IS', modelYear: 2020 });
    await staffApi.saveListing(v.id, {
      title: 'Certified used 2020 Toyota Camry',
      body: `Certified used 2020 Toyota Camry, sold as-is, $18,900. ${CONTACTS}`,
      adKind: 'CASH',
      medium: 'ONLINE',
    });
    await openAd(page, v.id);

    const check = await runCheck(page);
    expect(check.checkStatus).toBe('BLOCKED');
    expect(check.aiStatus).toBe('SKIPPED');
    expect(check.ruleFindings.filter((f) => f.severity === 'BLOCK').map((f) => f.ruleId)).toEqual(['CONDITION_MISMATCH']);

    const pane = resultPane(page);
    await expect(pane.getByRole('status')).toHaveText('Blocked');
    await expect(pane.locator('li', { hasText: 'CONDITION_MISMATCH' })).toHaveText(
      '❌ Block · CONDITION_MISMATCH: Ad claims certified but the vehicle is not certified.',
    );
    await expect(checklistRow(pane, 'Condition')).toHaveText('❌ Condition');
    await expect(checklistRow(pane, 'Price')).toHaveText('✅ Price');
    await expect(checklistRow(pane, 'New/used and year')).toHaveText('✅ New/used and year');
    await expect(checklistRow(pane, 'Dealership name and contacts')).toHaveText('✅ Dealership name and contacts');
  });

  test('UI-44 / AD-11: editing a Blocked ad returns the badge to "Needs AI review", not Stale', async ({
    staffPage: page, staffApi,
  }) => {
    const v = await staffApi.createVehicle({ conditionCode: 'AS_IS', modelYear: 2020 });
    const listing = await staffApi.saveListing(v.id, {
      title: 'Used 2020 Toyota Camry',
      body: `Used 2020 Toyota Camry, sold as-is. ${CONTACTS}`,
      adKind: 'CASH',
      medium: 'ONLINE',
    });
    const { check } = await staffApi.runCheck(listing);
    expect(check.checkStatus).toBe('BLOCKED');

    await openAd(page, v.id);
    const pane = resultPane(page);
    await expect(pane.getByRole('status')).toHaveText('Blocked');

    const body = field(page, 'Body').locator('textarea');
    await expect(body).toHaveValue(/sold as-is/);
    await body.fill(`Used 2020 Toyota Camry, sold as-is, $18,900. ${CONTACTS}`);

    const saved = page.waitForResponse(
      (r) => r.url().endsWith(`/api/v1/vehicles/${v.id}/listing`) && r.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Save draft' }).click();
    const res = await saved;
    expect(res.status()).toBe(200);
    expect(((await res.json()) as { checkStatus: string }).checkStatus).toBe('NEEDS_AI');

    await expect(pane.getByRole('status')).toHaveText('Needs AI review');
    await expect(pane.getByText('Stale', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Run check' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Mark ready' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Export TXT' })).toBeDisabled();
    await expect(pane.getByText(DISCLAIMER, { exact: true })).toBeVisible();
  });
});
