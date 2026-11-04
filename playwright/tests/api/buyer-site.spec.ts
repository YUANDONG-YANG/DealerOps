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

type InboxMessage = { id: number; kind: string; payload: { leadId?: string }; resolvedAt: string | null };

/** The dealership's unresolved inbox messages about one lead. */
async function inquiryMessages(api: Api, leadId: number) {
  const res = await api.get('/api/v1/dealer/notifications');
  await expectStatus(res, 200);
  return ((await res.json()) as InboxMessage[])
    .filter((n) => n.kind === 'BUYER_INQUIRY' && n.payload.leadId === String(leadId));
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

  test('SHOP-04 / CR-051: an inquiry creates a NEW lead with the message; a repeat on the same vehicle becomes a note on that lead', async ({
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

    // CR-051: the same buyer asking again about the same vehicle must not fail and must not open a
    // second lead; the question is added as a note on the lead that is already open.
    const repeat = inquiry(v.id, { message: 'Second question' });
    repeat.contact.phone = first.contact.phone;
    repeat.contact.email = first.contact.email;
    await expectStatus(await request.post(publicUrl(dealerId, 'inquiries'), { data: repeat }), 204);
    const again = (await (await staffApi.get('/api/v1/leads', { q: first.contact.name })).json()) as {
      items: { id: number; customerId: number }[];
    };
    expect(again.items).toHaveLength(1);
    expect(again.items[0].id).toBe(page.items[0].id);
    expect(again.items[0].customerId).toBe(page.items[0].customerId);

    const reread = (await (await staffApi.get(`/api/v1/leads/${page.items[0].id}`)).json()) as {
      notes: { body: string }[];
    };
    expect(reread.notes).toHaveLength(2);
    const bodies = reread.notes.map((n) => n.body).join('\n');
    expect(bodies).toContain('Is it still available?');
    expect(bodies).toContain('Second question');

    // A different vehicle is still a separate lead for the same buyer.
    const other = await staffApi.createVehicle();
    await listVehicle(staffApi, other);
    const onOther = inquiry(other.id, { message: 'Third question' });
    onOther.contact.phone = first.contact.phone;
    onOther.contact.email = first.contact.email;
    await expectStatus(await request.post(publicUrl(dealerId, 'inquiries'), { data: onOther }), 204);
    const both = (await (await staffApi.get('/api/v1/leads', { q: first.contact.name })).json()) as {
      items: { id: number; customerId: number }[];
    };
    expect(both.items).toHaveLength(2);
    expect(new Set(both.items.map((l) => l.customerId)).size).toBe(1);
  });
  test('CR-051 / D1: a returning shopper with a new email keeps one lead, one customer and one inbox message', async ({
    request, staffApi,
  }) => {
    test.skip(!(await aiAvailable(request)), 'AI service is not UP');
    const dealerId = await dealerIdOf(staffApi);
    const v = await staffApi.createVehicle();
    await listVehicle(staffApi, v);

    const first = inquiry(v.id);
    await expectStatus(await request.post(publicUrl(dealerId, 'inquiries'), { data: first }), 204);
    const opened = (await (await staffApi.get('/api/v1/leads', { q: first.contact.name })).json()) as {
      items: { id: number; customerId: number; stage: string }[];
    };
    expect(opened.items).toHaveLength(1);
    const lead = opened.items[0];
    expect(lead.stage).toBe('NEW');
    // A created lead is announced once in the dealership inbox, where taking the lead resolves it.
    expect(await inquiryMessages(staffApi, lead.id)).toHaveLength(1);

    // D1: the buyer is matched on phone AND name, never on the email, so a shopper who types a
    // different address the second time is still the same customer on the same open lead.
    const repeat = inquiry(v.id, { message: 'Do you still have it?' });
    repeat.contact.name = first.contact.name;
    repeat.contact.phone = first.contact.phone;
    expect(repeat.contact.email).not.toBe(first.contact.email);
    await expectStatus(await request.post(publicUrl(dealerId, 'inquiries'), { data: repeat }), 204);

    const after = (await (await staffApi.get('/api/v1/leads', { q: first.contact.name })).json()) as {
      items: { id: number; customerId: number }[];
    };
    expect(after.items.map((l) => l.id)).toEqual([lead.id]);

    const reread = (await (await staffApi.get(`/api/v1/leads/${lead.id}`)).json()) as { notes: { body: string }[] };
    expect(reread.notes).toHaveLength(2);
    expect(reread.notes.map((n) => n.body).join('\n')).toContain('Do you still have it?');

    // The newly typed address does not overwrite the customer the dealership already has.
    const customer = (await (await staffApi.get(`/api/v1/customers/${lead.customerId}`)).json()) as { email: string };
    expect(customer.email).toBe(first.contact.email.toLowerCase());

    // The note joins the message already in the inbox: a second BUYER_INQUIRY on a lead that is
    // already taken would never be resolved and would sit in the inbox for good.
    expect(await inquiryMessages(staffApi, lead.id)).toHaveLength(1);

    // D1 the other way round: households share a phone, so the same number under another name is
    // a separate customer with its own lead and its own inbox message.
    const partner = inquiry(v.id, { message: 'My partner asked about this one too.' });
    partner.contact.phone = first.contact.phone;
    await expectStatus(await request.post(publicUrl(dealerId, 'inquiries'), { data: partner }), 204);
    const partnerLeads = (await (await staffApi.get('/api/v1/leads', { q: partner.contact.name })).json()) as {
      items: { id: number; customerId: number }[];
    };
    expect(partnerLeads.items).toHaveLength(1);
    expect(partnerLeads.items[0].id).not.toBe(lead.id);
    expect(partnerLeads.items[0].customerId).not.toBe(lead.customerId);
    expect(await inquiryMessages(staffApi, partnerLeads.items[0].id)).toHaveLength(1);
  });
});
