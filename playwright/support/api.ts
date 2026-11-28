import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { env } from './env';

export type LoginResponse = { accessToken: string; role: string; displayName: string };

export async function apiLogin(request: APIRequestContext, identifier: string, password: string) {
  const res = await request.post(`${env.gatewayUrl}/api/v1/auth/login`, {
    data: { identifier, password },
  });
  expect(res.status(), `login as ${identifier}`).toBe(200);
  return (await res.json()) as LoginResponse;
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** True when the gateway reports the AI service as UP; AI-dependent cases skip otherwise. */
export async function aiAvailable(request: APIRequestContext) {
  const res = await request.get(`${env.gatewayUrl}/actuator/health`);
  if (!res.ok()) return false;
  const body = (await res.json()) as { components?: { ai?: { status?: string } } };
  return body.components?.ai?.status === 'UP';
}

export type Vehicle = {
  id: number; vin: string; make: string; model: string; modelYear: number; source: string;
  purchaseCost: number; addedOn: string; conditionCode: string; repairCost: number | null;
  carfaxUrl: string | null; soldOn: string | null; soldPrice: number | null; status: string;
  linkedCustomer: { id: number; name: string } | null; version: number;
};

export type Customer = {
  id: number; name: string; email: string; phone: string; homeAddress: string;
  linkedVehicles: { id: number; status: string }[]; version: number;
};

export type Finding = { ruleId: string; severity: 'BLOCK' | 'REVIEW'; passed: boolean; message: string };

export type Check = {
  id: number; contentVersion: number; ruleFindings: Finding[]; aiStatus: string;
  aiNotes: { message: string }[] | null; recommendation: string; checkStatus: string;
};

export type Listing = {
  id: number | null; vehicleId: number; title: string; body: string; adKind: string; medium: string;
  status: string; contentVersion: number; lastCheck: Check | null; checkStatus: string; version: number;
};

export type ListingDraft = {
  title?: string; body?: string; adKind?: 'CASH' | 'FINANCE' | 'LEASE';
  medium?: 'ONLINE' | 'RADIO_TV_BILLBOARD'; priorUse?: string | null;
  warrantyTerms?: string | null; annualKmAllowance?: number | null;
};

const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';

// Model-year codes of the VIN's 10th character for 1980-2009, repeating every 30 years; must match
// VinYearCodes in backend/dotnet/DealerOps.Core/Vehicle/VehicleService.cs (D-8).
const VIN_YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789';

/** The VIN's 10th character for a model year (D-8). */
export function vinYearCode(modelYear: number) {
  return VIN_YEAR_CODES[(modelYear - 1980) % VIN_YEAR_CODES.length];
}

// World manufacturer identifier that vPIC does not assign, so a decode of these VINs answers "no
// vehicle for this VIN" and the server keeps its D-9 fallback (the model-year character check).
// Without it a random prefix decodes to a real manufacturer and every generated make is refused.
const UNASSIGNED_WMI = 'ZZZ';

/**
 * Random 17-character VIN without I/O/Q (DMS-04); unique enough per run. With a model year the
 * 10th character carries that year's code, which the server requires (D-8). The VIN carries an
 * unassigned WMI so the make and model entered by a test are not checked against a vPIC decode
 * (D-9); the decode match itself is exercised with real VINs in the catalog specs.
 */
export function randomVin(modelYear?: number) {
  const chars = Array.from({ length: 17 }, () => VIN_CHARS[Math.floor(Math.random() * VIN_CHARS.length)]);
  for (let i = 0; i < UNASSIGNED_WMI.length; i++) chars[i] = UNASSIGNED_WMI[i];
  if (modelYear != null && modelYear >= 1980) chars[9] = vinYearCode(modelYear);
  return chars.join('');
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function uniqueSuffix() {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Ten random digits, used to build per-test unique customer phones. */
export function randomDigits(length = 7) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

export function vehicleBody(overrides: Record<string, unknown> = {}) {
  // The VIN's model-year code must match the year (D-8), so it follows the overridden year.
  const modelYear = (overrides.modelYear as number) ?? 2020;
  return {
    make: 'Toyota',
    model: 'Camry',
    modelYear,
    vin: randomVin(modelYear),
    source: 'AUCTION',
    purchaseCost: 14200,
    addedOn: '2026-09-01',
    conditionCode: 'AS_IS',
    repairCost: 800,
    carfaxUrl: null,
    ...overrides,
  };
}

export function customerBody(overrides: Record<string, unknown> = {}) {
  const id = uniqueSuffix();
  return {
    name: `E2E Customer ${id}`,
    email: `e2e.${id}@example.com`,
    phone: `+1403${randomDigits(7)}`,
    homeAddress: '12 Oak St, Calgary, AB',
    ...overrides,
  };
}

/** Thin gateway client bound to one signed-in identity. */
export class Api {
  constructor(private readonly request: APIRequestContext, readonly token: string) {}

  static async as(request: APIRequestContext, identifier: string, password: string) {
    const login = await apiLogin(request, identifier, password);
    return new Api(request, login.accessToken);
  }

  private opts(data?: unknown, params?: Record<string, string | number>) {
    return { headers: authHeaders(this.token), data, params };
  }

  get(path: string, params?: Record<string, string | number>) {
    return this.request.get(`${env.gatewayUrl}${path}`, this.opts(undefined, params));
  }
  post(path: string, data?: unknown) {
    return this.request.post(`${env.gatewayUrl}${path}`, this.opts(data ?? {}));
  }
  patch(path: string, data: unknown) {
    return this.request.patch(`${env.gatewayUrl}${path}`, this.opts(data));
  }
  put(path: string, data?: unknown) {
    return this.request.put(`${env.gatewayUrl}${path}`, this.opts(data));
  }
  delete(path: string) {
    return this.request.delete(`${env.gatewayUrl}${path}`, this.opts());
  }

  async createVehicle(overrides: Record<string, unknown> = {}) {
    const res = await this.post('/api/v1/vehicles', vehicleBody(overrides));
    await expectStatus(res, 201);
    return (await res.json()) as Vehicle;
  }

  async getVehicle(id: number) {
    const res = await this.get(`/api/v1/vehicles/${id}`);
    await expectStatus(res, 200);
    return (await res.json()) as Vehicle;
  }

  /** A sale needs a buyer (D8): defaults to "Other" with a typed name. */
  async sellVehicle(v: Vehicle, soldPrice = 18900, soldOn = today(), buyerName = 'E2E Walk-in Buyer') {
    const res = await this.post(`/api/v1/vehicles/${v.id}/sell`, { soldOn, soldPrice, version: v.version, buyerName });
    await expectStatus(res, 200);
    return (await res.json()) as Vehicle;
  }

  async createCustomer(overrides: Record<string, unknown> = {}) {
    const res = await this.post('/api/v1/customers', customerBody(overrides));
    await expectStatus(res, 201);
    return (await res.json()) as Customer;
  }

  async getListing(vehicleId: number) {
    const res = await this.get(`/api/v1/vehicles/${vehicleId}/listing`);
    await expectStatus(res, 200);
    return (await res.json()) as Listing;
  }

  /** Saves the ad draft (creating it on first save) and returns the persisted listing. */
  async saveListing(vehicleId: number, draft: ListingDraft) {
    const current = await this.getListing(vehicleId);
    const res = await this.patch(`/api/v1/vehicles/${vehicleId}/listing`, {
      priorUse: null, warrantyTerms: null, annualKmAllowance: null,
      ...draft,
      version: current.version,
    });
    await expectStatus(res, 200);
    return (await res.json()) as Listing;
  }

  /**
   * Runs a check. A 502 AI_UNAVAILABLE still persists the check, so the result is then read
   * back from the listing; callers inspect `httpStatus` when the distinction matters.
   */
  async runCheck(listing: Listing) {
    const res = await this.post(`/api/v1/listings/${listing.id}/checks`, { version: listing.version });
    const httpStatus = res.status();
    if (httpStatus === 200) return { httpStatus, check: (await res.json()) as Check };
    expect(httpStatus, await res.text()).toBe(502);
    const after = await this.getListing(listing.vehicleId);
    return { httpStatus, check: after.lastCheck as Check };
  }
}

/**
 * Saves a compliant cash ad for a 2020 AS_IS vehicle, runs the real check and, when it passes,
 * marks the ad ready so the vehicle appears on the buyer site. Returns the check's HTTP status;
 * a 502 means the AI provider was unavailable and nothing was marked ready.
 */
export async function publishAd(api: Api, v: Vehicle) {
  const dealer = env.dealerA;
  const listing = await api.saveListing(v.id, {
    title: `Used ${v.modelYear} ${v.make} ${v.model}`,
    body: `Used ${v.modelYear} ${v.make} ${v.model}, sold as-is. Price $16,995 plus HST and licensing. `
      + 'Not used as a taxi, police vehicle, or daily rental. No extended warranty offered. '
      + `${dealer.legalName}, ${dealer.contactPhone}, ${dealer.contactEmail}, ${dealer.contactAddress}.`,
    adKind: 'CASH',
    medium: 'ONLINE',
  });
  const { httpStatus, check } = await api.runCheck(listing);
  if (httpStatus !== 200) return httpStatus;
  expect(check.checkStatus, JSON.stringify(check)).toBe('PASSED');
  const fresh = await api.getListing(v.id);
  await expectStatus(await api.post(`/api/v1/listings/${fresh.id}/ready`, { version: fresh.version }), 200);
  return httpStatus;
}

/** A throwaway dealership created by a spec. */
export type TestDealership = { id: number; legalName: string; version: number };

/** A seeded member with its own gateway client. */
export type TestMember = {
  username: string; displayName: string; email: string; password: string; token: string; api: Api;
};

/**
 * Creates a throwaway dealership. Specs that change roles or memberships use their own dealership
 * so the seeded E2E Motors / E2E Rival Autos tiers stay as global.setup.ts left them.
 */
export async function createDealership(adminApi: Api, prefix = 'E2E Dealer'): Promise<TestDealership> {
  const id = uniqueSuffix();
  const res = await adminApi.post('/api/v1/admin/dealers', {
    legalName: `${prefix} ${id}`,
    contactPhone: '403-555-0166',
    contactEmail: `e2e.dealer.${id}@example.com`,
    contactAddress: '6 Roles Road, Calgary, AB',
  });
  await expectStatus(res, 201);
  return (await res.json()) as TestDealership;
}

function memberAccount(prefix: string) {
  const id = uniqueSuffix();
  return {
    username: `${prefix}.${id}`, displayName: `E2E ${prefix} ${id}`, email: `${prefix}.${id}@example.com`,
    password: 'e2e-member-pass-1',
  };
}

async function signIn(request: APIRequestContext, account: { username: string; password: string }) {
  const login = await apiLogin(request, account.username, account.password);
  return { token: login.accessToken, api: new Api(request, login.accessToken) };
}

/**
 * Binds the dealership's first owner. The platform admin's bind of a dealership with no active
 * owner is the only direct binding there is, and it makes that login the owner (CR role
 * hierarchy §2): an empty dealership has nobody who could approve a join request.
 */
export async function bindOwner(
  request: APIRequestContext, adminApi: Api, dealerId: number, prefix = 'e2e.owner',
): Promise<TestMember> {
  const account = memberAccount(prefix);
  const res = await adminApi.post(`/api/v1/admin/dealers/${dealerId}/members`, account);
  await expectStatus(res, 201);
  expect(((await res.json()) as { dealerRole: string }).dealerRole).toBe('OWNER');
  return { ...account, ...(await signIn(request, account)) };
}

/**
 * Adds a member below the owner. Once a dealership has an owner the admin's bind only files a
 * join request (202), the owner approves it and the applicant joins as SALES; a manager is then
 * appointed by the admin, which is the same tier change the owner could make.
 */
export async function addMember(
  request: APIRequestContext, adminApi: Api, dealerId: number, owner: Pick<TestMember, 'api'>,
  role: 'MANAGER' | 'SALES' = 'SALES', prefix = 'e2e.member',
): Promise<TestMember> {
  const account = memberAccount(prefix);
  const filed = await adminApi.post(`/api/v1/admin/dealers/${dealerId}/members`, account);
  await expectStatus(filed, 202);
  await expectStatus(
    await owner.api.post(`/api/v1/dealer/join-requests/${encodeURIComponent(account.username)}/approve`), 204);
  if (role !== 'SALES')
    await expectStatus(
      await adminApi.put(`/api/v1/admin/dealers/${dealerId}/members/${account.username}/role`, { dealerRole: role }),
      204);
  return { ...account, ...(await signIn(request, account)) };
}

/** The signed-in member's dealership id and tier. */
export async function meOf(api: Api) {
  const res = await api.get('/api/v1/me');
  await expectStatus(res, 200);
  return (await res.json()) as { dealerId: number | null; dealerRole: string | null };
}

export async function expectStatus(res: APIResponse, status: number) {
  expect(res.status(), `${res.url()} → ${await res.text()}`).toBe(status);
}

export async function expectError(res: APIResponse, status: number, code: string) {
  const text = await res.text();
  expect(res.status(), `${res.url()} → ${text}`).toBe(status);
  expect(JSON.parse(text).code, text).toBe(code);
}

export function ruleIds(check: Check, severity?: 'BLOCK' | 'REVIEW') {
  return check.ruleFindings.filter((f) => !severity || f.severity === severity).map((f) => f.ruleId);
}
