import { test, expect } from '../../support/fixtures';
import { aiAvailable, expectError, expectStatus, ruleIds, type Api, type Vehicle } from '../../support/api';
import { env } from '../../support/env';

// Requirements §5 (AD-01..13, AD-R01..R25) and acceptance cases AT-12..AT-20, AT-24, AT-27.

const dealer = env.dealerA;
const contacts = `${dealer.contactPhone}, ${dealer.contactEmail}, ${dealer.contactAddress}`;

/** Copy that satisfies every hard rule for a 2020 AS_IS vehicle sold for cash. */
function compliantCash(v: Pick<Vehicle, 'modelYear' | 'make' | 'model'>, price = '$18,900') {
  return {
    title: `${v.modelYear} ${v.make} ${v.model}`,
    body: `Used ${v.modelYear} ${v.make} ${v.model}, sold as-is. Cash price ${price}. ` +
      `${dealer.legalName}, ${contacts}.`,
    adKind: 'CASH' as const,
    medium: 'ONLINE' as const,
  };
}

/**
 * Copy without the dealer name: DEALER_NAME_MISSING blocks the check so the AI is skipped,
 * which keeps rule assertions on REVIEW findings fast and deterministic.
 */
function anonymous(body: string) {
  return `${body} Call ${contacts}.`;
}

async function check(api: Api, vehicleId: number, draft: Parameters<Api['saveListing']>[1]) {
  const listing = await api.saveListing(vehicleId, draft);
  return api.runCheck(listing);
}

/** Like check(), for cases that need the real AI: a 502 from the provider is an environment skip. */
async function checkWithAi(api: Api, vehicleId: number, draft: Parameters<Api['saveListing']>[1]) {
  const result = await check(api, vehicleId, draft);
  test.skip(result.httpStatus === 502, 'AI provider returned 502 AI_UNAVAILABLE (environment)');
  return result;
}

test.describe('rules that block (AI skipped)', () => {
  test('AT-12 / AD-R07 / AD-07: a CASH ad without a price is BLOCKED and AI is not called', async ({ staffApi }) => {
    const v = await staffApi.createVehicle();
    const { httpStatus, check: result } = await check(staffApi, v.id, {
      ...compliantCash(v), body: `Used 2020 Toyota Camry, sold as-is. ${dealer.legalName}, ${contacts}.`,
    });
    expect(httpStatus).toBe(200);
    expect(result.checkStatus).toBe('BLOCKED');
    expect(result.aiStatus).toBe('SKIPPED');
    expect(ruleIds(result, 'BLOCK')).toContain('PRICE_MISSING');
  });

  test('AT-13 / AD-R10: a FINANCE ad with a payment but no APR is BLOCKED', async ({ staffApi }) => {
    const v = await staffApi.createVehicle();
    const { check: result } = await check(staffApi, v.id, {
      ...compliantCash(v), adKind: 'FINANCE',
      body: `${compliantCash(v).body} Finance from $299 per month for 72 months.`,
    });
    expect(result.checkStatus).toBe('BLOCKED');
    expect(ruleIds(result, 'BLOCK')).toContain('FINANCE_APR_MISSING');
  });

  test('AT-16 / AD-R08: AS_IS vehicle advertised as certified is CONDITION_MISMATCH', async ({ staffApi }) => {
    const v = await staffApi.createVehicle({ conditionCode: 'AS_IS' });
    const { check: result } = await check(staffApi, v.id, {
      ...compliantCash(v), body: `${compliantCash(v).body} Certified pre-owned!`,
    });
    expect(ruleIds(result, 'BLOCK')).toContain('CONDITION_MISMATCH');
  });

  test('AD-R08: AS_IS / UNFIT / IRREPARABLE not stated is CONDITION_UNDISCLOSED', async ({ staffApi }) => {
    for (const conditionCode of ['AS_IS', 'UNFIT', 'IRREPARABLE']) {
      const v = await staffApi.createVehicle({ conditionCode });
      const { check: result } = await check(staffApi, v.id, {
        ...compliantCash(v), body: `Used 2020 Toyota Camry. Cash price $18,900. ${dealer.legalName}, ${contacts}.`,
      });
      expect(ruleIds(result, 'BLOCK'), conditionCode).toContain('CONDITION_UNDISCLOSED');
    }
  });

  test('AD-R01 / AD-R02: dealer name and all contacts missing block; partial contact is REVIEW', async ({ staffApi }) => {
    const v = await staffApi.createVehicle();
    const noDealer = await check(staffApi, v.id, {
      ...compliantCash(v), body: 'Used 2020 Toyota Camry, sold as-is. Cash price $18,900.',
    });
    expect(ruleIds(noDealer.check, 'BLOCK')).toEqual(
      expect.arrayContaining(['DEALER_NAME_MISSING', 'DEALER_CONTACT_MISSING']));

    const partial = await check(staffApi, v.id, {
      ...compliantCash(v), body: `Used 2020 Toyota Camry, sold as-is. Cash price $18,900. Call ${dealer.contactPhone}.`,
    });
    expect(ruleIds(partial.check, 'REVIEW')).toContain('DEALER_CONTACT_INCOMPLETE');
    expect(ruleIds(partial.check, 'BLOCK')).not.toContain('DEALER_CONTACT_MISSING');
  });

  test('AT-24 / AD-04: a payment in CASH copy triggers the finance rules', async ({ staffApi }) => {
    const v = await staffApi.createVehicle();
    const base = `Used 2020 Toyota Camry, sold as-is. ${dealer.legalName}, ${contacts}.`;

    const first = await check(staffApi, v.id, { ...compliantCash(v), body: `${base} Only $299 per month.` });
    expect(first.check.checkStatus).toBe('BLOCKED');
    expect(ruleIds(first.check, 'BLOCK')).toEqual(
      expect.arrayContaining(['FINANCE_APR_MISSING', 'FINANCE_CASH_PRICE_MISSING']));

    const second = await check(staffApi, v.id, { ...compliantCash(v), body: `${base} Only $299 per month at 6.9% APR.` });
    expect(ruleIds(second.check, 'BLOCK')).toEqual(['FINANCE_CASH_PRICE_MISSING']);
  });

  test('AD-R20 / AD-R23: a LEASE ad without the lease statement or APR is BLOCKED', async ({ staffApi }) => {
    const v = await staffApi.createVehicle();
    const { check: result } = await check(staffApi, v.id, { ...compliantCash(v), adKind: 'LEASE' });
    expect(ruleIds(result, 'BLOCK')).toEqual(expect.arrayContaining(['LEASE_STATEMENT_MISSING', 'LEASE_APR_MISSING']));
  });

  test('AT-15 / AD-R25: 19,999 km/year needs an excess-km charge; 20,000 does not', async ({ staffApi }) => {
    const v = await staffApi.createVehicle();
    const lease = (km: string) => ({
      ...compliantCash(v), adKind: 'LEASE' as const,
      body: anonymous(`Lease a used 2020 Toyota Camry, sold as-is. Cash price $18,900. ` +
        `$399 per month for 36 months at 4.9% APR, $2,000 down. ${km} km per year.`),
    });
    const at19999 = await check(staffApi, v.id, lease('19,999'));
    expect(ruleIds(at19999.check, 'BLOCK')).toContain('LEASE_EXCESS_KM_MISSING');

    const at20000 = await check(staffApi, v.id, lease('20,000'));
    expect(ruleIds(at20000.check)).not.toContain('LEASE_EXCESS_KM_MISSING');
    expect(ruleIds(at20000.check)).not.toContain('LEASE_ALLOWANCE_UNSTATED');
  });
});

test.describe('advisory rules (REVIEW)', () => {
  test('AD-R03..R06 / AD-R21..R24: soft findings are reported as REVIEW', async ({ staffApi }) => {
    const v = await staffApi.createVehicle({ modelYear: 2020 });
    const soft = await check(staffApi, v.id, {
      ...compliantCash(v), title: 'Toyota Camry',
      body: anonymous('Brand new Toyota Camry, police interceptor package, sold as-is. Cash price $18,900. Warranty included.'),
    });
    expect(ruleIds(soft.check, 'REVIEW')).toEqual(expect.arrayContaining([
      'YEAR_NOT_IN_COPY', 'YEAR_NEW_USED_CONTRADICTION', 'PRIOR_USE_UNCLEAR', 'WARRANTY_CLAIM_NEEDS_REVIEW',
    ]));

    const lease = await check(staffApi, v.id, {
      ...compliantCash(v), adKind: 'LEASE',
      body: anonymous('Lease this used 2020 Toyota Camry, sold as-is, at 4.9% APR. Cash price $18,900.'),
    });
    expect(ruleIds(lease.check, 'REVIEW')).toEqual(expect.arrayContaining([
      'LEASE_TERM_MISSING', 'LEASE_RENT_MISSING', 'LEASE_DOWN_MISSING', 'LEASE_ALLOWANCE_UNSTATED',
    ]));
  });

  test('AD-R11: APR proximity is raised for online finance ads only', async ({ staffApi }) => {
    const v = await staffApi.createVehicle();
    const finance = (medium: 'ONLINE' | 'RADIO_TV_BILLBOARD') => ({
      ...compliantCash(v), adKind: 'FINANCE' as const, medium,
      body: anonymous('Used 2020 Toyota Camry, sold as-is. Cash price $18,900. $299 per month at 6.9% APR for 72 months.'),
    });
    expect(ruleIds((await check(staffApi, v.id, finance('ONLINE'))).check)).toContain('FINANCE_APR_PROXIMITY');
    expect(ruleIds((await check(staffApi, v.id, finance('RADIO_TV_BILLBOARD'))).check)).not.toContain('FINANCE_APR_PROXIMITY');
  });

  test('AT-14 / AD-R14: broadcast exempts proximity only; term is REVIEW and APR still blocks', async ({ staffApi }) => {
    test.setTimeout(60_000); // the first check has no BLOCK, so it calls the AI
    const v = await staffApi.createVehicle();
    const broadcast = (apr: string) => ({
      ...compliantCash(v), adKind: 'FINANCE' as const, medium: 'RADIO_TV_BILLBOARD' as const,
      body: `${compliantCash(v).body} Finance available.${apr}`,
    });
    const first = await check(staffApi, v.id, broadcast(' Rates from 6.9% APR.'));
    expect(ruleIds(first.check, 'BLOCK')).toEqual([]);
    expect(ruleIds(first.check, 'REVIEW')).toContain('FINANCE_TERM_MISSING');
    expect(ruleIds(first.check)).not.toContain('FINANCE_APR_PROXIMITY');

    const second = await check(staffApi, v.id, broadcast(''));
    expect(second.check.checkStatus).toBe('BLOCKED');
    expect(ruleIds(second.check, 'BLOCK')).toContain('FINANCE_APR_MISSING');
  });
});

test.describe('listing lifecycle', () => {
  test('AD-01: a vehicle starts with a virtual draft that is not persisted', async ({ staffApi }) => {
    const v = await staffApi.createVehicle();
    for (let i = 0; i < 2; i++) {
      const listing = await staffApi.getListing(v.id);
      expect(listing.id, 'id 0 marks the unsaved virtual draft (contract §7.1)').toBe(0);
      expect(listing.checkStatus).toBe('NEEDS_AI');
      expect(listing.adKind).toBe('CASH');
    }
  });

  test('AD-12: Ready and export are refused without a pass', async ({ staffApi }) => {
    const v = await staffApi.createVehicle();
    let listing = await staffApi.saveListing(v.id, compliantCash(v));
    await expectError(await staffApi.post(`/api/v1/listings/${listing.id}/ready`, { version: listing.version }), 409, 'NOT_PASSED');
    await expectError(await staffApi.post(`/api/v1/listings/${listing.id}/exports`, { version: listing.version }), 409, 'NOT_PASSED');

    listing = await staffApi.saveListing(v.id, { ...compliantCash(v), body: 'no price' });
    await staffApi.runCheck(listing);
    listing = await staffApi.getListing(v.id);
    expect(listing.checkStatus).toBe('BLOCKED');
    await expectError(await staffApi.post(`/api/v1/listings/${listing.id}/ready`, { version: listing.version }), 409, 'NOT_PASSED');
  });

  test('AD-10 / AD-11: a check records the content version; editing after BLOCKED returns to NEEDS_AI', async ({ staffApi }) => {
    const v = await staffApi.createVehicle();
    const listing = await staffApi.saveListing(v.id, { ...compliantCash(v), body: 'no price' });
    const { check: result } = await staffApi.runCheck(listing);
    expect(result.contentVersion).toBe(listing.contentVersion);

    const edited = await staffApi.saveListing(v.id, { ...compliantCash(v), body: 'still no price' });
    expect(edited.contentVersion).toBeGreaterThan(listing.contentVersion);
    expect(edited.checkStatus).toBe('NEEDS_AI');
  });

  test('listing writes use optimistic locking', async ({ staffApi }) => {
    const v = await staffApi.createVehicle();
    const listing = await staffApi.saveListing(v.id, compliantCash(v));
    await staffApi.saveListing(v.id, { ...compliantCash(v), title: 'changed' });
    await expectError(await staffApi.post(`/api/v1/listings/${listing.id}/checks`, { version: listing.version }), 409, 'VERSION_CONFLICT');
  });
});

test.describe('with the real AI', () => {
  test.describe.configure({ timeout: 90_000 });

  test('AT-18 / AD-09: AI unavailable is stored and never treated as passed', async ({ staffApi, request }) => {
    test.skip(await aiAvailable(request), 'AI service is UP; AT-18 needs it stopped');
    const v = await staffApi.createVehicle();
    const { httpStatus, check: result } = await check(staffApi, v.id, compliantCash(v));
    expect(httpStatus).toBe(502);
    expect(result.checkStatus).toBe('AI_UNAVAILABLE');
    const listing = await staffApi.getListing(v.id);
    await expectError(await staffApi.post(`/api/v1/listings/${listing.id}/ready`, { version: listing.version }), 409, 'NOT_PASSED');
  });

  test('AT-17 / AT-20 / AD-08 / AD-13: a compliant ad passes, goes Ready and exports public data only', async ({
    staffApi, request,
  }) => {
    test.skip(!(await aiAvailable(request)), 'AI service is not UP');
    const v = await staffApi.createVehicle({ purchaseCost: 13579 });
    const customer = await staffApi.createCustomer();
    await expectStatus(await staffApi.put(`/api/v1/customers/${customer.id}/vehicles/${v.id}`), 200);

    const { httpStatus, check: result } = await checkWithAi(staffApi, v.id, compliantCash(v));
    expect(httpStatus).toBe(200);
    expect(result.checkStatus).toBe('PASSED');
    expect(result.aiStatus).toBe('SUCCESS');
    expect(Array.isArray(result.aiNotes ?? [])).toBeTruthy();

    let listing = await staffApi.getListing(v.id);
    const ready = await staffApi.post(`/api/v1/listings/${listing.id}/ready`, { version: listing.version });
    await expectStatus(ready, 200);
    expect((await ready.json()).status).toBe('READY');

    listing = await staffApi.getListing(v.id);
    const exported = await staffApi.post(`/api/v1/listings/${listing.id}/exports`, { version: listing.version });
    await expectStatus(exported, 200);
    expect(exported.headers()['content-type']).toContain('text/plain');
    const txt = await exported.text();
    for (const expected of [dealer.legalName, dealer.contactEmail, v.vin, v.make, v.model, String(v.modelYear), listing.title]) {
      expect(txt, `TXT should contain ${expected}`).toContain(expected);
    }
    expect(txt).toMatch(/not legal advice/i);
    for (const forbidden of ['13579', '13,579', customer.name, customer.email, customer.phone]) {
      expect(txt, `TXT must not contain ${forbidden}`).not.toContain(forbidden);
    }
  });

  test('AT-19 / AD-11: a price edit after a pass makes the check STALE and export is refused', async ({
    staffApi, request,
  }) => {
    test.skip(!(await aiAvailable(request)), 'AI service is not UP');
    const v = await staffApi.createVehicle();
    const { check: result } = await checkWithAi(staffApi, v.id, compliantCash(v));
    expect(result.checkStatus).toBe('PASSED');

    const edited = await staffApi.saveListing(v.id, compliantCash(v, '$17,500'));
    expect(edited.checkStatus).toBe('STALE');
    await expectError(await staffApi.post(`/api/v1/listings/${edited.id}/exports`, { version: edited.version }), 409, 'CHECK_STALE');
    await expectError(await staffApi.post(`/api/v1/listings/${edited.id}/ready`, { version: edited.version }), 409, 'CHECK_STALE');
  });

  test('DMS-15: a condition change stales a pass; a cost change does not', async ({ staffApi, request }) => {
    test.skip(!(await aiAvailable(request)), 'AI service is not UP');
    const v = await staffApi.createVehicle({ conditionCode: 'AS_IS' });
    const { check: result } = await checkWithAi(staffApi, v.id, compliantCash(v));
    expect(result.checkStatus).toBe('PASSED');

    const editBody = (current: Vehicle, change: object) => ({
      make: current.make, model: current.model, modelYear: current.modelYear, vin: current.vin,
      source: current.source, purchaseCost: current.purchaseCost, addedOn: current.addedOn,
      conditionCode: current.conditionCode, repairCost: current.repairCost, carfaxUrl: current.carfaxUrl,
      version: current.version, ...change,
    });
    let current = await staffApi.getVehicle(v.id);
    await expectStatus(await staffApi.patch(`/api/v1/vehicles/${v.id}`, editBody(current, { purchaseCost: 9999 })), 200);
    expect((await staffApi.getListing(v.id)).checkStatus).toBe('PASSED');

    current = await staffApi.getVehicle(v.id);
    await expectStatus(await staffApi.patch(`/api/v1/vehicles/${v.id}`, editBody(current, { conditionCode: 'CERTIFIED' })), 200);
    expect((await staffApi.getListing(v.id)).checkStatus).toBe('STALE');
  });

  test('AT-27: REVIEW findings do not veto a pass', async ({ staffApi, request }) => {
    test.skip(!(await aiAvailable(request)), 'AI service is not UP');
    const v = await staffApi.createVehicle();
    const { check: result } = await checkWithAi(staffApi, v.id, {
      ...compliantCash(v), title: 'Toyota Camry',
      body: `Used Toyota Camry, sold as-is. Cash price $18,900. ${dealer.legalName}, ${contacts}.`,
    });
    expect(ruleIds(result, 'REVIEW')).toContain('YEAR_NOT_IN_COPY');
    expect(result.checkStatus).toBe('PASSED');
  });
});
