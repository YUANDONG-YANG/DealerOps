import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { aiAvailable, expectStatus, publishAd, randomDigits, uniqueSuffix, type Api, type Vehicle } from '../../support/api';
import { env } from '../../support/env';

// Anonymous buyer site (design/21 SHOP-01 to SHOP-05, contract §13): only in-stock vehicles with a
// READY ad whose last check passed are public; inquiries become NEW leads.

test.describe.configure({ timeout: 120_000 });

type PublicVehicle = {
  vehicleId: number; modelYear: number; make: string; model: string; mileageKm?: number | null;
  exteriorColor?: string | null; fuelType?: string | null; title: string; body: string; hasPhoto: boolean;
};
type PublicInventory = { dealerId: number; legalName: string; contactPhone: string; vehicles: PublicVehicle[] };

const dealer = env.dealerA;

function publicUrl(dealerId: number, path: string) {
  return `${env.gatewayUrl}/api/v1/public/dealers/${dealerId}/${path}`;
}

async function dealerIdOf(api: Api) {
  const res = await api.get('/api/v1/me');
  await expectStatus(res, 200);
  return ((await res.json()) as { dealerId: number }).dealerId;
}

async function inventory(request: APIRequestContext, dealerId: number) {
  const res = await request.get(publicUrl(dealerId, 'inventory'));
  await expectStatus(res, 200);
  return (await res.json()) as PublicInventory;
}

function inquiry(vehicleId: number, overrides: Record<string, unknown> = {}) {
  const id = uniqueSuffix();
  return {
    vehicleId,
    contact: {
      name: `Shop Buyer ${id}`, email: `Shop.Buyer.${id}@Example.com`, phone: `+1587${randomDigits(7)}`,
      homeAddress: '9 Buyer Lane, Calgary, AB',
    },
    message: 'Is it still available?',
    ...overrides,
  };
}

async function listVehicle(api: Api, v: Vehicle) {
  test.skip((await publishAd(api, v)) === 502, 'AI provider unavailable during check');
}

test('SHOP-01: the inventory is public, names the dealership and 404s for an unknown dealer', async ({ request, staffApi }) => {
  const dealerId = await dealerIdOf(staffApi);
  const inv = await inventory(request, dealerId);
  expect(inv).toMatchObject({ dealerId, legalName: dealer.legalName, contactPhone: dealer.contactPhone });
  expect(Array.isArray(inv.vehicles)).toBe(true);
  expect((await request.get(publicUrl(999_999_999, 'inventory'))).status()).toBe(404);
});

test('SHOP-02: a vehicle without a ready ad is not public', async ({ request, staffApi }) => {
  const dealerId = await dealerIdOf(staffApi);
  const v = await staffApi.createVehicle();
  await staffApi.saveListing(v.id, { title: 'Draft only', body: 'Draft only', adKind: 'CASH', medium: 'ONLINE' });

  expect((await inventory(request, dealerId)).vehicles.map((x) => x.vehicleId)).not.toContain(v.id);
  expect((await request.get(publicUrl(dealerId, `vehicles/${v.id}/photo`))).status()).toBe(404);
  const res = await request.post(publicUrl(dealerId, 'inquiries'), { data: inquiry(v.id) });
  expect(res.status(), await res.text()).toBe(404);
});

test('SHOP-04: an invalid inquiry is rejected field by field', async ({ request, staffApi }) => {
  const dealerId = await dealerIdOf(staffApi);
  const res = await request.post(publicUrl(dealerId, 'inquiries'), {
    data: { vehicleId: 1, contact: { name: '', email: 'x', phone: '1', homeAddress: '' }, message: '' },
  });
  const text = await res.text();
  expect(res.status(), text).toBe(400);
  const errors = JSON.parse(text).fieldErrors ?? {};
  for (const key of ['contact.name', 'contact.email', 'contact.phone', 'message']) expect(errors[key], text).toBeTruthy();
});

test.describe('with the real AI', () => {
  test('SHOP-01 / SHOP-03 / SHOP-05: a ready ad is listed with public fields only, leaves when sold or edited', async ({
    request, staffApi, rivalApi,
  }) => {
    test.skip(!(await aiAvailable(request)), 'AI service is not UP');
    const dealerId = await dealerIdOf(staffApi);
    const v = await staffApi.createVehicle({ mileageKm: 30500, exteriorColor: 'White', fuelType: 'GASOLINE', purchaseCost: 13579 });
    await listVehicle(staffApi, v);

    const inv = await inventory(request, dealerId);
    const listed = inv.vehicles.find((x) => x.vehicleId === v.id);
    expect(listed).toMatchObject({ make: v.make, model: v.model, mileageKm: 30500, exteriorColor: 'White', fuelType: 'GASOLINE', hasPhoto: false });
    // SHOP-03: internal fields never leave the dealership.
    const raw = JSON.stringify(listed);
    expect(raw).not.toContain(v.vin);
    expect(raw).not.toContain('13579');
    expect(Object.keys(listed!)).not.toEqual(expect.arrayContaining(['purchaseCost']));
    expect((await request.get(publicUrl(dealerId, `vehicles/${v.id}/photo`))).status()).toBe(404);

    // Another dealership's buyer site does not show it.
    const rivalId = await dealerIdOf(rivalApi);
    expect((await inventory(request, rivalId)).vehicles.map((x) => x.vehicleId)).not.toContain(v.id);
    const cross = await request.post(publicUrl(rivalId, 'inquiries'), { data: inquiry(v.id) });
    expect(cross.status(), await cross.text()).toBe(404);

    // SHOP-05: editing the ad sends it back to draft and off the site.
    const current = await staffApi.getListing(v.id);
    await staffApi.saveListing(v.id, { title: current.title, body: `${current.body} Edited.`, adKind: 'CASH', medium: 'ONLINE' });
    expect((await inventory(request, dealerId)).vehicles.map((x) => x.vehicleId)).not.toContain(v.id);

    // A sold vehicle stays off the site even with a ready ad.
    const sold = await staffApi.createVehicle();
    await listVehicle(staffApi, sold);
    expect((await inventory(request, dealerId)).vehicles.map((x) => x.vehicleId)).toContain(sold.id);
    await staffApi.sellVehicle(await staffApi.getVehicle(sold.id));
    expect((await inventory(request, dealerId)).vehicles.map((x) => x.vehicleId)).not.toContain(sold.id);
  });

  test('SHOP-04: an inquiry creates a NEW lead with the message; a repeat phone reuses the customer', async ({
    request, staffApi,
  }) => {
    test.skip(!(await aiAvailable(request)), 'AI service is not UP');
    const dealerId = await dealerIdOf(staffApi);
    const v = await staffApi.createVehicle();
    await listVehicle(staffApi, v);

    const first = inquiry(v.id);
    await expectStatus(await request.post(publicUrl(dealerId, 'inquiries'), { data: first }), 204);

    const leads = await staffApi.get('/api/v1/leads', { q: first.contact.name });
    await expectStatus(leads, 200);
    const page = (await leads.json()) as { items: { id: number; stage: string; customerId: number }[] };
    expect(page.items).toHaveLength(1);
    expect(page.items[0].stage).toBe('NEW');

    const detail = await staffApi.get(`/api/v1/leads/${page.items[0].id}`);
    expect(JSON.stringify(await detail.json())).toContain('Is it still available?');

    const customer = await staffApi.get(`/api/v1/customers/${page.items[0].customerId}`);
    expect(((await customer.json()) as { email: string }).email).toBe(first.contact.email.toLowerCase());

    // The audit names the buyer site and records contact values (AUD-04).
    const audit = await staffApi.get('/api/v1/audit', { entityType: 'CUSTOMER', entityId: page.items[0].customerId });
    const created = ((await audit.json()) as { items: { actorUsername: string; fieldSummary: Record<string, unknown> }[] }).items[0];
    expect(created.actorUsername).toBe('buyer-site');
    expect(created.fieldSummary.email).toBe(first.contact.email.toLowerCase());

    const repeat = inquiry(v.id, { message: 'Second question' });
    repeat.contact.phone = first.contact.phone;
    await expectStatus(await request.post(publicUrl(dealerId, 'inquiries'), { data: repeat }), 204);
    const again = (await (await staffApi.get('/api/v1/leads', { q: first.contact.name })).json()) as { items: { customerId: number }[] };
    expect(again.items).toHaveLength(2);
    expect(new Set(again.items.map((l) => l.customerId)).size).toBe(1);
  });
});
