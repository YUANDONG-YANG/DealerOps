import { test, expect } from '../../support/fixtures';
import { env } from '../../support/env';
import {
  Api, expectError, expectStatus, today, uniqueSuffix, vehicleBody, type Vehicle,
} from '../../support/api';

// DMS-19 (requirements/iteration-3/CR-Vehicle-Source-Other-2026-11-09.md, design/21): source OTHER
// carries a required custom source name, the list filters by source and by that name, and the
// option list behind the second-level filter is per dealership and case-insensitive. The extra
// scenarios follow requirements/iteration-3/REVIEW-Vehicle-Source-Other-2026-11-10.md §4.
// DMS-20: every vehicle may record who it was acquired from (name and address), optional.

type SourcedVehicle = Vehicle & {
  sourceOther?: string | null;
  acquiredFromName?: string | null;
  acquiredFromAddress?: string | null;
};

type AuditRow = {
  action: string;
  fieldSummary: Record<string, unknown> | null;
  previous: Record<string, unknown> | null;
};

const REQUIRED = 'Enter the source when Other is selected.';

async function options(api: Api) {
  const res = await api.get('/api/v1/vehicles/source-other-options');
  await expectStatus(res, 200);
  return (await res.json()) as string[];
}

async function list(api: Api, params: Record<string, string>) {
  const res = await api.get('/api/v1/vehicles', { size: 100, ...params });
  await expectStatus(res, 200);
  return ((await res.json()) as { items: SourcedVehicle[] }).items;
}

async function ids(api: Api, params: Record<string, string>) {
  return (await list(api, params)).map((v) => v.id).sort((a, b) => a - b);
}

async function create(api: Api, overrides: Record<string, unknown>) {
  return (await api.createVehicle(overrides)) as SourcedVehicle;
}

/** PATCH that resends the vehicle with the given changes; the body replaces the optional fields. */
function patch(api: Api, v: SourcedVehicle, changes: Record<string, unknown>) {
  return api.patch(`/api/v1/vehicles/${v.id}`, vehicleBody({ ...v, version: v.version, ...changes }));
}

async function patched(api: Api, v: SourcedVehicle, changes: Record<string, unknown>) {
  const res = await patch(api, v, changes);
  await expectStatus(res, 200);
  return (await res.json()) as SourcedVehicle;
}

/** Expects 400 VALIDATION with the given message on one field. */
async function expectFieldError(res: Awaited<ReturnType<Api['post']>>, field: string, message: string, label = '') {
  const text = await res.text();
  expect(res.status(), `${label} ${text}`).toBe(400);
  const error = JSON.parse(text);
  expect(error.code, text).toBe('VALIDATION');
  expect(error.fieldErrors?.[field], text).toBe(message);
}

async function latestUpdate(api: Api, vehicleId: number) {
  const res = await api.get('/api/v1/audit', { entityType: 'VEHICLE', entityId: vehicleId });
  await expectStatus(res, 200);
  const rows = ((await res.json()) as { items: AuditRow[] }).items;
  const update = rows.find((r) => r.action === 'UPDATE');
  expect(update, JSON.stringify(rows)).toBeTruthy();
  return update!;
}

test('DMS-19 / SRC-01: OTHER needs a custom source; it is trimmed and kept only for OTHER', async ({ staffApi }) => {
  for (const sourceOther of [undefined, null, '', '   ']) {
    await expectFieldError(
      await staffApi.post('/api/v1/vehicles', vehicleBody({ source: 'OTHER', sourceOther })),
      'sourceOther', REQUIRED, `sourceOther=${JSON.stringify(sourceOther)}:`);
  }

  const name = `Lease return ${uniqueSuffix()}`;
  const other = await create(staffApi, { source: 'OTHER', sourceOther: `  ${name}  ` });
  expect(other.sourceOther).toBe(name);

  const auction = await create(staffApi, { source: 'AUCTION', sourceOther: 'ignored' });
  // The API omits null fields, as for soldOn.
  expect(auction.sourceOther ?? null).toBeNull();
});

test('DMS-19 / SRC-11: the 100-character limit counts the trimmed name', async ({ staffApi }) => {
  const hundred = `${uniqueSuffix()}`.padEnd(100, 'x');
  await expectFieldError(
    await staffApi.post('/api/v1/vehicles', vehicleBody({ source: 'OTHER', sourceOther: `${hundred}y` })),
    'sourceOther', 'At most 100 characters.');
  await expectFieldError(
    await staffApi.post('/api/v1/vehicles', vehicleBody({ source: 'OTHER', sourceOther: ` ${hundred}y ` })),
    'sourceOther', 'At most 100 characters.');

  const exact = await create(staffApi, { source: 'OTHER', sourceOther: hundred });
  expect(exact.sourceOther).toBe(hundred);
  const padded = await create(staffApi, { source: 'OTHER', sourceOther: `   ${hundred}   ` });
  expect(padded.sourceOther).toBe(hundred);
  expect((await staffApi.getVehicle(padded.id) as SourcedVehicle).sourceOther).toBe(hundred);
});

test('DMS-19 / SRC-02: list filters by source and by custom source, ignoring case', async ({ staffApi }) => {
  const name = `Fleet sale ${uniqueSuffix()}`;
  const a = await create(staffApi, { source: 'OTHER', sourceOther: name });
  const b = await create(staffApi, { source: 'OTHER', sourceOther: `${name.toLowerCase()} ` });
  const auction = await create(staffApi, { source: 'AUCTION' });

  expect(await ids(staffApi, { sourceOther: name.toUpperCase() })).toEqual([a.id, b.id].sort((x, y) => x - y));

  const allOther = await list(staffApi, { source: 'OTHER' });
  expect(allOther.every((v) => v.source === 'OTHER')).toBe(true);
  expect(allOther.map((v) => v.id)).not.toContain(auction.id);

  // The two spellings are one option, written as on the most recently added vehicle.
  const matching = (await options(staffApi)).filter((o) => o.toLowerCase() === name.toLowerCase());
  expect(matching).toEqual([name.toLowerCase()]);
});

test('DMS-19 / SRC-03, SRC-09, SRC-14: switching away from OTHER clears the custom source', async ({ staffApi }) => {
  const name = `Dealer transfer ${uniqueSuffix()}`;
  const v = await create(staffApi, { source: 'OTHER', sourceOther: name });

  const saved = await patched(staffApi, v, { source: 'TRADE_IN', sourceOther: name });
  expect(saved.source).toBe('TRADE_IN');
  expect(saved.sourceOther ?? null).toBeNull();
  // The name of the last vehicle that used it leaves the option list.
  expect(await options(staffApi)).not.toContain(name);

  // Back to OTHER without a name is refused; the earlier name is not restored.
  await expectFieldError(await patch(staffApi, saved, { source: 'OTHER', sourceOther: null }), 'sourceOther', REQUIRED);
  const back = await patched(staffApi, saved, { source: 'OTHER', sourceOther: `${name} again` });
  expect(back.sourceOther).toBe(`${name} again`);
});

test('DMS-19 / SRC-05: the custom source of a sold vehicle is locked', async ({ staffApi }) => {
  const v = await create(staffApi, { source: 'OTHER', sourceOther: `Estate sale ${uniqueSuffix()}` });
  const s = (await staffApi.sellVehicle(v)) as SourcedVehicle;

  await expectError(await patch(staffApi, s, { sourceOther: 'Something else' }), 409, 'SOLD_LOCKED');
  // Sold vehicles still feed the option list.
  expect(await options(staffApi)).toContain(s.sourceOther);
});

test('DMS-19 / SRC-10: PATCH replaces the custom source, so a named OTHER vehicle cannot drop it', async ({ staffApi }) => {
  const name = `Auction house ${uniqueSuffix()}`;
  const v = await create(staffApi, { source: 'OTHER', sourceOther: name });

  // Omitted (undefined is left out of the JSON body), null, empty and blank all count as missing.
  for (const sourceOther of [undefined, null, '', '   ']) {
    await expectFieldError(await patch(staffApi, v, { sourceOther }), 'sourceOther', REQUIRED,
      `sourceOther=${JSON.stringify(sourceOther)}:`);
  }
  expect((await staffApi.getVehicle(v.id) as SourcedVehicle).sourceOther).toBe(name);

  // Editing another field while resending the name is accepted; a new name replaces it.
  const edited = await patched(staffApi, v, { repairCost: 950 });
  expect(edited.sourceOther).toBe(name);
  const renamed = await patched(staffApi, edited, { sourceOther: `  ${name} B  ` });
  expect(renamed.sourceOther).toBe(`${name} B`);
});

test('DMS-19 / SRC-06: an older OTHER vehicle without a custom source stays editable as it is', async ({ staffApi }) => {
  // Such vehicles predate DMS-19 and cannot be created through the API; the private e2e database
  // starts empty (scripts/e2e-stack.sh does not load dealer-platform/seed), so this case runs only
  // against a database that holds one in the staff dealership.
  const legacy = (await list(staffApi, { source: 'OTHER', status: 'IN_STOCK' })).find((v) => !v.sourceOther);
  test.skip(!legacy, 'No in-stock OTHER vehicle without a custom source in the staff dealership (none can be created through the API).');

  // source=OTHER alone lists it (found above). Editing an unrelated field keeps the blank allowed;
  // the edit is reverted so the record stays as other runs expect it.
  const edited = await patched(staffApi, legacy!, { sourceOther: null, repairCost: (legacy!.repairCost ?? 0) + 1 });
  expect(edited.source).toBe('OTHER');
  expect(edited.sourceOther ?? null).toBeNull();
  const restored = await patched(staffApi, edited, { sourceOther: null, repairCost: legacy!.repairCost });
  expect(restored.repairCost).toBe(legacy!.repairCost);
  // Naming it would make the name permanent (SRC-08), so that transition is covered on new vehicles.
});

test('DMS-19 / SRC-13: options cover in-stock and sold vehicles, not deleted ones, sorted ignoring case', async ({
  staffApi,
}) => {
  const id = uniqueSuffix();
  const inStock = `Opt in stock ${id}`;
  const sold = `Opt sold ${id}`;
  const deleted = `Opt deleted ${id}`;
  await create(staffApi, { source: 'OTHER', sourceOther: inStock });
  await staffApi.sellVehicle(await create(staffApi, { source: 'OTHER', sourceOther: sold }));
  const gone = await create(staffApi, { source: 'OTHER', sourceOther: deleted });
  expect(await options(staffApi)).toContain(deleted);
  await expectStatus(await staffApi.delete(`/api/v1/vehicles/${gone.id}`), 204);

  const all = await options(staffApi);
  expect(all).toEqual(expect.arrayContaining([inStock, sold]));
  expect(all).not.toContain(deleted);
  expect(all.every((o) => o.trim() !== '' && o === o.trim())).toBe(true);
  const sorted = [...all].sort((a, b) => {
    const x = a.toUpperCase();
    const y = b.toUpperCase();
    return x < y ? -1 : x > y ? 1 : 0;
  });
  expect(all).toEqual(sorted);
});

test('DMS-19 / SRC-02, SRC-14: the merged option keeps the spelling of the most recently added vehicle', async ({ staffApi }) => {
  const base = `Mixed Case ${uniqueSuffix()}`;
  const first = await create(staffApi, { source: 'OTHER', sourceOther: base.toUpperCase() });
  const second = await create(staffApi, { source: 'OTHER', sourceOther: base });
  const matching = () => options(staffApi).then((all) => all.filter((o) => o.toLowerCase() === base.toLowerCase()));
  expect(await matching()).toEqual([base]);

  // Selecting the option returns both spellings.
  expect(await ids(staffApi, { sourceOther: base })).toEqual([first.id, second.id].sort((a, b) => a - b));

  // When the newer vehicle is deleted, the older spelling takes over.
  await expectStatus(await staffApi.delete(`/api/v1/vehicles/${second.id}`), 204);
  expect(await matching()).toEqual([base.toUpperCase()]);
});

test('DMS-19 / SRC-20: source options are closed to the platform admin and to unbound users', async ({
  adminApi, request,
}) => {
  await expectStatus(await adminApi.get('/api/v1/vehicles/source-other-options'), 403);

  const id = uniqueSuffix();
  const account = {
    username: `e2e.unbound.${id}`, displayName: `E2E Unbound ${id}`, email: `e2e.unbound.${id}@example.com`,
    password: 'e2e-unbound-pass-1',
  };
  await expectStatus(await request.post(`${env.gatewayUrl}/api/v1/auth/register`, { data: account }), 201);
  const unbound = await Api.as(request, account.username, account.password);
  await expectStatus(await unbound.get('/api/v1/vehicles/source-other-options'), 403);
});

test('DMS-19 / SRC-16: source and custom source combine with the other list filters (AND)', async ({ staffApi }) => {
  const name = `Combined ${uniqueSuffix()}`;
  const make = `Mk${uniqueSuffix()}`;
  const inStock = await create(staffApi, { source: 'OTHER', sourceOther: name, make });
  const soldOther = await staffApi.sellVehicle(await create(staffApi, { source: 'OTHER', sourceOther: name, make }));
  const auction = await create(staffApi, { source: 'AUCTION', make });

  expect(await ids(staffApi, { sourceOther: name, status: 'SOLD' })).toEqual([soldOther.id]);
  expect(await ids(staffApi, { sourceOther: name, status: 'IN_STOCK' })).toEqual([inStock.id]);
  expect(await ids(staffApi, { q: make, source: 'OTHER' })).toEqual([inStock.id, soldOther.id].sort((a, b) => a - b));
  expect(await ids(staffApi, { q: make, source: 'AUCTION' })).toEqual([auction.id]);
  expect(await ids(staffApi, { q: make, source: 'OTHER', status: 'IN_STOCK' })).toEqual([inStock.id]);
  // A custom source matches only OTHER vehicles, so it cannot combine with another source.
  expect(await ids(staffApi, { sourceOther: name, source: 'AUCTION' })).toEqual([]);
  // The option list does not depend on the status of the vehicles.
  expect(await options(staffApi)).toContain(name);
});

test('DMS-19 / SRC-19: a custom source change is audited with old and new values', async ({ staffApi }) => {
  const name = `Audit src ${uniqueSuffix()}`;
  const v = await create(staffApi, { source: 'OTHER', sourceOther: name });
  await patched(staffApi, v, { sourceOther: `${name} new` });

  const update = await latestUpdate(staffApi, v.id);
  expect(update.fieldSummary?.sourceOther).toBe(`${name} new`);
  expect(update.previous?.sourceOther).toBe(name);
});

test('DMS-19 / SRC-12: the option list and the filter never show another dealership\'s sources', async ({
  staffApi, rivalApi,
}) => {
  const name = `Rival only ${uniqueSuffix()}`;
  await create(rivalApi, { source: 'OTHER', sourceOther: name });
  expect(await options(rivalApi)).toContain(name);
  expect(await options(staffApi)).not.toContain(name);
  expect(await list(staffApi, { sourceOther: name })).toEqual([]);
});

test('DMS-20 / ACQ-01, ACQ-02: acquired-from name and address are optional, trimmed and kept for any source', async ({
  staffApi,
}) => {
  const id = uniqueSuffix();
  const plain = await create(staffApi, { source: 'AUCTION' });
  expect(plain.acquiredFromName ?? null).toBeNull();
  expect(plain.acquiredFromAddress ?? null).toBeNull();

  const blank = await create(staffApi, { source: 'TRADE_IN', acquiredFromName: '   ', acquiredFromAddress: '' });
  expect(blank.acquiredFromName ?? null).toBeNull();
  expect(blank.acquiredFromAddress ?? null).toBeNull();

  for (const extra of [{ source: 'AUCTION' }, { source: 'OTHER', sourceOther: `Acq ${id}` }]) {
    const v = await create(staffApi, {
      ...extra, acquiredFromName: `  Jane Seller ${id}  `, acquiredFromAddress: ' 9 Elm St, Calgary, AB ',
    });
    expect(v.acquiredFromName).toBe(`Jane Seller ${id}`);
    expect(v.acquiredFromAddress).toBe('9 Elm St, Calgary, AB');
    const read = (await staffApi.getVehicle(v.id)) as SourcedVehicle;
    expect(read.acquiredFromName).toBe(`Jane Seller ${id}`);
    expect(read.acquiredFromAddress).toBe('9 Elm St, Calgary, AB');
  }
});

test('DMS-20 / ACQ-03: name is at most 120 and address at most 255 characters after trimming', async ({ staffApi }) => {
  const name = 'n'.repeat(120);
  const address = 'a'.repeat(255);
  await expectFieldError(
    await staffApi.post('/api/v1/vehicles', vehicleBody({ acquiredFromName: `${name}n` })),
    'acquiredFromName', 'At most 120 characters.');
  await expectFieldError(
    await staffApi.post('/api/v1/vehicles', vehicleBody({ acquiredFromAddress: `${address}a` })),
    'acquiredFromAddress', 'At most 255 characters.');

  const v = await create(staffApi, { acquiredFromName: `  ${name}  `, acquiredFromAddress: `  ${address}  ` });
  expect(v.acquiredFromName).toBe(name);
  expect(v.acquiredFromAddress).toBe(address);

  // The same limits apply on edit.
  await expectFieldError(await patch(staffApi, v, { acquiredFromName: `${name}n` }),
    'acquiredFromName', 'At most 120 characters.');
  await expectFieldError(await patch(staffApi, v, { acquiredFromAddress: `${address}a` }),
    'acquiredFromAddress', 'At most 255 characters.');
});

test('DMS-20 / ACQ-04: PATCH replaces the acquired-from fields, omitting clears them, and changes are audited', async ({
  staffApi,
}) => {
  const id = uniqueSuffix();
  const v = await create(staffApi, { acquiredFromName: `First Owner ${id}`, acquiredFromAddress: '1 First St' });

  const changed = await patched(staffApi, v, { acquiredFromName: `Second Owner ${id}`, acquiredFromAddress: '2 Second St' });
  expect(changed.acquiredFromName).toBe(`Second Owner ${id}`);
  expect(changed.acquiredFromAddress).toBe('2 Second St');

  const audited = await latestUpdate(staffApi, v.id);
  expect(audited.fieldSummary?.acquiredFromName).toBe(`Second Owner ${id}`);
  expect(audited.previous?.acquiredFromName).toBe(`First Owner ${id}`);
  expect(audited.fieldSummary?.acquiredFromAddress).toBe('2 Second St');
  expect(audited.previous?.acquiredFromAddress).toBe('1 First St');

  // Undefined values are left out of the JSON body, so both fields are omitted.
  const cleared = await patched(staffApi, changed, { acquiredFromName: undefined, acquiredFromAddress: undefined });
  expect(cleared.acquiredFromName ?? null).toBeNull();
  expect(cleared.acquiredFromAddress ?? null).toBeNull();
  const read = (await staffApi.getVehicle(v.id)) as SourcedVehicle;
  expect(read.acquiredFromName ?? null).toBeNull();
  expect(read.acquiredFromAddress ?? null).toBeNull();
});

test('DMS-20 / ACQ-05: the acquired-from fields of a sold vehicle are locked', async ({ staffApi }) => {
  const v = await create(staffApi, { acquiredFromName: `Locked ${uniqueSuffix()}`, acquiredFromAddress: '3 Sold Rd' });
  const s = (await staffApi.sellVehicle(v)) as SourcedVehicle;
  expect(s.soldOn).toBe(today());

  await expectError(await patch(staffApi, s, { acquiredFromName: 'Someone else' }), 409, 'SOLD_LOCKED');
  await expectError(await patch(staffApi, s, { acquiredFromAddress: null }), 409, 'SOLD_LOCKED');
  const read = (await staffApi.getVehicle(v.id)) as SourcedVehicle;
  expect(read.acquiredFromName).toBe(v.acquiredFromName);
  expect(read.acquiredFromAddress).toBe('3 Sold Rd');
});
