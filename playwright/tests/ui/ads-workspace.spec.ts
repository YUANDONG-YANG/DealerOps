import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { uniqueSuffix, type Api } from '../../support/api';

// Each test seeds data through the API and reloads the page; allow for a busy shared backend.
test.describe.configure({ timeout: 60_000 });

// The ad form labels have no htmlFor, so fields are located through their .form-item wrapper.
function field(page: Page, label: string, control: 'input' | 'textarea' | 'select'): Locator {
  return page
    .locator('.form-item', { has: page.locator('label.form-label', { hasText: new RegExp(`^${label}$`) }) })
    .locator(control);
}

function adForm(page: Page) {
  return {
    title: field(page, 'Title', 'input'),
    body: field(page, 'Body', 'textarea'),
    type: field(page, 'Type', 'select'),
    medium: field(page, 'Medium', 'select'),
    priorUse: field(page, 'Previous use', 'select'),
    warranty: field(page, 'Extended warranty terms \\(if offered\\)', 'textarea'),
    annualKm: field(page, 'Annual kilometre allowance', 'input'),
  };
}

function checklist(page: Page) {
  return page.locator('.result-pane').locator('ul').first().locator('li');
}

async function openAd(page: Page, vehicleId: number) {
  const listingLoaded = page.waitForResponse(
    (r) => r.url().endsWith(`/api/v1/vehicles/${vehicleId}/listing`) && r.request().method() === 'GET',
  );
  await page.goto(`/ads?vehicleId=${vehicleId}`);
  expect((await listingLoaded).status()).toBe(200);
  // React StrictMode (dev) loads the listing twice; wait until every load has landed so a late
  // response cannot overwrite edits made by the test.
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Loading listing…')).toHaveCount(0);
  await expect(adForm(page).title).toBeVisible();
}

async function saveDraft(page: Page, vehicleId: number) {
  const saved = page.waitForResponse(
    (r) => r.url().endsWith(`/api/v1/vehicles/${vehicleId}/listing`) && r.request().method() === 'PATCH',
  );
  await page.getByRole('button', { name: 'Save draft' }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Save draft' })).toBeEnabled();
}

async function me(api: Api) {
  const res = await api.get('/api/v1/me');
  expect(res.status()).toBe(200);
  return (await res.json()) as {
    dealerLegalName: string; dealerContactPhone: string; dealerContactEmail: string; dealerContactAddress: string;
  };
}

const BASE_ITEMS = [
  'Dealership name and contacts', 'Prior use (when applicable)', 'New/used and year',
  'Extended warranty (if any)', 'Price', 'Condition',
];
const FINANCE_ITEMS = ['APR', 'Finance term', 'Cash price or cost of borrowing'];
const PROXIMITY = 'APR shown as prominently as the payment amount';
const LEASE_ITEMS = [
  'Lease statement', 'Lease term', 'Rent / payment', 'APR', 'Down payment',
  'Annual kilometre allowance and excess charges',
];

async function expectChecklist(page: Page, expected: string[]) {
  await expect(checklist(page)).toHaveText(expected.map((t) => new RegExp(`^\\s*${t.replace(/[()/]/g, '\\$&')}\\s*$`)));
}

test('UI-40 / AD-01: edit title, body, type and medium; Save draft persists after reload', async ({ staffPage: page, staffApi }) => {
  const vehicle = await staffApi.createVehicle();
  const id = uniqueSuffix();
  const title = `E2E ad ${id}`;
  const body = `2020 Toyota Camry, used, as is. Ad ${id}. Call E2E Motors.`;

  await openAd(page, vehicle.id);
  const form = adForm(page);
  await form.title.fill(title);
  await form.body.fill(body);
  await form.type.selectOption('FINANCE');
  await form.medium.selectOption('RADIO_TV_BILLBOARD');
  await saveDraft(page, vehicle.id);

  await openAd(page, vehicle.id);
  await expect(form.title).toHaveValue(title);
  await expect(form.body).toHaveValue(body);
  await expect(form.type).toHaveValue('FINANCE');
  await expect(form.medium).toHaveValue('RADIO_TV_BILLBOARD');

  const persisted = await staffApi.getListing(vehicle.id);
  expect(persisted).toMatchObject({ title, body, adKind: 'FINANCE', medium: 'RADIO_TV_BILLBOARD' });

  // Editing an existing draft updates the same listing (one draft per vehicle).
  await form.title.fill(`${title} edited`);
  await saveDraft(page, vehicle.id);
  await openAd(page, vehicle.id);
  await expect(form.title).toHaveValue(`${title} edited`);
  expect((await staffApi.getListing(vehicle.id)).id).toBe(persisted.id);
});

test('UI-41 / AD-05 / AD-06: year and condition come from DMS, dealer name and contacts from the profile', async ({ staffPage: page, staffApi }) => {
  const vehicle = await staffApi.createVehicle({ modelYear: 2017, conditionCode: 'CERTIFIED' });
  const profile = await me(staffApi);

  await openAd(page, vehicle.id);
  const card = page.locator('.card', { has: page.locator('.card-header', { hasText: 'Advertisement' }) });
  await expect(card.getByText('Year 2017', { exact: false })).toBeVisible();
  await expect(card.getByText(/Condition Certified/)).toBeVisible();
  await expect(card.getByText(`Dealership ${profile.dealerLegalName}`, { exact: false })).toBeVisible();
  const contact = card.getByText(/^Contact /);
  await expect(contact).toContainText(profile.dealerContactPhone);
  await expect(contact).toContainText(profile.dealerContactEmail);
  await expect(contact).toContainText(profile.dealerContactAddress);
});

test('AD-02: checklist follows kind and medium and is display only', async ({ staffPage: page, staffApi }) => {
  const vehicle = await staffApi.createVehicle();
  await openAd(page, vehicle.id);
  const form = adForm(page);

  await form.type.selectOption('CASH');
  await form.medium.selectOption('ONLINE');
  await expectChecklist(page, BASE_ITEMS);

  await form.type.selectOption('FINANCE');
  await expectChecklist(page, [...BASE_ITEMS, ...FINANCE_ITEMS, PROXIMITY]);

  // APR proximity applies to online ads only.
  await form.medium.selectOption('RADIO_TV_BILLBOARD');
  await expectChecklist(page, [...BASE_ITEMS, ...FINANCE_ITEMS]);

  await form.type.selectOption('LEASE');
  await expectChecklist(page, [...BASE_ITEMS, ...LEASE_ITEMS]);
  await form.medium.selectOption('ONLINE');
  await expectChecklist(page, [...BASE_ITEMS, ...LEASE_ITEMS]);

  // The checklist itself collects no answers.
  const pane = page.locator('.result-pane');
  await expect(pane.locator('input, select, textarea, [contenteditable="true"]')).toHaveCount(0);
  await expect(pane.getByRole('checkbox')).toHaveCount(0);

  // The only answer fields on the page are the salesperson checklist inputs next to the ad copy.
  const answerLabels = await page.locator('.form-item label.form-label').allTextContents();
  expect(answerLabels).toEqual([
    'Title', 'Body', 'Type', 'Medium', 'Previous use', 'Extended warranty terms (if offered)', 'Annual kilometre allowance',
  ]);
  await form.type.selectOption('CASH');
  await expect(form.annualKm).toHaveCount(0);
});

test('AT-28 / UI-40: salesperson checklist answers persist after reload', async ({ staffPage: page, staffApi }) => {
  const vehicle = await staffApi.createVehicle();
  const terms = `Extended warranty 36 months / 60,000 km, $1,200 ${uniqueSuffix()}`;

  await openAd(page, vehicle.id);
  const form = adForm(page);
  await form.title.fill('2020 Toyota Camry lease');
  await form.type.selectOption('LEASE');
  await form.priorUse.selectOption('DAILY_RENTAL');
  await form.warranty.fill(terms);
  await form.annualKm.fill('20000');
  await saveDraft(page, vehicle.id);

  await openAd(page, vehicle.id);
  await expect(form.type).toHaveValue('LEASE');
  await expect(form.priorUse).toHaveValue('DAILY_RENTAL');
  await expect(form.warranty).toHaveValue(terms);
  await expect(form.annualKm).toHaveValue('20000');

  expect(await staffApi.getListing(vehicle.id)).toMatchObject({
    adKind: 'LEASE', priorUse: 'DAILY_RENTAL', warrantyTerms: terms, annualKmAllowance: 20000,
  });

  // Clearing the answers also persists.
  await form.priorUse.selectOption('');
  await form.warranty.fill('');
  await saveDraft(page, vehicle.id);
  await openAd(page, vehicle.id);
  await expect(form.priorUse).toHaveValue('');
  await expect(form.warranty).toHaveValue('');
});

test('AD-01: a sold vehicle advertisement is read-only', async ({ staffPage: page, staffApi }) => {
  const vehicle = await staffApi.createVehicle();
  await staffApi.saveListing(vehicle.id, { title: 'Before sale', body: 'Body before sale', adKind: 'CASH', medium: 'ONLINE' });
  await staffApi.sellVehicle(await staffApi.getVehicle(vehicle.id));

  await openAd(page, vehicle.id);
  const form = adForm(page);
  await expect(page.getByText('This vehicle is sold. The advertisement is read-only.')).toBeVisible();
  await expect(form.title).toHaveValue('Before sale');
  for (const control of [form.title, form.body, form.type, form.medium, form.priorUse, form.warranty]) {
    await expect(control).toBeDisabled();
  }
  for (const name of ['Save draft', 'Run check', 'Mark ready', 'Export TXT']) {
    await expect(page.getByRole('button', { name })).toBeDisabled();
  }
});
