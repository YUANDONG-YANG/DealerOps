import { test, expect } from '../../support/fixtures';
import { Api, expectStatus, today, uniqueSuffix } from '../../support/api';
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

type Salesperson = {
  username: string; displayName: string; activeMember: boolean;
  soldCount: number; revenue: number; grossProfit: number; openLeads: number; wonLeads: number;
};
type SalesReport = {
  soldCount: number; revenue: number; grossProfit: number;
  period: { period: string; from: string; to: string; soldCount: number; revenue: number } | null;
  salespeople: Salesperson[];
};

async function salesReport(api: Api, period?: string) {
  const res = await api.get('/api/v1/vehicles/report/sales', period ? { period } : undefined);
  await expectStatus(res, 200);
  return (await res.json()) as SalesReport;
}

/**
 * ROLE / CR-C3: the salesperson table counts every member who sold a vehicle and is not filtered
 * by dealership role (spec §5). This builds its own dealership so the counts are exact: the
 * platform admin binds the first owner directly, further accounts arrive as join requests the
 * owner approves as SALES, and the owner promotes one of them to MANAGER.
 */
test('ROLE / CR-C3: the sales report counts the owner, a manager and a sales member who each sold a vehicle', async ({
  adminApi, request,
}) => {
  test.setTimeout(150_000);
  const suffix = uniqueSuffix();
  const password = `e2e-tier-${suffix}`;
  const created = await adminApi.post('/api/v1/admin/dealers', {
    legalName: `E2E Tiers ${suffix}`,
    contactPhone: '403-555-0177',
    contactEmail: `e2e.tiers.${suffix}@example.com`,
    contactAddress: '7 Tier Road, Calgary, AB',
  });
  await expectStatus(created, 201);
  const dealerId = ((await created.json()) as { id: number }).id;
  const members = `/api/v1/admin/dealers/${dealerId}/members`;
  const user = (tier: string) => `e2e.${tier}.${suffix}`;
  const account = (tier: string) => ({
    username: user(tier), displayName: `E2E ${tier} ${suffix}`, password,
    email: `${user(tier)}@example.com`, phone: null,
  });

  // The first account binds directly as the dealership's owner (spec §2).
  const boundOwner = await adminApi.post(members, account('owner'));
  await expectStatus(boundOwner, 201);
  expect((await boundOwner.json()) as { dealerRole: string }).toMatchObject({ dealerRole: 'OWNER' });
  const ownerApi = await Api.as(request, user('owner'), password);

  // With an owner in place the admin only files a join request; the owner approves it as SALES.
  for (const tier of ['manager', 'sales']) {
    const requested = await adminApi.post(members, account(tier));
    await expectStatus(requested, 202);
    expect((await requested.json()) as { joinRequested: boolean }).toMatchObject({ joinRequested: true });
    await expectStatus(await ownerApi.post(`/api/v1/dealer/join-requests/${user(tier)}/approve`), 204);
  }
  await expectStatus(await ownerApi.put(`/api/v1/dealer/members/${user('manager')}/role`, { dealerRole: 'MANAGER' }), 204);

  const roles = await ownerApi.get('/api/v1/members');
  await expectStatus(roles, 200);
  const byUsername = Object.fromEntries(
    ((await roles.json()) as { username: string; dealerRole: string }[]).map((m) => [m.username, m.dealerRole]));
  expect(byUsername[user('owner')]).toBe('OWNER');
  expect(byUsername[user('manager')]).toBe('MANAGER');
  expect(byUsername[user('sales')]).toBe('SALES');

  // Every tier may sell a vehicle; sold_by is not restricted to the Sales role (spec §5).
  const soldOn = today();
  const apis: Record<string, Api> = { owner: ownerApi };
  for (const tier of ['manager', 'sales']) apis[tier] = await Api.as(request, user(tier), password);
  for (const tier of ['owner', 'manager', 'sales']) {
    const v = await apis[tier].createVehicle({ purchaseCost: 10000, repairCost: 0 });
    await expectStatus(await apis[tier].post(`/api/v1/vehicles/${v.id}/sell`, {
      soldOn, soldPrice: 12000, version: v.version, buyerName: `Buyer of ${tier}`,
    }), 200);
  }

  const report = await salesReport(ownerApi, 'MONTH');
  for (const tier of ['owner', 'manager', 'sales']) {
    const row = report.salespeople.find((p) => p.username === user(tier));
    expect(row, `${tier} is missing from the salesperson table`).toBeTruthy();
    expect(row!.activeMember).toBe(true);
    expect(row!.soldCount).toBe(1);
    expect(row!.revenue).toBe(12000);
    expect(row!.grossProfit).toBe(2000);
  }
  expect(report.soldCount).toBe(3);

  // A sales member reads the same report: business data is shared by all three tiers (spec §5).
  const asSales = await salesReport(apis.sales, 'MONTH');
  expect(asSales.salespeople.map((p) => p.username).sort())
    .toEqual(['owner', 'manager', 'sales'].map(user).sort());

  // Report periods: all three sales are today, so every calendar period covers them.
  for (const period of ['TODAY', 'WEEK', 'MONTH', 'YEAR']) {
    const scoped = await salesReport(ownerApi, period);
    expect(scoped.period, period).toMatchObject({ period, soldCount: 3, revenue: 36000 });
    expect(scoped.period!.from <= soldOn && soldOn <= scoped.period!.to, `${period} covers today`).toBe(true);
  }
  // Without a period the report has no period block but still carries the all-time totals.
  const allTime = await salesReport(ownerApi);
  expect(allTime.period ?? null).toBeNull();
  expect(allTime.soldCount).toBe(3);
});
