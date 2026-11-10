import { test, expect } from '../../support/fixtures';
import { expectError, expectStatus, today, uniqueSuffix, vehicleBody, type Api, type Vehicle } from '../../support/api';

// DMS-19 (requirements/iteration-3/CR-Vehicle-Source-Other-2026-11-09.md, design/21): source OTHER
// carries a required custom source name, the list filters by source and by that name, and the
// option list behind the second-level filter is per dealership and case-insensitive.

type SourcedVehicle = Vehicle & { sourceOther: string | null };

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

async function create(api: Api, overrides: Record<string, unknown>) {
  return (await api.createVehicle(overrides)) as SourcedVehicle;
}

test('DMS-19 / SRC-01: OTHER needs a custom source; it is trimmed and kept only for OTHER', async ({ staffApi }) => {
  for (const sourceOther of [undefined, null, '', '   ']) {
    const res = await staffApi.post('/api/v1/vehicles', vehicleBody({ source: 'OTHER', sourceOther }));
    const text = await res.text();
    expect(res.status(), `sourceOther=${JSON.stringify(sourceOther)}: ${text}`).toBe(400);
    const error = JSON.parse(text);
    expect(error.code).toBe('VALIDATION');
    expect(error.fieldErrors?.sourceOther).toBe('Enter the source when Other is selected.');
  }
  await expectError(
    await staffApi.post('/api/v1/vehicles', vehicleBody({ source: 'OTHER', sourceOther: 'x'.repeat(101) })),
    400, 'VALIDATION');

  const name = `Lease return ${uniqueSuffix()}`;
  const other = await create(staffApi, { source: 'OTHER', sourceOther: `  ${name}  ` });
  expect(other.sourceOther).toBe(name);

  const auction = await create(staffApi, { source: 'AUCTION', sourceOther: 'ignored' });
  // The API omits null fields, as for soldOn.
  expect(auction.sourceOther ?? null).toBeNull();
});

test('DMS-19 / SRC-02: list filters by source and by custom source, ignoring case', async ({ staffApi }) => {
  const name = `Fleet sale ${uniqueSuffix()}`;
  const a = await create(staffApi, { source: 'OTHER', sourceOther: name });
  const b = await create(staffApi, { source: 'OTHER', sourceOther: `${name.toLowerCase()} ` });
  const auction = await create(staffApi, { source: 'AUCTION' });

  const byName = (await list(staffApi, { sourceOther: name.toUpperCase() })).map((v) => v.id).sort();
  expect(byName).toEqual([a.id, b.id].sort());

  const allOther = await list(staffApi, { source: 'OTHER' });
  expect(allOther.every((v) => v.source === 'OTHER')).toBe(true);
  expect(allOther.map((v) => v.id)).not.toContain(auction.id);

  // The two spellings are one option, written as on the most recently added vehicle.
  const matching = (await options(staffApi)).filter((o) => o.toLowerCase() === name.toLowerCase());
  expect(matching).toEqual([name.toLowerCase()]);
});

test('DMS-19 / SRC-03: switching away from OTHER clears the custom source', async ({ staffApi }) => {
  const name = `Dealer transfer ${uniqueSuffix()}`;
  const v = await create(staffApi, { source: 'OTHER', sourceOther: name });

  const res = await staffApi.patch(`/api/v1/vehicles/${v.id}`, vehicleBody({
    ...v, version: v.version, source: 'TRADE_IN', sourceOther: name,
  }));
  await expectStatus(res, 200);
  const saved = (await res.json()) as SourcedVehicle;
  expect(saved.source).toBe('TRADE_IN');
  expect(saved.sourceOther ?? null).toBeNull();
  expect(await options(staffApi)).not.toContain(name);

  // Back to OTHER without a name is refused.
  await expectError(await staffApi.patch(`/api/v1/vehicles/${v.id}`, vehicleBody({
    ...saved, version: saved.version, source: 'OTHER', sourceOther: null,
  })), 400, 'VALIDATION');
});

test('DMS-19 / SRC-05: the custom source of a sold vehicle is locked', async ({ staffApi }) => {
  const v = await create(staffApi, { source: 'OTHER', sourceOther: `Estate sale ${uniqueSuffix()}` });
  const sold = await staffApi.post(`/api/v1/vehicles/${v.id}/sell`, {
    soldOn: today(), soldPrice: 18900, version: v.version, buyerName: 'E2E Walk-in Buyer',
  });
  await expectStatus(sold, 200);
  const s = (await sold.json()) as SourcedVehicle;

  await expectError(await staffApi.patch(`/api/v1/vehicles/${v.id}`, vehicleBody({
    ...s, version: s.version, sourceOther: 'Something else',
  })), 409, 'SOLD_LOCKED');
  // Sold vehicles still feed the option list.
  expect(await options(staffApi)).toContain(s.sourceOther);
});

test('DMS-19: the option list and the filter never show another dealership\'s sources', async ({
  staffApi, rivalApi,
}) => {
  const name = `Rival only ${uniqueSuffix()}`;
  await create(rivalApi, { source: 'OTHER', sourceOther: name });
  expect(await options(rivalApi)).toContain(name);
  expect(await options(staffApi)).not.toContain(name);
  expect(await list(staffApi, { sourceOther: name })).toEqual([]);
});
