import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { aiAvailable, expectStatus, type Vehicle } from '../../support/api';
import { env } from '../../support/env';

// UI-45, AD-12, AD-13 and acceptance cases AT-17, AT-19, AT-20 on /ads.

const dealer = env.dealerA;
const contacts = `${dealer.contactPhone}, ${dealer.contactEmail}, ${dealer.contactAddress}`;

/** Copy that satisfies every hard rule for a 2020 AS_IS vehicle sold for cash. */
function compliantCash(v: Pick<Vehicle, 'modelYear' | 'make' | 'model'>, price = '$18,900') {
  return {
    title: `${v.modelYear} ${v.make} ${v.model}`,
    body: `Used ${v.modelYear} ${v.make} ${v.model}, sold as-is. Cash price ${price}. ${dealer.legalName}, ${contacts}.`,
    adKind: 'CASH' as const,
    medium: 'ONLINE' as const,
  };
}

async function openAd(page: Page, vehicleId: number) {
  await page.goto(`/ads?vehicleId=${vehicleId}`);
  await expect(page.getByRole('button', { name: 'Save draft' })).toBeEnabled();
  await expect(page.getByText('Loading listing…')).toHaveCount(0);
}

function controls(page: Page) {
  return {
    markReady: page.getByRole('button', { name: 'Mark ready' }),
    exportTxt: page.getByRole('button', { name: 'Export TXT' }),
    runCheck: page.getByRole('button', { name: 'Run check' }),
    save: page.getByRole('button', { name: 'Save draft' }),
    badge: page.locator('.result-pane').getByRole('status'),
    body: page.locator('.form-item', { has: page.getByText('Body', { exact: true }) }).locator('textarea'),
  };
}

test('UI-45 / AD-12: Mark ready and Export TXT stay disabled for an unchecked or Blocked ad', async ({
  staffPage: page, staffApi,
}) => {
  // Unchecked draft (Needs AI review).
  const unchecked = await staffApi.createVehicle();
  await staffApi.saveListing(unchecked.id, compliantCash(unchecked));
  await openAd(page, unchecked.id);
  const c = controls(page);
  await expect(c.body).toHaveValue(compliantCash(unchecked).body);
  await expect(c.runCheck).toBeEnabled();
  await expect(c.markReady).toBeDisabled();
  await expect(c.exportTxt).toBeDisabled();

  // Blocked check: a missing price blocks on rules, so the AI is not called.
  const blocked = await staffApi.createVehicle();
  const listing = await staffApi.saveListing(blocked.id, {
    ...compliantCash(blocked), body: `Used 2020 Toyota Camry, sold as-is. ${dealer.legalName}, ${contacts}.`,
  });
  const { httpStatus, check } = await staffApi.runCheck(listing);
  expect(httpStatus).toBe(200);
  expect(check.checkStatus).toBe('BLOCKED');

  await openAd(page, blocked.id);
  await expect(c.badge).toHaveText('Blocked');
  await expect(c.markReady).toBeDisabled();
  await expect(c.exportTxt).toBeDisabled();
});

test.describe('with the real AI', () => {
  test.describe.configure({ timeout: 90_000 });

  test('AT-17 / AT-19 / AT-20 / AD-12 / AD-13 / UI-45: a passed ad goes Ready and exports public data; a price edit makes it Stale', async ({
    staffPage: page, staffApi, request, allowBrowserErrors,
  }) => {
    test.skip(!(await aiAvailable(request)), 'AI service is not UP');
    // An AI outage surfaces as a 502 from the check endpoint; it is handled below as a skip.
    allowBrowserErrors(/HTTP 502: POST .*\/api\/v1\/listings\/\d+\/checks/);
    allowBrowserErrors(/status code 502|502 \(Bad Gateway\)/i);

    const v = await staffApi.createVehicle({ purchaseCost: 13579 });
    const customer = await staffApi.createCustomer();
    await expectStatus(await staffApi.put(`/api/v1/customers/${customer.id}/vehicles/${v.id}`), 200);
    const draft = compliantCash(v);
    await staffApi.saveListing(v.id, draft);

    await openAd(page, v.id);
    const c = controls(page);
    await expect(c.markReady).toBeDisabled();
    await expect(c.exportTxt).toBeDisabled();

    const checked = page.waitForResponse(
      (r) => /\/api\/v1\/listings\/\d+\/checks$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 60_000 },
    );
    await c.runCheck.click();
    const checkRes = await checked;
    if (checkRes.status() === 502) {
      const text = await checkRes.text();
      test.skip(text.includes('AI_UNAVAILABLE'), `AI provider unavailable during check: ${text}`);
    }
    expect(checkRes.status(), await checkRes.text()).toBe(200);

    // AT-17: a fully compliant ad passes and both actions become available.
    await expect(c.badge).toHaveText('Passed');
    await expect(c.markReady).toBeEnabled();
    await expect(c.exportTxt).toBeEnabled();

    const readied = page.waitForResponse(
      (r) => /\/api\/v1\/listings\/\d+\/ready$/.test(r.url()) && r.request().method() === 'POST',
    );
    await c.markReady.click();
    const readyRes = await readied;
    expect(readyRes.status(), await readyRes.text()).toBe(200);
    expect((await readyRes.json()).status).toBe('READY');
    await expect(page.locator('.page .danger-text')).toHaveCount(0);
    expect((await staffApi.getListing(v.id)).status).toBe('READY');

    // AT-20 / AD-13: the TXT holds dealer and vehicle public data, the disclaimer, no cost or customer.
    await expect(c.exportTxt).toBeEnabled();
    const downloaded = page.waitForEvent('download');
    await c.exportTxt.click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toMatch(/\.txt$/);
    const path = await download.path();
    expect(path, 'download should be saved').toBeTruthy();
    const txt = await readFile(path!, 'utf8');
    for (const expected of [
      dealer.legalName, dealer.contactPhone, dealer.contactEmail, dealer.contactAddress,
      String(v.modelYear), v.make, v.model, v.vin, draft.title, draft.body,
    ]) {
      expect(txt, `TXT should contain ${expected}`).toContain(expected);
    }
    expect(txt).toMatch(/not legal advice/i);
    for (const forbidden of ['13579', '13,579', customer.name, customer.email, customer.phone, customer.homeAddress]) {
      expect(txt, `TXT must not contain ${forbidden}`).not.toContain(forbidden);
    }

    // AT-19 / UI-45: editing the advertised price disables the actions; once saved the badge is Stale.
    await c.body.fill(compliantCash(v, '$17,500').body);
    await expect(c.markReady).toBeDisabled();
    await expect(c.exportTxt).toBeDisabled();
    const saved = page.waitForResponse(
      (r) => r.url().endsWith(`/api/v1/vehicles/${v.id}/listing`) && r.request().method() === 'PATCH',
    );
    await c.save.click();
    expect((await saved).status()).toBe(200);
    await expect(c.badge).toHaveText('Stale');
    await expect(c.markReady).toBeDisabled();
    await expect(c.exportTxt).toBeDisabled();
    expect((await staffApi.getListing(v.id)).checkStatus).toBe('STALE');

    // The stale state survives a reload.
    await openAd(page, v.id);
    await expect(c.badge).toHaveText('Stale');
    await expect(c.markReady).toBeDisabled();
    await expect(c.exportTxt).toBeDisabled();
  });
});
