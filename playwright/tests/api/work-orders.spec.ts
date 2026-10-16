import { test, expect } from '../../support/fixtures';
import { expectError, expectStatus, today, type Api, type Vehicle } from '../../support/api';
import { env } from '../../support/env';

// Reconditioning work orders: design/21 §4 (WO-01..07) and design/14 §4.7.

test.describe.configure({ timeout: 90_000 });

type WorkOrder = {
  id: number; vehicleId: number; task: string; assigneeUsername: string | null; status: string;
  dueOn: string | null; cost: number | null; completionNote: string | null; completedOn: string | null;
  createdAt: string; version: number;
};

type VehicleWithWo = Vehicle & { openWorkOrders: number };

type AuditItem = {
  entityType: string; entityId: number; action: string; fieldSummary: Record<string, unknown>;
  actorUsername: string;
};

function futureDate(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// The API omits null properties (global JSON setting), so absent fields are read as null.
function normalize(raw: Partial<WorkOrder>): WorkOrder {
  return {
    assigneeUsername: null, dueOn: null, cost: null, completionNote: null, completedOn: null,
    ...raw,
  } as WorkOrder;
}

async function createWorkOrder(api: Api, vehicleId: number, body: Record<string, unknown> = {}) {
  const res = await api.post(`/api/v1/vehicles/${vehicleId}/work-orders`, { task: 'Replace front brake pads', ...body });
  await expectStatus(res, 201);
  return normalize(await res.json());
}

/** Full editable state of a work order, for PATCH bodies. */
function stateOf(wo: WorkOrder, overrides: Record<string, unknown> = {}) {
  return {
    status: wo.status, task: wo.task, assigneeUsername: wo.assigneeUsername, dueOn: wo.dueOn,
    cost: null, completionNote: null, version: wo.version, ...overrides,
  };
}

function patchWorkOrder(api: Api, wo: WorkOrder, overrides: Record<string, unknown> = {}) {
  return api.patch(`/api/v1/work-orders/${wo.id}`, stateOf(wo, overrides));
}

async function patchOk(api: Api, wo: WorkOrder, overrides: Record<string, unknown> = {}) {
  const res = await patchWorkOrder(api, wo, overrides);
  await expectStatus(res, 200);
  return normalize(await res.json());
}

async function listWorkOrders(api: Api, vehicleId: number) {
  const res = await api.get(`/api/v1/vehicles/${vehicleId}/work-orders`);
  await expectStatus(res, 200);
  return ((await res.json()) as Partial<WorkOrder>[]).map(normalize);
}

async function getVehicle(api: Api, id: number) {
  return (await api.getVehicle(id)) as VehicleWithWo;
}

async function audit(api: Api, entityType: string, entityId: number) {
  const res = await api.get('/api/v1/audit', { entityType, entityId, size: 50 });
  await expectStatus(res, 200);
  return ((await res.json()) as { items: AuditItem[] }).items;
}

test('WO-01: create with task, assignee and due date starts OPEN', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle();
  const dueOn = futureDate(5);
  const wo = await createWorkOrder(staffApi, vehicle.id, {
    task: '  Detail interior  ', assigneeUsername: env.staff2.username, dueOn,
  });
  expect(wo).toMatchObject({
    vehicleId: vehicle.id, task: 'Detail interior', assigneeUsername: env.staff2.username,
    status: 'OPEN', dueOn, cost: null, completionNote: null, completedOn: null,
  });
  expect(typeof wo.version).toBe('number');

  const minimal = await createWorkOrder(staffApi, vehicle.id, { task: 'x' });
  expect(minimal.assigneeUsername).toBeNull();
  expect(minimal.dueOn).toBeNull();

  const max = await createWorkOrder(staffApi, vehicle.id, { task: 't'.repeat(200) });
  expect(max.task).toHaveLength(200);

  const list = await listWorkOrders(staffApi, vehicle.id);
  expect(list.map((w) => w.id).sort()).toEqual([wo.id, minimal.id, max.id].sort());
});

test('WO-01: task must be 1-200 characters', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle();
  const path = `/api/v1/vehicles/${vehicle.id}/work-orders`;
  for (const body of [{}, { task: '' }, { task: '   ' }, { task: 't'.repeat(201) }]) {
    await expectError(await staffApi.post(path, body), 400, 'VALIDATION');
  }
  expect(await listWorkOrders(staffApi, vehicle.id)).toEqual([]);
});

test('WO-01: assignee must be an active member of this dealership', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle();
  const path = `/api/v1/vehicles/${vehicle.id}/work-orders`;
  await expectError(await staffApi.post(path, { task: 'Wash', assigneeUsername: 'no.such.user.e2e' }), 400, 'VALIDATION');
  // An active member of another dealership is not a member here.
  await expectError(await staffApi.post(path, { task: 'Wash', assigneeUsername: env.rival.username }), 400, 'VALIDATION');
  // The platform admin is not a dealership member.
  await expectError(
    await staffApi.post(path, { task: 'Wash', assigneeUsername: env.admin.identifier }), 400, 'VALIDATION');

  // Reassigning through PATCH is checked the same way.
  const wo = await createWorkOrder(staffApi, vehicle.id);
  await expectError(await patchWorkOrder(staffApi, wo, { assigneeUsername: env.rival.username }), 400, 'VALIDATION');
  const reassigned = await patchOk(staffApi, wo, { assigneeUsername: env.staff.username });
  expect(reassigned.assigneeUsername).toBe(env.staff.username);
});

test('WO-02: OPEN -> IN_PROGRESS -> DONE; keeping status edits task, assignee, due date', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle({ repairCost: 800 });
  const wo = await createWorkOrder(staffApi, vehicle.id);

  const edited = await patchOk(staffApi, wo, {
    task: 'Replace rear brake pads', assigneeUsername: env.staff2.username, dueOn: futureDate(3),
  });
  expect(edited).toMatchObject({
    status: 'OPEN', task: 'Replace rear brake pads', assigneeUsername: env.staff2.username, dueOn: futureDate(3),
  });
  expect(edited.version).toBeGreaterThan(wo.version);

  const started = await patchOk(staffApi, edited, { status: 'IN_PROGRESS' });
  expect(started.status).toBe('IN_PROGRESS');
  expect(started.completedOn).toBeNull();

  // Backward transition is not allowed.
  await expectError(await patchWorkOrder(staffApi, started, { status: 'OPEN' }), 400, 'VALIDATION');

  const done = await patchOk(staffApi, started, { status: 'DONE', cost: 150, completionNote: 'Pads replaced' });
  expect(done).toMatchObject({ status: 'DONE', cost: 150, completionNote: 'Pads replaced', completedOn: today() });
});

test('WO-02: OPEN -> DONE quick job and OPEN/IN_PROGRESS -> CANCELLED', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle();

  const quick = await createWorkOrder(staffApi, vehicle.id, { task: 'Top up washer fluid' });
  const quickDone = await patchOk(staffApi, quick, { status: 'DONE', cost: 0, completionNote: 'Done' });
  expect(quickDone.status).toBe('DONE');
  expect(quickDone.cost).toBe(0);

  const openCancel = await createWorkOrder(staffApi, vehicle.id, { task: 'Paint touch-up' });
  const cancelled = await patchOk(staffApi, openCancel, { status: 'CANCELLED' });
  expect(cancelled.status).toBe('CANCELLED');
  expect(cancelled.completedOn).toBeNull();

  const progressCancel = await createWorkOrder(staffApi, vehicle.id, { task: 'Replace wiper blades' });
  const started = await patchOk(staffApi, progressCancel, { status: 'IN_PROGRESS' });
  expect((await patchOk(staffApi, started, { status: 'CANCELLED' })).status).toBe('CANCELLED');
});

test('WO-02: unknown status values are rejected', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle();
  const wo = await createWorkOrder(staffApi, vehicle.id);
  for (const status of ['ARCHIVED', 'PREPARING', '', null]) {
    const res = await patchWorkOrder(staffApi, wo, { status });
    expect(res.status(), `status ${JSON.stringify(status)} → ${await res.text()}`).toBe(400);
  }
  const [stored] = await listWorkOrders(staffApi, vehicle.id);
  expect(stored).toMatchObject({ id: wo.id, status: 'OPEN', version: wo.version });
});

test('WO-02: DONE and CANCELLED are final -> 409 WORK_ORDER_CLOSED', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle();

  const done = await patchOk(staffApi, await createWorkOrder(staffApi, vehicle.id),
    { status: 'DONE', cost: 10, completionNote: 'ok' });
  for (const overrides of [
    { status: 'OPEN' }, { status: 'IN_PROGRESS' }, { status: 'CANCELLED' },
    { status: 'DONE', cost: 10, completionNote: 'ok', task: 'Changed after done' },
  ]) {
    await expectError(await patchWorkOrder(staffApi, done, overrides), 409, 'WORK_ORDER_CLOSED');
  }

  const cancelled = await patchOk(staffApi, await createWorkOrder(staffApi, vehicle.id), { status: 'CANCELLED' });
  for (const overrides of [
    { status: 'OPEN' }, { status: 'DONE', cost: 1, completionNote: 'late' }, { task: 'Changed after cancel' },
  ]) {
    await expectError(await patchWorkOrder(staffApi, cancelled, overrides), 409, 'WORK_ORDER_CLOSED');
  }
});

test('WO-03: DONE requires a completion note (1-500) and a cost >= 0', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle({ repairCost: 500 });
  const wo = await createWorkOrder(staffApi, vehicle.id);

  const rejected: Record<string, unknown>[] = [
    { cost: 100 },
    { cost: 100, completionNote: '' },
    { cost: 100, completionNote: '   ' },
    { cost: 100, completionNote: 'n'.repeat(501) },
    { completionNote: 'No cost' },
    { cost: null, completionNote: 'Null cost' },
    { cost: -1, completionNote: 'Negative cost' },
  ];
  for (const overrides of rejected) {
    const res = await patchWorkOrder(staffApi, wo, { status: 'DONE', ...overrides });
    await expectError(res, 400, 'VALIDATION');
  }

  // Nothing was persisted by the rejected attempts.
  const [stored] = await listWorkOrders(staffApi, vehicle.id);
  expect(stored).toMatchObject({ status: 'OPEN', version: wo.version, cost: null });
  expect((await getVehicle(staffApi, vehicle.id)).repairCost).toBe(500);

  const done = await patchOk(staffApi, wo, { status: 'DONE', cost: 0, completionNote: 'n'.repeat(500) });
  expect(done.completionNote).toHaveLength(500);
});

test('WO-04: DONE adds cost to repairCost with a vehicle UPDATE audit row', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle({ repairCost: 800 });
  const wo = await patchOk(staffApi, await createWorkOrder(staffApi, vehicle.id), { status: 'IN_PROGRESS' });
  await patchOk(staffApi, wo, { status: 'DONE', cost: 150, completionNote: 'Brakes done' });

  const after = await getVehicle(staffApi, vehicle.id);
  expect(after.repairCost).toBe(950);
  expect(after.version).toBeGreaterThan(vehicle.version);

  const rows = await audit(staffApi, 'VEHICLE', vehicle.id);
  const update = rows.find((r) => r.action === 'UPDATE' && 'repairCost' in (r.fieldSummary ?? {}));
  expect(update, JSON.stringify(rows)).toBeTruthy();
  expect(Number(update!.fieldSummary.repairCost)).toBe(950);

  // A vehicle without a repair cost starts from zero.
  const bare = await staffApi.createVehicle({ repairCost: null });
  await patchOk(staffApi, await createWorkOrder(staffApi, bare.id), { status: 'DONE', cost: 75.5, completionNote: 'ok' });
  expect((await getVehicle(staffApi, bare.id)).repairCost).toBe(75.5);
});

test('WO-xx: stale version -> 409 VERSION_CONFLICT', async ({ staffApi, staff2Api }) => {
  const vehicle = await staffApi.createVehicle();
  const wo = await createWorkOrder(staffApi, vehicle.id);
  await patchOk(staff2Api, wo, { task: 'Edited by the other staff member' });

  await expectError(await patchWorkOrder(staffApi, wo, { status: 'IN_PROGRESS' }), 409, 'VERSION_CONFLICT');
  await expectError(
    await patchWorkOrder(staffApi, wo, { status: 'DONE', cost: 5, completionNote: 'x' }), 409, 'VERSION_CONFLICT');
  const [stored] = await listWorkOrders(staffApi, vehicle.id);
  expect(stored).toMatchObject({ status: 'OPEN', task: 'Edited by the other staff member' });
});

test('WO-05: selling with OPEN or IN_PROGRESS work orders -> 409 WORK_ORDERS_OPEN', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle({ addedOn: '2026-09-01' });
  const sell = (v: Vehicle) =>
    staffApi.post(`/api/v1/vehicles/${v.id}/sell`, { soldOn: today(), soldPrice: 18900, version: v.version });

  const wo = await createWorkOrder(staffApi, vehicle.id);
  await expectError(await sell(await getVehicle(staffApi, vehicle.id)), 409, 'WORK_ORDERS_OPEN');

  const started = await patchOk(staffApi, wo, { status: 'IN_PROGRESS' });
  await expectError(await sell(await getVehicle(staffApi, vehicle.id)), 409, 'WORK_ORDERS_OPEN');
  expect((await getVehicle(staffApi, vehicle.id)).status).toBe('IN_STOCK');

  await patchOk(staffApi, started, { status: 'DONE', cost: 150, completionNote: 'Done' });
  const sold = await staffApi.sellVehicle(await getVehicle(staffApi, vehicle.id));
  expect(sold.status).toBe('SOLD');
});

test('WO-05: work orders on a sold vehicle cannot be created or changed -> 409 SOLD_LOCKED', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle({ addedOn: '2026-09-01' });
  const done = await patchOk(staffApi, await createWorkOrder(staffApi, vehicle.id),
    { status: 'DONE', cost: 20, completionNote: 'Done before sale' });
  await staffApi.sellVehicle(await getVehicle(staffApi, vehicle.id));

  await expectError(
    await staffApi.post(`/api/v1/vehicles/${vehicle.id}/work-orders`, { task: 'After sale' }), 409, 'SOLD_LOCKED');

  // History stays readable on a sold vehicle.
  const list = await listWorkOrders(staffApi, vehicle.id);
  expect(list.map((w) => w.id)).toEqual([done.id]);
});

test('WO-07: vehicle openWorkOrders counts OPEN + IN_PROGRESS only', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle();
  expect((vehicle as VehicleWithWo).openWorkOrders).toBe(0);

  const a = await createWorkOrder(staffApi, vehicle.id, { task: 'A' });
  const b = await createWorkOrder(staffApi, vehicle.id, { task: 'B' });
  const c = await createWorkOrder(staffApi, vehicle.id, { task: 'C' });
  expect((await getVehicle(staffApi, vehicle.id)).openWorkOrders).toBe(3);

  await patchOk(staffApi, a, { status: 'IN_PROGRESS' });
  expect((await getVehicle(staffApi, vehicle.id)).openWorkOrders).toBe(3);

  await patchOk(staffApi, b, { status: 'CANCELLED' });
  expect((await getVehicle(staffApi, vehicle.id)).openWorkOrders).toBe(2);

  await patchOk(staffApi, c, { status: 'DONE', cost: 0, completionNote: 'ok' });
  const after = await getVehicle(staffApi, vehicle.id);
  expect(after.openWorkOrders).toBe(1);

  // The list endpoint carries the same count.
  const listRes = await staffApi.get('/api/v1/vehicles', { q: vehicle.vin });
  await expectStatus(listRes, 200);
  const listBody = await listRes.json();
  const rows = (Array.isArray(listBody) ? listBody : listBody.items) as VehicleWithWo[];
  const row = rows.find((v) => v.id === vehicle.id);
  expect(row, JSON.stringify(listBody).slice(0, 300)).toBeTruthy();
  expect(row!.openWorkOrders).toBe(1);
});

test('WO-xx: list returns OPEN/IN_PROGRESS first, then closed, each newest first', async ({ staffApi }) => {
  const vehicle = await staffApi.createVehicle();
  const first = await createWorkOrder(staffApi, vehicle.id, { task: 'first' });
  const second = await createWorkOrder(staffApi, vehicle.id, { task: 'second' });
  const third = await createWorkOrder(staffApi, vehicle.id, { task: 'third' });
  const fourth = await createWorkOrder(staffApi, vehicle.id, { task: 'fourth' });
  await patchOk(staffApi, second, { status: 'CANCELLED' });
  await patchOk(staffApi, fourth, { status: 'DONE', cost: 0, completionNote: 'ok' });
  await patchOk(staffApi, first, { status: 'IN_PROGRESS' });

  const list = await listWorkOrders(staffApi, vehicle.id);
  expect(list.map((w) => w.task)).toEqual(['third', 'first', 'fourth', 'second']);
});

test('WO-xx: another dealership gets 404 for vehicle work orders and work order PATCH', async ({
  staffApi, rivalApi,
}) => {
  const vehicle = await staffApi.createVehicle();
  const wo = await createWorkOrder(staffApi, vehicle.id);

  await expectError(await rivalApi.get(`/api/v1/vehicles/${vehicle.id}/work-orders`), 404, 'NOT_FOUND');
  await expectError(
    await rivalApi.post(`/api/v1/vehicles/${vehicle.id}/work-orders`, { task: 'Intrusion' }), 404, 'NOT_FOUND');
  await expectError(await patchWorkOrder(rivalApi, wo, { status: 'CANCELLED' }), 404, 'NOT_FOUND');
  await expectError(await rivalApi.get('/api/v1/audit', { entityType: 'WORK_ORDER', entityId: wo.id }), 404, 'NOT_FOUND');

  const [stored] = await listWorkOrders(staffApi, vehicle.id);
  expect(stored).toMatchObject({ id: wo.id, status: 'OPEN', version: wo.version });
  expect(await listWorkOrders(staffApi, vehicle.id)).toHaveLength(1);
});

test('WO-xx: admin gets 403 on work order endpoints', async ({ staffApi, adminApi }) => {
  const vehicle = await staffApi.createVehicle();
  const wo = await createWorkOrder(staffApi, vehicle.id);
  for (const res of [
    await adminApi.get(`/api/v1/vehicles/${vehicle.id}/work-orders`),
    await adminApi.post(`/api/v1/vehicles/${vehicle.id}/work-orders`, { task: 'Admin task' }),
    await patchWorkOrder(adminApi, wo, { status: 'CANCELLED' }),
  ]) {
    const text = await res.text();
    expect(res.status(), `${res.url()} → ${text}`).toBe(403);
    expect(text).not.toContain(wo.task);
  }
  expect(await listWorkOrders(staffApi, vehicle.id)).toHaveLength(1);
});

test('WO-06: create and status changes are audited as WORK_ORDER CREATE/UPDATE', async ({ staffApi, staff2Api }) => {
  const vehicle = await staffApi.createVehicle();
  const wo = await createWorkOrder(staffApi, vehicle.id);
  const started = await patchOk(staff2Api, wo, { status: 'IN_PROGRESS' });
  await patchOk(staffApi, started, { status: 'DONE', cost: 30, completionNote: 'ok' });

  const rows = await audit(staffApi, 'WORK_ORDER', wo.id);
  expect(rows.every((r) => r.entityType === 'WORK_ORDER' && r.entityId === wo.id)).toBe(true);

  const create = rows.filter((r) => r.action === 'CREATE');
  expect(create).toHaveLength(1);
  expect(create[0].actorUsername).toBe(env.staff.username);

  const updates = rows.filter((r) => r.action === 'UPDATE');
  expect(updates.map((r) => r.fieldSummary.status).sort()).toEqual(['DONE', 'IN_PROGRESS']);
  const startRow = updates.find((r) => r.fieldSummary.status === 'IN_PROGRESS')!;
  expect(startRow.actorUsername).toBe(env.staff2.username);
  const doneRow = updates.find((r) => r.fieldSummary.status === 'DONE')!;
  expect(Object.keys(doneRow.fieldSummary)).toEqual(expect.arrayContaining(['status', 'cost', 'completionNote']));
  // Free-text values are not copied into the audit summary.
  expect(JSON.stringify(rows)).not.toContain(wo.task);
});
