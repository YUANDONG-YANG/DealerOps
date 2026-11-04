import { test, expect } from '../../support/fixtures';
import { customerBody, expectError, expectStatus, today, uniqueSuffix, type Api, type Vehicle } from '../../support/api';
import { env } from '../../support/env';

// Lead follow-up: design/21-Feature-Extensions.md §3 (LEAD-01..09) and
// design/14-Backend-API-Contract.md §5.5, §9 (audit), §1.3 (tenant rules).
// The 2026-11-03 change request adds L2 (vehicle search), L4 (reopen), L5 (no duplicate open
// lead), L6 (a sale closes the related leads) and CR-012 (a server-side list sort).

type LeadNote = { id: number; authorUsername: string; body: string; createdAt: string };
type LeadVehicle = { id: number; vin: string; modelYear: number; make: string; model: string; status: string };
type LeadRow = {
  id: number; customerId: number; customerName: string; vehicle: LeadVehicle | null; stage: string;
  ownerUsername: string | null; nextFollowUpOn: string | null; overdue: boolean; version: number;
};
type LeadDetail = LeadRow & { lostReason: string | null; notes: LeadNote[]; createdAt: string };
type Page<T> = { items: T[]; page: number; size: number; totalElements: number };
type AuditRow = {
  id: number; entityType: string; entityId: number; action: string;
  fieldSummary: Record<string, unknown>; actorUsername: string; createdAt: string;
};

const LEADS = '/api/v1/leads';

// The API omits null properties (WhenWritingNull), so absent nullable fields read as null here.
function normalize<T extends Partial<LeadDetail>>(raw: T): T {
  const out = { ...raw } as Record<string, unknown>;
  for (const key of ['vehicle', 'ownerUsername', 'nextFollowUpOn']) out[key] = out[key] ?? null;
  if ('notes' in out) out.lostReason = out.lostReason ?? null;
  return out as T;
}

function isoDate(offsetDays: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function createLead(api: Api, body: Record<string, unknown>) {
  const res = await api.post(LEADS, body);
  await expectStatus(res, 201);
  return normalize((await res.json()) as LeadDetail);
}

async function getLead(api: Api, id: number) {
  const res = await api.get(`${LEADS}/${id}`);
  await expectStatus(res, 200);
  return normalize((await res.json()) as LeadDetail);
}

/** Full editable state (PATCH is a full replacement); overrides change single fields. */
function patchBody(lead: LeadDetail, overrides: Record<string, unknown> = {}) {
  return {
    stage: lead.stage,
    ownerUsername: lead.ownerUsername,
    nextFollowUpOn: lead.nextFollowUpOn,
    vehicleId: lead.vehicle?.id ?? null,
    lostReason: lead.lostReason,
    version: lead.version,
    ...overrides,
  };
}

async function patchLead(api: Api, lead: LeadDetail, overrides: Record<string, unknown>) {
  const res = await api.patch(`${LEADS}/${lead.id}`, patchBody(lead, overrides));
  await expectStatus(res, 200);
  return normalize((await res.json()) as LeadDetail);
}

async function listLeads(api: Api, params: Record<string, string | number>) {
  const res = await api.get(LEADS, params);
  await expectStatus(res, 200);
  const page = (await res.json()) as Page<LeadRow>;
  return { ...page, items: page.items.map((row) => normalize(row)) };
}

/**
 * Sells a vehicle. A sale needs a buyer since the 2026-11-03 change request (D8): either a CRM
 * customer or "Other" with a typed name, so the shared `Api.sellVehicle` helper cannot be used.
 */
async function sell(api: Api, v: Vehicle, buyer: { customerId?: number; buyerName?: string } = {}) {
  const res = await api.post(`/api/v1/vehicles/${v.id}/sell`, {
    soldOn: today(),
    soldPrice: 18900,
    version: v.version,
    buyerCustomerId: buyer.customerId ?? null,
    buyerName: buyer.customerId == null ? (buyer.buyerName ?? 'Walk-in buyer') : null,
  });
  await expectStatus(res, 200);
  return (await res.json()) as Vehicle;
}

async function reopenLead(api: Api, lead: LeadDetail, stage: string) {
  const res = await api.post(`${LEADS}/${lead.id}/reopen`, { stage, version: lead.version });
  await expectStatus(res, 200);
  return normalize((await res.json()) as LeadDetail);
}

async function leadAudit(api: Api, leadId: number) {
  const res = await api.get('/api/v1/audit', { entityType: 'LEAD', entityId: leadId });
  await expectStatus(res, 200);
  return (await res.json()) as Page<AuditRow>;
}

test('LEAD-01: create a lead for an existing customer; stage starts NEW with the first note', async ({ staffApi }) => {
  const customer = await staffApi.createCustomer();
  const vehicle = await staffApi.createVehicle();
  const lead = await createLead(staffApi, {
    customerId: customer.id,
    vehicleId: vehicle.id,
    ownerUsername: env.staff2.username,
    nextFollowUpOn: isoDate(3),
    note: 'Wants a test drive on Saturday',
  });

  expect(lead).toMatchObject({
    customerId: customer.id,
    customerName: customer.name,
    stage: 'NEW',
    ownerUsername: env.staff2.username,
    nextFollowUpOn: isoDate(3),
    overdue: false,
    lostReason: null,
  });
  expect(lead.vehicle).toMatchObject({
    id: vehicle.id, vin: vehicle.vin, make: vehicle.make, model: vehicle.model,
    modelYear: vehicle.modelYear, status: 'IN_STOCK',
  });
  expect(lead.notes).toHaveLength(1);
  expect(lead.notes[0]).toMatchObject({ authorUsername: env.staff.username, body: 'Wants a test drive on Saturday' });
  expect(typeof lead.version).toBe('number');
  expect(lead.createdAt).toBeTruthy();

  const reread = await getLead(staffApi, lead.id);
  expect(reread).toMatchObject({ id: lead.id, customerId: customer.id, stage: 'NEW' });
});

test('LEAD-01: create a new customer and the lead in one request; the customer appears in CRM', async ({
  staffApi,
}) => {
  const newCustomer = customerBody();
  const lead = await createLead(staffApi, { newCustomer });
  expect(lead.stage).toBe('NEW');
  expect(lead.customerName).toBe(newCustomer.name);
  expect(lead.vehicle).toBeNull();
  expect(lead.ownerUsername).toBeNull();
  expect(lead.notes).toEqual([]);

  const customerRes = await staffApi.get(`/api/v1/customers/${lead.customerId}`);
  await expectStatus(customerRes, 200);
  expect(await customerRes.json()).toMatchObject({ name: newCustomer.name, email: newCustomer.email });
});

test('LEAD-01: an invalid new customer rolls back the whole request', async ({ staffApi }) => {
  const name = `E2E Rollback ${uniqueSuffix()}`;
  const res = await staffApi.post(LEADS, { newCustomer: customerBody({ name, email: 'not-an-email' }) });
  await expectError(res, 400, 'VALIDATION');
  const customers = await (await staffApi.get('/api/v1/customers', { q: name })).json();
  expect(customers.totalElements).toBe(0);
  expect((await listLeads(staffApi, { q: name })).totalElements).toBe(0);
});

test('LEAD-01: exactly one customer source is required (both or neither → 400 VALIDATION)', async ({ staffApi }) => {
  const customer = await staffApi.createCustomer();
  const name = `E2E Both ${uniqueSuffix()}`;
  await expectError(
    await staffApi.post(LEADS, { customerId: customer.id, newCustomer: customerBody({ name }) }), 400, 'VALIDATION');
  await expectError(await staffApi.post(LEADS, { note: 'no customer at all' }), 400, 'VALIDATION');
  await expectError(await staffApi.post(LEADS, { customerId: null, newCustomer: null }), 400, 'VALIDATION');

  // The rejected "both" request must not have created the new customer.
  const customers = await (await staffApi.get('/api/v1/customers', { q: name })).json();
  expect(customers.totalElements).toBe(0);
});

test('LEAD-04: owner must be an active member of this dealership (else 400 VALIDATION)', async ({ staffApi }) => {
  const customer = await staffApi.createCustomer();
  // A member of another dealership and an unknown username are both rejected.
  for (const ownerUsername of [env.rival.username, `nobody.${uniqueSuffix()}`]) {
    await expectError(await staffApi.post(LEADS, { customerId: customer.id, ownerUsername }), 400, 'VALIDATION');
  }

  const lead = await createLead(staffApi, { customerId: customer.id });
  await expectError(
    await staffApi.patch(`${LEADS}/${lead.id}`, patchBody(lead, { ownerUsername: env.rival.username })),
    400, 'VALIDATION');

  const assigned = await patchLead(staffApi, lead, { ownerUsername: env.staff2.username });
  expect(assigned.ownerUsername).toBe(env.staff2.username);
  const cleared = await patchLead(staffApi, assigned, { ownerUsername: null });
  expect(cleared.ownerUsername).toBeNull();
});

test('LEAD-02: the vehicle must be IN_STOCK in this dealership (else 400 WRONG_DEALER_OR_SOLD)', async ({
  staffApi, rivalApi,
}) => {
  const customer = await staffApi.createCustomer();
  const sold = await sell(staffApi, await staffApi.createVehicle());
  const rivalVehicle = await rivalApi.createVehicle();

  await expectError(
    await staffApi.post(LEADS, { customerId: customer.id, vehicleId: sold.id }), 400, 'WRONG_DEALER_OR_SOLD');
  await expectError(
    await staffApi.post(LEADS, { customerId: customer.id, vehicleId: rivalVehicle.id }), 400, 'WRONG_DEALER_OR_SOLD');

  const lead = await createLead(staffApi, { customerId: customer.id });
  for (const vehicleId of [sold.id, rivalVehicle.id]) {
    await expectError(
      await staffApi.patch(`${LEADS}/${lead.id}`, patchBody(lead, { vehicleId })), 400, 'WRONG_DEALER_OR_SOLD');
  }

  const inStock = await staffApi.createVehicle();
  const withVehicle = await patchLead(staffApi, lead, { vehicleId: inStock.id });
  expect(withVehicle.vehicle?.id).toBe(inStock.id);
  const cleared = await patchLead(staffApi, withVehicle, { vehicleId: null });
  expect(cleared.vehicle).toBeNull();
});

test('LEAD-02: WON does not sell or link the vehicle; a later sale keeps the lead vehicle readable', async ({
  staffApi,
}) => {
  const customer = await staffApi.createCustomer();
  const vehicle = await staffApi.createVehicle();
  const lead = await createLead(staffApi, { customerId: customer.id, vehicleId: vehicle.id });
  const won = await patchLead(staffApi, lead, { stage: 'WON' });
  expect(won.stage).toBe('WON');

  const v = await staffApi.getVehicle(vehicle.id);
  expect(v.status).toBe('IN_STOCK');
  expect(v.linkedCustomer ?? null).toBeNull();

  await sell(staffApi, v);
  const after = await getLead(staffApi, lead.id);
  expect(after.vehicle).toMatchObject({ id: vehicle.id, status: 'SOLD' });
});

test('LEAD-03: any open stage may be chosen; LOST requires a reason; WON/LOST are final (409 LEAD_CLOSED)', async ({
  staffApi,
}) => {
  const customer = await staffApi.createCustomer();
  let lead = await createLead(staffApi, { customerId: customer.id });

  // Open stages can move in any order, including backwards.
  for (const stage of ['QUALIFIED', 'CONTACTED', 'NEW', 'QUALIFIED']) {
    lead = await patchLead(staffApi, lead, { stage });
    expect(lead.stage).toBe(stage);
  }

  // lostReason is cleared for stages other than LOST.
  lead = await patchLead(staffApi, lead, { stage: 'CONTACTED', lostReason: 'should be dropped' });
  expect(lead.lostReason).toBeNull();

  for (const lostReason of [null, '', '   ']) {
    await expectError(
      await staffApi.patch(`${LEADS}/${lead.id}`, patchBody(lead, { stage: 'LOST', lostReason })), 400, 'VALIDATION');
  }
  expect((await getLead(staffApi, lead.id)).stage).toBe('CONTACTED');

  const lost = await patchLead(staffApi, lead, { stage: 'LOST', lostReason: 'Bought elsewhere' });
  expect(lost).toMatchObject({ stage: 'LOST', lostReason: 'Bought elsewhere' });

  // Any change to a final lead, even reopening it, is rejected with the current version.
  for (const overrides of [
    { stage: 'NEW', lostReason: null },
    { ownerUsername: env.staff2.username },
    { nextFollowUpOn: isoDate(5) },
    { lostReason: 'Changed reason' },
  ]) {
    await expectError(
      await staffApi.patch(`${LEADS}/${lead.id}`, patchBody(lost, overrides)), 409, 'LEAD_CLOSED');
  }
  expect(await getLead(staffApi, lead.id)).toMatchObject({ stage: 'LOST', lostReason: 'Bought elsewhere' });

  const won = await patchLead(staffApi, await createLead(staffApi, { customerId: customer.id }), { stage: 'WON' });
  await expectError(
    await staffApi.patch(`${LEADS}/${won.id}`, patchBody(won, { stage: 'QUALIFIED' })), 409, 'LEAD_CLOSED');
});

test('LEAD-03: unknown stage values are rejected', async ({ staffApi }) => {
  const lead = await createLead(staffApi, { customerId: (await staffApi.createCustomer()).id });
  const res = await staffApi.patch(`${LEADS}/${lead.id}`, patchBody(lead, { stage: 'ARCHIVED' }));
  expect(res.status(), await res.text()).toBe(400);
});

test('LEAD-03: a stale version is rejected with 409 VERSION_CONFLICT', async ({ staffApi, staff2Api }) => {
  const lead = await createLead(staffApi, { customerId: (await staffApi.createCustomer()).id });
  const updated = await patchLead(staff2Api, lead, { stage: 'CONTACTED' });
  expect(updated.version).not.toBe(lead.version);

  await expectError(
    await staffApi.patch(`${LEADS}/${lead.id}`, patchBody(lead, { stage: 'QUALIFIED' })), 409, 'VERSION_CONFLICT');
  expect((await getLead(staffApi, lead.id)).stage).toBe('CONTACTED');
});

test('LEAD-07: notes are append-only, newest first, with author and time; closed leads accept notes', async ({
  staffApi, staff2Api,
}) => {
  const lead = await createLead(staffApi, { customerId: (await staffApi.createCustomer()).id, note: 'first' });

  const res = await staff2Api.post(`${LEADS}/${lead.id}/notes`, { body: '  second  ' });
  await expectStatus(res, 201);
  const second = (await res.json()) as LeadNote;
  expect(second).toMatchObject({ authorUsername: env.staff2.username, body: 'second' });
  expect(Number.isNaN(Date.parse(second.createdAt))).toBe(false);

  const lost = await patchLead(staffApi, await getLead(staffApi, lead.id), { stage: 'LOST', lostReason: 'No budget' });
  await expectStatus(await staffApi.post(`${LEADS}/${lead.id}/notes`, { body: 'third, after closing' }), 201);

  const detail = await getLead(staffApi, lost.id);
  expect(detail.notes.map((n) => n.body)).toEqual(['third, after closing', 'second', 'first']);
  expect(detail.notes.map((n) => n.authorUsername)).toEqual([env.staff.username, env.staff2.username, env.staff.username]);

  // Body length is 1..2000.
  for (const body of ['', '   ', 'x'.repeat(2001)]) {
    await expectError(await staffApi.post(`${LEADS}/${lead.id}/notes`, { body }), 400, 'VALIDATION');
  }
  await expectStatus(await staffApi.post(`${LEADS}/${lead.id}/notes`, { body: 'y'.repeat(2000) }), 201);

  // There is no edit or delete route for notes.
  const noteUrl = `${LEADS}/${lead.id}/notes/${second.id}`;
  for (const res of [await staffApi.patch(noteUrl, { body: 'edited' }), await staffApi.delete(noteUrl)]) {
    expect(res.status(), `${res.url()} → ${await res.text()}`).toBeGreaterThanOrEqual(400);
  }
  const after = await getLead(staffApi, lead.id);
  expect(after.notes.find((n) => n.id === second.id)?.body).toBe('second');
  expect(after.notes).toHaveLength(4);
});

test('LEAD-05: list rows, newest first, 10 per page, and filters by q, stage, owner and customerId', async ({
  staffApi,
}) => {
  const tag = `E2E Lead ${uniqueSuffix()}`;
  const customer = await staffApi.createCustomer({ name: tag });
  const vehicle = await staffApi.createVehicle();
  const created: LeadDetail[] = [];
  for (let i = 0; i < 12; i++) {
    created.push(await createLead(staffApi, {
      customerId: customer.id,
      ...(i === 0 ? { vehicleId: vehicle.id, ownerUsername: env.staff2.username, nextFollowUpOn: isoDate(2) } : {}),
    }));
  }
  const contacted = await patchLead(staffApi, created[1], { stage: 'CONTACTED' });

  const first = await listLeads(staffApi, { q: tag });
  expect(first).toMatchObject({ page: 0, size: 10, totalElements: 12 });
  expect(first.items).toHaveLength(10);
  const second = await listLeads(staffApi, { q: tag, page: 1 });
  expect(second.items).toHaveLength(2);
  const ids = [...first.items, ...second.items].map((r) => r.id);
  expect(ids).toEqual(created.map((l) => l.id).reverse());

  // The server caps size at 100 and echoes the values it used (contract §1.1).
  const capped = await listLeads(staffApi, { q: tag, size: 500 });
  expect.soft(capped.size, 'size is capped at 100 (contract §1.1)').toBe(100);
  expect.soft(capped.items, 'all 12 matching leads fit under the cap').toHaveLength(12);

  const row = second.items.find((r) => r.id === created[0].id)!;
  expect(row).toEqual({
    id: created[0].id,
    customerId: customer.id,
    customerName: tag,
    vehicle: { id: vehicle.id, vin: vehicle.vin, modelYear: vehicle.modelYear, make: vehicle.make, model: vehicle.model, status: 'IN_STOCK' },
    stage: 'NEW',
    ownerUsername: env.staff2.username,
    nextFollowUpOn: isoDate(2),
    overdue: false,
    version: created[0].version,
  });

  const byStage = await listLeads(staffApi, { q: tag, stage: 'CONTACTED' });
  expect(byStage.items.map((r) => r.id)).toEqual([contacted.id]);

  const byOwner = await listLeads(staffApi, { q: tag, owner: env.staff2.username });
  expect(byOwner.items.map((r) => r.id)).toEqual([created[0].id]);

  const byCustomer = await listLeads(staffApi, { customerId: customer.id });
  expect(byCustomer.totalElements).toBe(12);
  expect(byCustomer.items.every((r) => r.customerId === customer.id)).toBe(true);
});

test('LEAD-06: overdue means an open stage with nextFollowUpOn before today', async ({ staffApi }) => {
  const tag = `E2E Overdue ${uniqueSuffix()}`;
  const customer = await staffApi.createCustomer({ name: tag });
  const past = await createLead(staffApi, { customerId: customer.id, nextFollowUpOn: isoDate(-3) });
  const future = await createLead(staffApi, { customerId: customer.id, nextFollowUpOn: isoDate(5) });
  const noDate = await createLead(staffApi, { customerId: customer.id });
  const closed = await patchLead(
    staffApi, await createLead(staffApi, { customerId: customer.id, nextFollowUpOn: isoDate(-3) }),
    { stage: 'LOST', lostReason: 'Went quiet' });

  expect(past.overdue).toBe(true);
  expect(future.overdue).toBe(false);
  expect(noDate.overdue).toBe(false);
  expect(closed.overdue).toBe(false);

  const overdue = await listLeads(staffApi, { q: tag, overdue: 'true' });
  expect(overdue.items.map((r) => r.id)).toEqual([past.id]);
  expect(overdue.items[0].overdue).toBe(true);
});

test('LEAD-05 / tenancy: another dealership cannot see or touch a lead or use its customer (404)', async ({
  staffApi, rivalApi,
}) => {
  const tag = `E2E Isolated ${uniqueSuffix()}`;
  const customer = await staffApi.createCustomer({ name: tag });
  const lead = await createLead(staffApi, { customerId: customer.id, note: 'private' });

  await expectError(await rivalApi.get(`${LEADS}/${lead.id}`), 404, 'NOT_FOUND');
  await expectError(await rivalApi.patch(`${LEADS}/${lead.id}`, patchBody(lead, { stage: 'CONTACTED' })), 404, 'NOT_FOUND');
  await expectError(await rivalApi.post(`${LEADS}/${lead.id}/notes`, { body: 'intrusion' }), 404, 'NOT_FOUND');
  await expectError(await rivalApi.post(LEADS, { customerId: customer.id }), 404, 'NOT_FOUND');
  await expectError(
    await rivalApi.get('/api/v1/audit', { entityType: 'LEAD', entityId: lead.id }), 404, 'NOT_FOUND');

  expect((await listLeads(rivalApi, { q: tag })).totalElements).toBe(0);
  expect((await listLeads(rivalApi, { customerId: customer.id })).totalElements).toBe(0);

  const after = await getLead(staffApi, lead.id);
  expect(after).toMatchObject({ stage: 'NEW', version: lead.version });
  expect(after.notes.map((n) => n.body)).toEqual(['private']);

  await expectError(await staffApi.get(`${LEADS}/999999999`), 404, 'NOT_FOUND');
});

test('LEAD API: the platform admin is forbidden (403)', async ({ adminApi, staffApi }) => {
  const lead = await createLead(staffApi, { customerId: (await staffApi.createCustomer()).id });
  await expectError(await adminApi.get(LEADS), 403, 'FORBIDDEN');
  await expectError(await adminApi.get(`${LEADS}/${lead.id}`), 403, 'FORBIDDEN');
  await expectError(await adminApi.post(LEADS, { newCustomer: customerBody() }), 403, 'FORBIDDEN');
  await expectError(await adminApi.patch(`${LEADS}/${lead.id}`, patchBody(lead, { stage: 'CONTACTED' })), 403, 'FORBIDDEN');
  await expectError(await adminApi.post(`${LEADS}/${lead.id}/notes`, { body: 'admin' }), 403, 'FORBIDDEN');
  await expectError(await adminApi.get('/api/v1/members'), 403, 'FORBIDDEN');
});

test('LEAD-08: create, updates and notes are audited as LEAD without copying note text', async ({ staffApi }) => {
  const customer = await staffApi.createCustomer();
  const vehicle = await staffApi.createVehicle();
  const secret = `secret-note-${uniqueSuffix()}`;
  const lead = await createLead(staffApi, { customerId: customer.id, vehicleId: vehicle.id, note: secret });
  const updated = await patchLead(staffApi, lead, {
    stage: 'QUALIFIED', ownerUsername: env.staff2.username, nextFollowUpOn: isoDate(4),
  });
  const noteRes = await staffApi.post(`${LEADS}/${lead.id}/notes`, { body: `${secret}-2` });
  await expectStatus(noteRes, 201);
  const note = (await noteRes.json()) as LeadNote;
  await patchLead(staffApi, updated, { stage: 'LOST', lostReason: 'Price too high' });

  const audit = await leadAudit(staffApi, lead.id);
  const rows = audit.items;
  expect(rows.every((r) => r.entityType === 'LEAD' && r.entityId === lead.id)).toBe(true);
  expect(rows.every((r) => r.actorUsername === env.staff.username)).toBe(true);
  expect(rows.map((r) => r.action)).toEqual(['UPDATE', 'NOTE', 'UPDATE', 'NOTE', 'CREATE']);

  const create = rows.find((r) => r.action === 'CREATE')!;
  expect(create.fieldSummary).toMatchObject({ customerId: customer.id, vehicleId: vehicle.id });
  expect.soft(create.fieldSummary.stage, 'audit stage uses the API enum spelling').toBe('NEW');

  const firstUpdate = rows[2];
  expect(Object.keys(firstUpdate.fieldSummary).sort()).toEqual(['nextFollowUpOn', 'ownerUsername', 'stage']);
  expect.soft(firstUpdate.fieldSummary.stage, 'audit stage uses the API enum spelling').toBe('QUALIFIED');

  const notes = rows.filter((r) => r.action === 'NOTE');
  expect(notes.map((r) => Object.keys(r.fieldSummary))).toEqual([['noteId'], ['noteId']]);
  expect(notes[0].fieldSummary.noteId).toBe(note.id);

  expect(JSON.stringify(audit)).not.toContain(secret);
  expect(JSON.stringify(audit)).not.toContain('Price too high');
});

test('LEAD-08: a PATCH that changes nothing writes no UPDATE audit row', async ({ staffApi }) => {
  const lead = await createLead(staffApi, { customerId: (await staffApi.createCustomer()).id });
  await patchLead(staffApi, lead, {});
  const actions = (await leadAudit(staffApi, lead.id)).items.map((r) => r.action);
  expect(actions).toEqual(['CREATE']);
});

test('L2 / LEAD-05: the list filters by the vehicle name as shown and by VIN', async ({ staffApi }) => {
  const tag = `E2E Vehicle Filter ${uniqueSuffix()}`;
  const customer = await staffApi.createCustomer({ name: tag });
  const model = `Mdl${uniqueSuffix()}`.slice(0, 18);
  const wanted = await staffApi.createVehicle({ make: 'Subaru', model, modelYear: 2022 });
  const other = await staffApi.createVehicle({ make: 'Kia', model: `Oth${uniqueSuffix()}`.slice(0, 18) });
  const withWanted = await createLead(staffApi, { customerId: customer.id, vehicleId: wanted.id });
  await createLead(staffApi, { customerId: customer.id, vehicleId: other.id });
  await createLead(staffApi, { customerId: customer.id });

  // "year make model" as the Vehicle of interest column renders it, plus the VIN; both substrings.
  for (const vehicle of [model, model.toLowerCase(), 'Subaru', '2022 Subaru', wanted.vin, wanted.vin.slice(3, 12)]) {
    const found = await listLeads(staffApi, { q: tag, vehicle });
    expect(found.items.map((r) => r.id), `vehicle=${vehicle}`).toEqual([withWanted.id]);
  }

  // A lead without a vehicle never matches a vehicle search, and an unknown term matches nothing.
  expect((await listLeads(staffApi, { q: tag, vehicle: `none-${uniqueSuffix()}` })).totalElements).toBe(0);
  expect((await listLeads(staffApi, { q: tag })).totalElements).toBe(3);

  // vehicleId stays an exact filter alongside the name search.
  expect((await listLeads(staffApi, { vehicleId: wanted.id })).items.map((r) => r.id)).toEqual([withWanted.id]);
});

test('CR-012 / LEAD-05: sort=field,asc|desc orders every page, not only the loaded one', async ({ staffApi }) => {
  const tag = `E2E Lead Sort ${uniqueSuffix()}`;
  // Created C, A, B so the default newest-first order differs from every sorted order below.
  const cust: Record<string, number> = {};
  for (const letter of ['C', 'A', 'B']) cust[letter] = (await staffApi.createCustomer({ name: `${tag} ${letter}` })).id;
  const vehicles = {
    C: await staffApi.createVehicle({ make: 'Alfa', model: 'One', modelYear: 2019 }),
    A: await staffApi.createVehicle({ make: 'Zeta', model: 'Three', modelYear: 2021 }),
    B: await staffApi.createVehicle({ make: 'Mazda', model: 'Two', modelYear: 2020 }),
  };
  const lead: Record<string, LeadDetail> = {};
  lead.C = await createLead(staffApi, {
    customerId: cust.C, vehicleId: vehicles.C.id, ownerUsername: env.staff.username, nextFollowUpOn: isoDate(9),
  });
  lead.A = await createLead(staffApi, {
    customerId: cust.A, vehicleId: vehicles.A.id, ownerUsername: env.staff2.username, nextFollowUpOn: isoDate(1),
  });
  lead.B = await createLead(staffApi, {
    customerId: cust.B, vehicleId: vehicles.B.id, ownerUsername: env.staff2.username, nextFollowUpOn: isoDate(5),
  });
  await patchLead(staffApi, lead.B, { stage: 'CONTACTED' });
  await patchLead(staffApi, lead.C, { stage: 'QUALIFIED' });

  const ids = (letters: string[]) => letters.map((l) => lead[l].id);
  // No sort: newest first.
  expect((await listLeads(staffApi, { q: tag })).items.map((r) => r.id)).toEqual(ids(['B', 'A', 'C']));

  for (const [sort, expected] of [
    ['customerName,asc', ['A', 'B', 'C']],
    ['customerName,desc', ['C', 'B', 'A']],
    // "make model year", so Alfa One < Mazda Two < Zeta Three.
    ['vehicle,asc', ['C', 'B', 'A']],
    ['vehicle,desc', ['A', 'B', 'C']],
    // Pipeline order, not the stored text: New, Contacted, Qualified.
    ['stage,asc', ['A', 'B', 'C']],
    ['stage,desc', ['C', 'B', 'A']],
    ['nextFollowUpOn,asc', ['A', 'B', 'C']],
    ['nextFollowUpOn,desc', ['C', 'B', 'A']],
  ] as [string, string[]][]) {
    const sorted = await listLeads(staffApi, { q: tag, sort });
    expect(sorted.items.map((r) => r.id), sort).toEqual(ids(expected));

    // CR-012: the same order holds when the three rows are split over pages of one.
    const paged: number[] = [];
    for (let p = 0; p < 3; p++) paged.push(...(await listLeads(staffApi, { q: tag, sort, size: 1, page: p })).items.map((r) => r.id));
    expect(paged, `${sort} across pages`).toEqual(ids(expected));
  }

  // Owner sorts by username; equal usernames keep the newest-first order.
  const byOwner = await listLeads(staffApi, { q: tag, sort: 'ownerUsername,asc' });
  expect(byOwner.items.map((r) => r.ownerUsername))
    .toEqual([env.staff.username, env.staff2.username, env.staff2.username]);

  // An unknown field or direction is rejected and names the allowed values.
  for (const sort of ['customerId,asc', 'customerName,sideways', 'customerName,asc,extra']) {
    const res = await staffApi.get(LEADS, { q: tag, sort });
    const text = await res.text();
    expect(res.status(), `sort=${sort} → ${text}`).toBe(400);
    expect(JSON.parse(text).fieldErrors?.sort, text).toContain('customerName');
  }
});

test('CR-012 / LEAD-05: a blank sort key sorts last in both directions', async ({ staffApi }) => {
  // A plain ORDER BY would put the blanks first ascending; the list keeps them last either way,
  // as Paging.OrderByDirectionBlanksLast does for every nullable column.
  const tag = `E2E Lead Blank ${uniqueSuffix()}`;
  const customer = async (suffix: string) => (await staffApi.createCustomer({ name: `${tag} ${suffix}` })).id;
  const low = await staffApi.createVehicle({ make: 'Alfa', model: 'One', modelYear: 2019 });
  const mid = await staffApi.createVehicle({ make: 'Mazda', model: 'Two', modelYear: 2020 });
  const high = await staffApi.createVehicle({ make: 'Zeta', model: 'Three', modelYear: 2021 });

  // One lead per blank-capable column: the full row, a row missing the vehicle, a row with no
  // owner and a row with no follow-up date.
  const full = await createLead(staffApi, {
    customerId: await customer('full'), vehicleId: low.id,
    ownerUsername: env.staff.username, nextFollowUpOn: isoDate(2),
  });
  const noVehicle = await createLead(staffApi, {
    customerId: await customer('no vehicle'), ownerUsername: env.staff2.username, nextFollowUpOn: isoDate(6),
  });
  const noOwner = await createLead(staffApi, {
    customerId: await customer('no owner'), vehicleId: high.id, nextFollowUpOn: isoDate(9),
  });
  const noDate = await createLead(staffApi, {
    customerId: await customer('no date'), vehicleId: mid.id, ownerUsername: env.staff2.username,
  });

  const order = async (sort: string) => (await listLeads(staffApi, { q: tag, sort, size: 10 })).items.map((r) => r.id);
  const blankLast = async (field: string, blank: number, ascending: number[], descending: number[]) => {
    expect(await order(`${field},asc`), `${field},asc`).toEqual([...ascending, blank]);
    expect(await order(`${field},desc`), `${field},desc`).toEqual([...descending, blank]);
  };

  // Vehicle: "2019 Alfa One" < "2020 Mazda Two" < "2021 Zeta Three"; no vehicle is blank.
  await blankLast('vehicle', noVehicle.id,
    [full.id, noDate.id, noOwner.id], [noOwner.id, noDate.id, full.id]);
  // Owner: e2e.staff < e2e.staff2, and the unassigned lead is blank. The lead with no vehicle
  // also has an owner, so it sits between them in both directions.
  await blankLast('ownerUsername', noOwner.id,
    [full.id, noDate.id, noVehicle.id], [noDate.id, noVehicle.id, full.id]);
  // Follow-up: +2 < +6 < +9, and the lead with no date is blank.
  await blankLast('nextFollowUpOn', noDate.id,
    [full.id, noVehicle.id, noOwner.id], [noOwner.id, noVehicle.id, full.id]);

  // A closed lead shows no follow-up date, so its stored date sorts as blank as well, behind
  // every open lead in both directions.
  await patchLead(staffApi, noOwner, { stage: 'LOST', lostReason: 'Changed mind' });
  for (const dir of ['asc', 'desc']) {
    const ids = await order(`nextFollowUpOn,${dir}`);
    expect(ids.slice(0, 2), `open leads first (${dir})`)
      .toEqual(dir === 'asc' ? [full.id, noVehicle.id] : [noVehicle.id, full.id]);
    expect(ids.slice(2).sort(), `blank keys last (${dir})`).toEqual([noOwner.id, noDate.id].sort());
  }
});

test('L5 / CR-041: only one open lead per customer and vehicle (409 LEAD_DUPLICATE)', async ({ staffApi }) => {
  const customer = await staffApi.createCustomer();
  const vehicle = await staffApi.createVehicle();
  const otherVehicle = await staffApi.createVehicle();
  const otherCustomer = await staffApi.createCustomer();
  const open = await createLead(staffApi, { customerId: customer.id, vehicleId: vehicle.id });

  // Same pair again, on create and by moving another lead onto that vehicle.
  await expectError(
    await staffApi.post(LEADS, { customerId: customer.id, vehicleId: vehicle.id }), 409, 'LEAD_DUPLICATE');
  const movable = await createLead(staffApi, { customerId: customer.id, vehicleId: otherVehicle.id });
  await expectError(
    await staffApi.patch(`${LEADS}/${movable.id}`, patchBody(movable, { vehicleId: vehicle.id })),
    409, 'LEAD_DUPLICATE');

  // A different customer, a different vehicle and a lead with no vehicle at all are all fine.
  await expectStatus(await staffApi.post(LEADS, { customerId: otherCustomer.id, vehicleId: vehicle.id }), 201);
  await expectStatus(await staffApi.post(LEADS, { customerId: customer.id }), 201);
  await expectStatus(await staffApi.post(LEADS, { customerId: customer.id }), 201);

  // Closing the first lead frees the pair; a closed lead is never the duplicate.
  const lost = await patchLead(staffApi, open, { stage: 'LOST', lostReason: 'Changed mind' });
  const replacement = await createLead(staffApi, { customerId: customer.id, vehicleId: vehicle.id });
  expect(replacement.vehicle?.id).toBe(vehicle.id);

  // And reopening the closed one would recreate the duplicate, so it is refused (CR-041).
  await expectError(
    await staffApi.post(`${LEADS}/${lost.id}/reopen`, { stage: 'CONTACTED', version: lost.version }),
    409, 'LEAD_DUPLICATE');
  expect((await getLead(staffApi, lost.id)).stage).toBe('LOST');
  expect((await getLead(staffApi, replacement.id)).stage).toBe('NEW');
});

test('L4 / D7: a lost lead always reopens; the reopen clears the lost reason and is audited', async ({ staffApi }) => {
  const lead = await createLead(staffApi, { customerId: (await staffApi.createCustomer()).id, note: 'first call' });
  const lost = await patchLead(staffApi, lead, { stage: 'LOST', lostReason: 'Bought elsewhere' });

  let closed = lost;
  for (const stage of ['NEW', 'CONTACTED', 'QUALIFIED']) {
    const reopened = await reopenLead(staffApi, closed, stage);
    expect(reopened).toMatchObject({ stage, lostReason: null });
    // Notes survive a reopen, and the lead is editable again.
    expect(reopened.notes.map((n) => n.body)).toContain('first call');
    const edited = await patchLead(staffApi, reopened, { nextFollowUpOn: isoDate(4) });
    closed = await patchLead(staffApi, edited, { stage: 'LOST', lostReason: 'Went quiet' });
  }

  // The reopen is one UPDATE audit row carrying the new stage, so the funnel history counts it.
  const rows = (await leadAudit(staffApi, lead.id)).items;
  const reopens = rows.filter((r) => r.action === 'UPDATE' && r.fieldSummary.reopened === true);
  expect(reopens).toHaveLength(3);
  expect(reopens.map((r) => r.fieldSummary.stage)).toEqual(['QUALIFIED', 'CONTACTED', 'NEW']);
  expect(JSON.stringify(rows)).not.toContain('Bought elsewhere');
  expect(lost.lostReason).toBe('Bought elsewhere');
});

test('L4 / D7 / CR-041: a won lead reopens only with no vehicle, never once its vehicle left stock', async ({
  staffApi,
}) => {
  // Won with no vehicle at all: nothing contradicts the reopen.
  const noVehicle = await patchLead(
    staffApi, await createLead(staffApi, { customerId: (await staffApi.createCustomer()).id }), { stage: 'WON' });
  expect((await reopenLead(staffApi, noVehicle, 'QUALIFIED')).stage).toBe('QUALIFIED');

  // Won with a vehicle that was later sold to somebody else: not the D7 refusal, but a reopen
  // requires what a create requires, so the sold vehicle stops it (design/14 §5.5).
  const bystander = await staffApi.createCustomer();
  const soldElsewhere = await staffApi.createVehicle();
  const unaffected = await patchLead(
    staffApi,
    await createLead(staffApi, { customerId: bystander.id, vehicleId: soldElsewhere.id }),
    { stage: 'WON' });
  await sell(staffApi, soldElsewhere, { buyerName: 'Another buyer' });
  const stillWon = await getLead(staffApi, unaffected.id);
  await expectError(
    await staffApi.post(`${LEADS}/${unaffected.id}/reopen`, { stage: 'CONTACTED', version: stillWon.version }),
    400, 'WRONG_DEALER_OR_SOLD');
  expect((await getLead(staffApi, unaffected.id)).stage).toBe('WON');

  // Won and the vehicle was sold to this lead's own customer: the sale stands, the reopen is refused.
  const buyer = await staffApi.createCustomer();
  const bought = await staffApi.createVehicle();
  const won = await createLead(staffApi, { customerId: buyer.id, vehicleId: bought.id });
  await sell(staffApi, bought, { customerId: buyer.id });
  const closed = await getLead(staffApi, won.id);
  expect(closed.stage, 'L6 closes the buyer\'s own lead as won').toBe('WON');
  const res = await staffApi.post(`${LEADS}/${won.id}/reopen`, { stage: 'CONTACTED', version: closed.version });
  await expectError(res, 409, 'LEAD_CLOSED');
  expect((await getLead(staffApi, won.id)).stage).toBe('WON');
});

test('L4: reopen rejects an open lead, a closed target stage, a stale version and another dealership', async ({
  staffApi, rivalApi, adminApi,
}) => {
  const openLead = await createLead(staffApi, { customerId: (await staffApi.createCustomer()).id });
  await expectError(
    await staffApi.post(`${LEADS}/${openLead.id}/reopen`, { stage: 'CONTACTED', version: openLead.version }),
    400, 'VALIDATION');

  const closed = await patchLead(staffApi, openLead, { stage: 'LOST', lostReason: 'No budget' });
  for (const stage of ['WON', 'LOST']) {
    const res = await staffApi.post(`${LEADS}/${closed.id}/reopen`, { stage, version: closed.version });
    await expectError(res, 400, 'VALIDATION');
  }
  // A stale version loses to optimistic locking, and the lead stays closed.
  await expectError(
    await staffApi.post(`${LEADS}/${closed.id}/reopen`, { stage: 'NEW', version: closed.version - 1 }),
    409, 'VERSION_CONFLICT');
  expect((await getLead(staffApi, closed.id)).stage).toBe('LOST');

  // Tenancy and role: another dealership sees nothing, the platform admin has no lead access.
  await expectError(
    await rivalApi.post(`${LEADS}/${closed.id}/reopen`, { stage: 'NEW', version: closed.version }), 404, 'NOT_FOUND');
  await expectError(
    await adminApi.post(`${LEADS}/${closed.id}/reopen`, { stage: 'NEW', version: closed.version }), 403, 'FORBIDDEN');

  const reopened = await reopenLead(staffApi, await getLead(staffApi, closed.id), 'NEW');
  expect(reopened.stage).toBe('NEW');
});

test('L6 / D7: selling a vehicle wins the buyer\'s lead and loses the other open leads on it', async ({
  staffApi,
}) => {
  const buyer = await staffApi.createCustomer();
  const rival = await staffApi.createCustomer();
  const bystander = await staffApi.createCustomer();
  const vehicle = await staffApi.createVehicle();
  const otherVehicle = await staffApi.createVehicle();

  const buyerLead = await createLead(staffApi, { customerId: buyer.id, vehicleId: vehicle.id });
  const rivalLead = await createLead(staffApi, { customerId: rival.id, vehicleId: vehicle.id });
  const alreadyLost = await patchLead(
    staffApi, await createLead(staffApi, { customerId: bystander.id, vehicleId: vehicle.id }),
    { stage: 'LOST', lostReason: 'Too far away' });
  const untouched = await createLead(staffApi, { customerId: buyer.id, vehicleId: otherVehicle.id });
  const noVehicle = await createLead(staffApi, { customerId: rival.id });

  await sell(staffApi, vehicle, { customerId: buyer.id });

  expect(await getLead(staffApi, buyerLead.id)).toMatchObject({ stage: 'WON', lostReason: null });
  expect(await getLead(staffApi, rivalLead.id)).toMatchObject({ stage: 'LOST', lostReason: 'Vehicle sold' });
  // A lead that was already closed keeps its own reason, and leads on other vehicles are untouched.
  expect(await getLead(staffApi, alreadyLost.id)).toMatchObject({ stage: 'LOST', lostReason: 'Too far away' });
  expect((await getLead(staffApi, untouched.id)).stage).toBe('NEW');
  expect((await getLead(staffApi, noVehicle.id)).stage).toBe('NEW');

  // Both auto-closes are audited as ordinary stage updates by the seller.
  for (const [id, stage] of [[buyerLead.id, 'WON'], [rivalLead.id, 'LOST']] as [number, string][]) {
    const rows = (await leadAudit(staffApi, id)).items;
    expect(rows.map((r) => r.action)).toEqual(['UPDATE', 'CREATE']);
    expect(rows[0]).toMatchObject({ actorUsername: env.staff.username });
    expect(rows[0].fieldSummary.stage, `${stage} audit`).toBe(stage);
  }
});
