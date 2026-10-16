import { test, expect } from '../../support/fixtures';
import { customerBody, expectError, expectStatus, uniqueSuffix, type Api } from '../../support/api';
import { env } from '../../support/env';

// Lead follow-up: design/21-Feature-Extensions.md §3 (LEAD-01..09) and
// design/14-Backend-API-Contract.md §5.5, §9 (audit), §1.3 (tenant rules).

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
  const sold = await staffApi.sellVehicle(await staffApi.createVehicle());
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

  await staffApi.sellVehicle(v);
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
