import { test, expect } from '../../support/fixtures';
import { expectStatus, type Api } from '../../support/api';
import { env } from '../../support/env';

// Sales report extensions: lead stage history (design/21 CRM-16) and workshop settlement
// (design/21 WO-08), contract §4.7 and §5.5. Other specs write to the same dealership in
// parallel, so counts are compared as lower bounds.

test.describe.configure({ timeout: 90_000 });

type StageCount = { stage: string; count: number };
type Funnel = { months: { month: string; stages: StageCount[] }[] };
type Settlement = {
  openCount: number; inProgressCount: number; doneCount: number; settledCost: number;
  months: { month: string; doneCount: number; settledCost: number }[];
  assignees: { assigneeUsername?: string | null; outstandingCount: number; doneCount: number; settledCost: number }[];
};

type Lead = {
  id: number; stage: string; ownerUsername: string | null; nextFollowUpOn: string | null;
  vehicle: { id: number } | null; lostReason: string | null; version: number;
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

async function funnel(api: Api) {
  const res = await api.get('/api/v1/leads/report/funnel');
  await expectStatus(res, 200);
  return (await res.json()) as Funnel;
}

function monthCount(report: Funnel, stage: string) {
  return report.months.find((m) => m.month === currentMonth())?.stages.find((s) => s.stage === stage)?.count ?? 0;
}

async function settlement(api: Api) {
  const res = await api.get('/api/v1/work-orders/report/settlement');
  await expectStatus(res, 200);
  return (await res.json()) as Settlement;
}

test('CRM-16: stage history counts the stages leads entered this month', async ({ staffApi }) => {
  const before = await funnel(staffApi);
  const customer = await staffApi.createCustomer();
  const created = await staffApi.post('/api/v1/leads', { customerId: customer.id });
  await expectStatus(created, 201);
  const lead = (await created.json()) as Lead;

  const moved = await staffApi.patch(`/api/v1/leads/${lead.id}`, {
    stage: 'QUALIFIED', ownerUsername: lead.ownerUsername ?? null, nextFollowUpOn: lead.nextFollowUpOn ?? null,
    vehicleId: lead.vehicle?.id ?? null, lostReason: null, version: lead.version,
  });
  await expectStatus(moved, 200);

  const after = await funnel(staffApi);
  // Months are newest first and every month lists every stage.
  expect(after.months[0].month).toBe(currentMonth());
  expect(after.months[0].stages.map((s) => s.stage)).toEqual(expect.arrayContaining(['NEW', 'QUALIFIED', 'WON', 'LOST']));
  expect(monthCount(after, 'NEW')).toBeGreaterThanOrEqual(monthCount(before, 'NEW') + 1);
  expect(monthCount(after, 'QUALIFIED')).toBeGreaterThanOrEqual(monthCount(before, 'QUALIFIED') + 1);
});

test('WO-08: a done work order adds its cost to the workshop settlement; outstanding orders are counted', async ({
  staffApi, rivalApi,
}) => {
  const before = await settlement(staffApi);
  const vehicle = await staffApi.createVehicle();
  const path = `/api/v1/vehicles/${vehicle.id}/work-orders`;
  const open = await staffApi.post(path, { task: 'Inspect brakes', assigneeUsername: env.staff2.username });
  await expectStatus(open, 201);
  const done = await staffApi.post(path, { task: 'Detail and polish', assigneeUsername: env.staff2.username });
  await expectStatus(done, 201);
  const wo = (await done.json()) as { id: number; task: string; assigneeUsername: string; version: number };
  await expectStatus(await staffApi.patch(`/api/v1/work-orders/${wo.id}`, {
    status: 'DONE', task: wo.task, assigneeUsername: wo.assigneeUsername, dueOn: null,
    cost: 120.5, completionNote: 'Polished', version: wo.version,
  }), 200);

  const after = await settlement(staffApi);
  expect(after.doneCount).toBeGreaterThanOrEqual(before.doneCount + 1);
  expect(after.settledCost).toBeGreaterThanOrEqual(before.settledCost + 120.5);
  expect(after.openCount).toBeGreaterThanOrEqual(1);

  const month = after.months.find((m) => m.month === currentMonth());
  expect(month?.settledCost ?? 0).toBeGreaterThanOrEqual(120.5);
  const staff2 = after.assignees.find((a) => a.assigneeUsername === env.staff2.username);
  expect(staff2?.doneCount ?? 0).toBeGreaterThanOrEqual(1);
  expect(staff2?.outstandingCount ?? 0).toBeGreaterThanOrEqual(1);
  expect(staff2?.settledCost ?? 0).toBeGreaterThanOrEqual(120.5);

  // Another dealership never sees this dealership's assignees.
  const rival = await settlement(rivalApi);
  expect(rival.assignees.map((a) => a.assigneeUsername)).not.toContain(env.staff2.username);
});
