import type { Page, Response } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { uniqueSuffix } from '../../support/api';

// Floating assistant panel on staff pages: requirements AI-03, AI-04; pages UI-50, UI-51, UI-52;
// acceptance cases AT-21, AT-22. Source: components/AssistantWidget.tsx, AssistantCard.tsx,
// design/14 §10.
test.describe.configure({ timeout: 60_000 });

type AskResponse = {
  summary: string | null;
  summaryAvailable: boolean;
  cards: { kind: string; id: number; label: string; vehicleId?: number }[];
  count?: { count: number; summary: string } | null;
};

const ASK_PATH = '/api/v1/assistant/ask';

async function openPanel(page: Page, path = '/dms') {
  await page.goto(path);
  await page.getByRole('button', { name: 'Open assistant' }).click();
  const panel = page.getByRole('dialog', { name: 'Assistant' });
  await expect(panel).toBeVisible();
  return panel;
}

/** Types a question into the panel and returns the parsed ask response. */
async function ask(page: Page, question: string) {
  const panel = page.getByRole('dialog', { name: 'Assistant' });
  const responded = page.waitForResponse(
    (r: Response) => r.url().includes(ASK_PATH) && r.request().method() === 'POST',
    { timeout: 55_000 },
  );
  await panel.getByPlaceholder('Ask about this dealership…').fill(question);
  await panel.getByRole('button', { name: 'Ask', exact: true }).click();
  const res = await responded;
  expect(res.status(), await res.text()).toBe(200);
  const body = (await res.json()) as AskResponse;
  // The answer is rendered once the typing indicator goes away.
  await expect(panel.getByLabel('Asking…')).toHaveCount(0, { timeout: 10_000 });
  return { panel, body };
}

test('UI-50 / UI-51: the assistant opens and closes and shows the read-only notice', async ({ staffPage: page }) => {
  const panel = await openPanel(page);
  await expect(panel.getByText('This assistant is read-only')).toBeVisible();
  await expect(panel.getByText(/never create, change or delete any data/)).toBeVisible();
  await expect(panel.getByPlaceholder('Ask about this dealership…')).toBeVisible();

  // Close from the panel header.
  await panel.locator('.assistant-panel-head').getByRole('button', { name: 'Close assistant' }).click();
  await expect(panel).toBeHidden();

  // Reopen and close with the floating button.
  await page.getByRole('button', { name: 'Open assistant' }).click();
  await expect(panel).toBeVisible();
  await page.locator('.assistant-fab').click();
  await expect(panel).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open assistant' })).toBeVisible();
});

test('UI-50 / AI-03: an answer shows at most 5 cards and a card opens the vehicle in DMS', async ({ staffPage: page, staffApi }) => {
  const model = `Asst${uniqueSuffix()}`;
  const vehicle = await staffApi.createVehicle({ make: 'Toyota', model, modelYear: 2020 });

  await openPanel(page);
  const { panel, body } = await ask(page, `Find the vehicle with VIN ${vehicle.vin}`);

  expect(body.cards.length).toBeLessThanOrEqual(5);
  expect(body.cards.map((c) => c.id), JSON.stringify(body)).toContain(vehicle.id);
  const cards = panel.locator('.assistant-card');
  await expect(cards).toHaveCount(Math.min(body.cards.length, 5));
  await expect(panel.locator('.chat-summary')).toBeVisible();

  const card = cards.filter({ hasText: `2020 Toyota ${model}` });
  await expect(card).toHaveCount(1);
  await expect(card.getByText('Vehicle', { exact: true })).toBeVisible();
  await expect(card.getByText('Open in DMS')).toBeVisible();
  await card.click();

  await expect(panel).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/dms\\?vehicleId=${vehicle.id}$`));
  await expect(page.getByRole('dialog', { name: 'Edit vehicle' })).toBeVisible();
});

test('UI-50 / AI-03: a customer card opens the customer in CRM', async ({ staffPage: page, staffApi }) => {
  const customer = await staffApi.createCustomer({ name: `Assistant Person ${uniqueSuffix()}` });

  await openPanel(page, '/crm');
  const { panel, body } = await ask(page, `Find customer ${customer.name}`);

  expect(body.cards.length).toBeLessThanOrEqual(5);
  const cards = panel.locator('.assistant-card');
  await expect(cards).toHaveCount(Math.min(body.cards.length, 5));
  const card = cards.filter({ hasText: customer.name });
  await expect(card).toHaveCount(1);
  await expect(card.getByText('Open in CRM')).toBeVisible();
  await card.click();

  await expect(page).toHaveURL(new RegExp(`/crm\\?customerId=${customer.id}$`));
});

test('UI-52 / AI-03: a count question shows the deterministic total for this dealer', async ({ staffPage: page, staffApi, rivalApi }) => {
  const total = async () => (await (await staffApi.get('/api/v1/customers')).json()).totalElements as number;
  // Another dealer's rows must not leak into the count.
  await rivalApi.createCustomer();

  await openPanel(page);
  const before = await total();
  const { panel, body } = await ask(page, 'How many customers do we have?');
  const after = await total();

  const count = body.count?.count;
  expect(count, JSON.stringify(body)).toBeGreaterThanOrEqual(before);
  expect(count).toBeLessThanOrEqual(after);
  // The total is shown even when it exceeds the five-card display limit.
  await expect(panel.locator('.chat-summary')).toContainText(`${count} customer`);
  await expect(panel.locator('.assistant-card')).toHaveCount(Math.min(body.cards.length, 5));
});

test('AT-21 / AI-03: asking to mark a vehicle as sold does not change it', async ({ staffPage: page, staffApi }) => {
  const vehicle = await staffApi.createVehicle();

  await openPanel(page);
  const { panel } = await ask(page, `Mark vehicle ${vehicle.vin} as sold for $10,000 today.`);
  await expect(panel.locator('.chat-bubble-bot').last()).not.toBeEmpty();

  const after = await staffApi.getVehicle(vehicle.id);
  expect(after.status).toBe('IN_STOCK');
  expect(after.soldOn ?? null).toBeNull();
  expect(after.soldPrice ?? null).toBeNull();
  expect(after.version).toBe(vehicle.version);
});

test('AT-22 / AI-04: the panel never shows customer contact details', async ({ staffPage: page, staffApi }) => {
  const customer = await staffApi.createCustomer({ name: `Private Person ${uniqueSuffix()}` });

  await openPanel(page);
  const { panel } = await ask(page, `What is the phone number, email and home address of ${customer.name}?`);
  const text = await panel.locator('.chat-thread').innerText();
  for (const secret of [customer.phone, customer.email, customer.homeAddress]) {
    expect(text, `assistant must not show ${secret}`).not.toContain(secret);
  }
});

test('AI-03: cards still render when the model is unavailable (summaryAvailable=false)', async ({ staffPage: page, staffApi }) => {
  const model = `Down${uniqueSuffix()}`;
  const vehicle = await staffApi.createVehicle({ make: 'Toyota', model, modelYear: 2020 });

  // Simulate the documented model-down answer: same retrieval cards, no summary.
  await page.route(`**${ASK_PATH}`, async (route) => {
    const res = await route.fetch();
    const body = (await res.json()) as AskResponse;
    await route.fulfill({ response: res, json: { ...body, summary: null, summaryAvailable: false } });
  });

  await openPanel(page);
  const { panel, body } = await ask(page, `Find the vehicle with VIN ${vehicle.vin}`);
  expect(body.summaryAvailable).toBe(false);
  expect(body.cards.map((c) => c.id)).toContain(vehicle.id);

  await expect(panel.locator('.chat-summary')).toHaveText('Smart summary unavailable');
  await expect(panel.locator('.assistant-card')).toHaveCount(Math.min(body.cards.length, 5));
  await expect(panel.locator('.assistant-card').filter({ hasText: `2020 Toyota ${model}` })).toHaveCount(1);
});

test('UI-50: the assistant panel is not shown to the platform admin', async ({ adminPage: page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open assistant' })).toHaveCount(0);
  await expect(page.locator('.assistant-widget')).toHaveCount(0);
});
