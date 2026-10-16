import { deflateSync } from 'node:zlib';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { test, expect } from '../../support/fixtures';
import { Api, authHeaders, expectError, expectStatus, uniqueSuffix } from '../../support/api';
import { env } from '../../support/env';

// design/14 §4.6 (vehicle catalog, VIN decode, public dealer directory; all anonymous)
// and §4.8 Image Studio photos (design/21 §6, IMG-01..05).

const CATALOG = `${env.gatewayUrl}/api/v1/catalog`;
const KNOWN_VIN = '1HGCM82633A004352';

/**
 * vPIC is a third-party service. A 502 CATALOG_UNAVAILABLE is the contract's answer when it is
 * down, so the case is skipped as an environment issue rather than reported as a defect.
 */
async function skipIfCatalogDown(res: APIResponse) {
  if (res.status() !== 502) return;
  const body = await res.text();
  test.skip(body.includes('CATALOG_UNAVAILABLE'), `NHTSA vPIC unavailable: ${body}`);
}

async function anonGet(request: APIRequestContext, path: string) {
  // No Authorization header: every GET /api/v1/catalog/** is anonymous.
  return request.get(`${CATALOG}${path}`);
}

function isSortedIgnoringCase(values: string[]) {
  return values.every((v, i) => i === 0 || values[i - 1].toLowerCase() <= v.toLowerCase());
}

test.describe('catalog (§4.6, anonymous)', () => {
  test('§4.6: makes are a sorted, de-duplicated array of trimmed names, served without a JWT', async ({ request }) => {
    const res = await anonGet(request, '/makes');
    await skipIfCatalogDown(res);
    await expectStatus(res, 200);
    const makes = (await res.json()) as string[];
    expect(Array.isArray(makes)).toBe(true);
    expect(makes.length).toBeGreaterThan(10);
    for (const m of makes) {
      expect(typeof m).toBe('string');
      expect(m, 'trimmed').toBe(m.trim());
      expect(m.length).toBeGreaterThan(0);
    }
    const lower = makes.map((m) => m.toLowerCase());
    expect(new Set(lower).size, 'de-duplicated ignoring case').toBe(makes.length);
    expect(isSortedIgnoringCase(makes), 'sorted').toBe(true);
    expect(lower).toContain('toyota');
    expect(lower).toContain('honda');
  });

  test('§4.6: models for a make are sorted and de-duplicated; missing make is 400; unknown make is 404', async ({
    request,
  }) => {
    const res = await anonGet(request, '/models?make=Toyota');
    await skipIfCatalogDown(res);
    await expectStatus(res, 200);
    const models = (await res.json()) as string[];
    expect(models).toContain('Camry');
    expect(models).toContain('Corolla');
    expect(new Set(models.map((m) => m.toLowerCase())).size).toBe(models.length);
    expect(isSortedIgnoringCase(models), 'sorted').toBe(true);
    for (const m of models) expect(m).toBe(m.trim());

    await expectError(await anonGet(request, '/models'), 400, 'VALIDATION');
    await expectError(await anonGet(request, '/models?make='), 400, 'VALIDATION');

    const unknown = await anonGet(request, `/models?make=Zzq${uniqueSuffix()}`);
    await skipIfCatalogDown(unknown);
    await expectError(unknown, 404, 'NOT_FOUND');
  });

  test('§4.6.1 / VIN-03: VIN decode is public and maps vPIC facts and bodyType', async ({ request }) => {
    const res = await anonGet(request, `/vin/${KNOWN_VIN}`);
    await skipIfCatalogDown(res);
    await expectStatus(res, 200);
    const body = await res.json();
    expect(body).toMatchObject({
      vin: KNOWN_VIN,
      make: 'HONDA',
      model: 'Accord',
      modelYear: 2003,
      bodyType: 'COUPE',
    });
    expect(body.bodyClass).toMatch(/coupe/i);
    expect(typeof body.engine).toBe('string');
    expect(body.engine).toMatch(/3\.0L/);
    expect(body.country).toMatch(/UNITED STATES/i);
    expect(body.manufacturer).toMatch(/HONDA/i);
    expect(Object.keys(body).sort()).toEqual(
      ['bodyClass', 'bodyType', 'country', 'engine', 'make', 'manufacturer', 'model', 'modelYear', 'vin'].sort(),
    );
  });

  test('§4.6.1: lower-case VIN is accepted and normalised', async ({ request }) => {
    const res = await anonGet(request, `/vin/${KNOWN_VIN.toLowerCase()}`);
    await skipIfCatalogDown(res);
    await expectStatus(res, 200);
    expect((await res.json()).vin).toBe(KNOWN_VIN);
  });

  test('§4.6.1: malformed VIN is 400 VALIDATION; a VIN vPIC cannot decode is 404 NOT_FOUND', async ({ request }) => {
    for (const bad of [KNOWN_VIN.slice(0, 16), `${KNOWN_VIN}1`, `I${KNOWN_VIN.slice(1)}`, `O${KNOWN_VIN.slice(1)}`,
      `Q${KNOWN_VIN.slice(1)}`]) {
      await expectError(await anonGet(request, `/vin/${bad}`), 400, 'VALIDATION');
    }
    const unknown = await anonGet(request, '/vin/00000000000000000');
    await skipIfCatalogDown(unknown);
    await expectError(unknown, 404, 'NOT_FOUND');
  });

  test('§4.6.1: VIN decode never creates a vehicle', async ({ request, staffApi }) => {
    const res = await anonGet(request, `/vin/${KNOWN_VIN}`);
    await skipIfCatalogDown(res);
    await expectStatus(res, 200);
    const list = await staffApi.get('/api/v1/vehicles', { q: KNOWN_VIN });
    await expectStatus(list, 200);
    const page = await list.json();
    const vins = (page.items as { vin: string }[]).map((v) => v.vin);
    // Another test may legitimately add this VIN through the form; decoding alone must not.
    if (vins.includes(KNOWN_VIN)) {
      const before = page.totalElements;
      await anonGet(request, `/vin/${KNOWN_VIN}`);
      const after = await (await staffApi.get('/api/v1/vehicles', { q: KNOWN_VIN })).json();
      expect(after.totalElements).toBe(before);
    } else {
      expect(vins).not.toContain(KNOWN_VIN);
    }
  });

  test('§4.6.2: public dealer directory exposes only id and legalName, sorted by legal name', async ({ request }) => {
    const res = await anonGet(request, '/dealers');
    await expectStatus(res, 200);
    const text = await res.text();
    const dealers = JSON.parse(text) as Record<string, unknown>[];
    expect(Array.isArray(dealers)).toBe(true);

    for (const d of dealers) {
      expect(Object.keys(d).sort(), JSON.stringify(d)).toEqual(['id', 'legalName']);
      expect(typeof d.id).toBe('number');
      expect(typeof d.legalName).toBe('string');
    }
    const names = dealers.map((d) => d.legalName as string);
    expect(names).toContain(env.dealerA.legalName);
    expect(names).toContain(env.dealerB.legalName);
    expect(isSortedIgnoringCase(names), `sorted by legal name: ${names.join(' | ')}`).toBe(true);

    // No contact details anywhere in the payload, not even nested or under another key.
    for (const dealer of env.dealers) {
      expect(text).not.toContain(dealer.contactPhone);
      expect(text).not.toContain(dealer.contactEmail);
      expect(text).not.toContain(dealer.contactAddress);
    }
    for (const key of ['contactPhone', 'contactEmail', 'contactAddress', 'logoDataUrl', 'staffCount', 'active', 'version']) {
      expect(text).not.toContain(`"${key}"`);
    }
  });

  test('§4.6.2: inactive dealerships are not listed', async ({ request, adminApi }) => {
    const legalName = `E2E Inactive ${uniqueSuffix()}`;
    const created = await adminApi.post('/api/v1/admin/dealers', {
      legalName,
      contactPhone: '403-555-0377',
      contactEmail: `inactive.${uniqueSuffix()}@example.com`,
      contactAddress: '3 Hidden Lane, Calgary, AB',
    });
    await expectStatus(created, 201);
    const dealer = await created.json();

    const listed = (await (await anonGet(request, '/dealers')).json()) as { id: number; legalName: string }[];
    expect(listed.map((d) => d.id)).toContain(dealer.id);

    const patched = await adminApi.patch(`/api/v1/admin/dealers/${dealer.id}`, {
      version: dealer.version,
      legalName: dealer.legalName,
      contactPhone: dealer.contactPhone,
      contactEmail: dealer.contactEmail,
      contactAddress: dealer.contactAddress,
      active: false,
    });
    await expectStatus(patched, 200);

    const after = (await (await anonGet(request, '/dealers')).json()) as { id: number }[];
    expect(after.map((d) => d.id)).not.toContain(dealer.id);
  });
});

// ---------------------------------------------------------------------------------------------
// Image Studio (§4.8)

type PhotoItem = {
  id: number; vehicleId: number; contentType: string; enhancement: null | 'AUTO' | 'BRIGHTEN' | 'SHARPEN';
  uploadedBy: string; createdAt: string;
};

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
}

/** A tiny valid RGB PNG with a gradient, so enhancement presets have something to change. */
function tinyPng(width = 16, height = 12) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const p = row + 1 + x * 3;
      raw[p] = 60 + x * 6;
      raw[p + 1] = 70 + y * 8;
      raw[p + 2] = 90 + ((x + y) % 4) * 10;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]00:00)$/;

const isPng = (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
const isJpeg = (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

function photosPath(vehicleId: number) {
  return `/api/v1/vehicles/${vehicleId}/photos`;
}

function upload(request: APIRequestContext, api: Api, vehicleId: number, buffer: Buffer, mimeType = 'image/png',
  name = 'photo.png') {
  return request.post(`${env.gatewayUrl}${photosPath(vehicleId)}`, {
    headers: authHeaders(api.token),
    multipart: { file: { name, mimeType, buffer } },
  });
}

async function uploadPhoto(request: APIRequestContext, api: Api, vehicleId: number, buffer = tinyPng(),
  mimeType = 'image/png', name = 'photo.png') {
  const res = await upload(request, api, vehicleId, buffer, mimeType, name);
  await expectStatus(res, 201);
  return (await res.json()) as PhotoItem;
}

function content(api: Api, vehicleId: number, photoId: number, variant: string) {
  return api.get(`${photosPath(vehicleId)}/${photoId}/content`, { variant });
}

async function listPhotos(api: Api, vehicleId: number) {
  const res = await api.get(photosPath(vehicleId));
  await expectStatus(res, 200);
  return (await res.json()) as PhotoItem[];
}

async function auditActions(api: Api, photoId: number) {
  const res = await api.get('/api/v1/audit', { entityType: 'VEHICLE_PHOTO', entityId: photoId, size: 10 });
  await expectStatus(res, 200);
  return (await res.json()).items as { action: string; entityType: string; entityId: number;
    fieldSummary: Record<string, unknown> | null; actorUsername: string }[];
}

test.describe('Image Studio photos (§4.8)', () => {
  test('IMG-01 / IMG-03: upload a PNG, list metadata, read the original back unchanged', async ({
    request, staffApi,
  }) => {
    const vehicle = await staffApi.createVehicle();
    const png = tinyPng();
    const photo = await uploadPhoto(request, staffApi, vehicle.id, png);
    expect(photo).toMatchObject({ vehicleId: vehicle.id, contentType: 'image/png', uploadedBy: env.staff.username });
    // A null field may be omitted from the JSON (same tolerance as the other API specs).
    expect(photo.enhancement ?? null).toBeNull();
    expect(typeof photo.id).toBe('number');
    expect(photo.createdAt, 'ISO-8601 UTC timestamp (§1.3)').toMatch(ISO_UTC);

    const list = await listPhotos(staffApi, vehicle.id);
    expect(list.map((p) => p.id)).toEqual([photo.id]);
    expect(list[0]).toMatchObject({ vehicleId: vehicle.id, contentType: 'image/png', uploadedBy: env.staff.username });
    // The same photo read back must keep the UTC timestamp, not lose the zone designator.
    expect.soft(list[0].createdAt, 'listed createdAt is ISO-8601 UTC (§1.3)').toMatch(ISO_UTC);
    expect.soft(Math.abs(Date.parse(list[0].createdAt) - Date.parse(photo.createdAt)), 'same instant').toBeLessThan(1000);
    expect(JSON.stringify(list), 'list is metadata only').not.toMatch(/data|bytes|base64/i);

    const original = await content(staffApi, vehicle.id, photo.id, 'original');
    await expectStatus(original, 200);
    expect(original.headers()['content-type']).toMatch(/^image\/png/);
    expect(original.headers()['cache-control']).toMatch(/no-store/);
    expect((await original.body()).equals(png), 'original bytes unchanged').toBe(true);

    // Shared dealer data: another staff member of the same dealership sees the photo.
    const staff2 = await Api.as(request, env.staff2.username, env.staff2.password);
    expect((await listPhotos(staff2, vehicle.id)).map((p) => p.id)).toEqual([photo.id]);
  });

  test('IMG-01: JPEG upload is accepted; list is oldest first', async ({ request, staffApi }) => {
    const vehicle = await staffApi.createVehicle();
    const first = await uploadPhoto(request, staffApi, vehicle.id);
    // Produce real JPEG bytes through the enhancer, then upload them as a new photo.
    await expectStatus(
      await staffApi.post(`${photosPath(vehicle.id)}/${first.id}/enhance`, { preset: 'AUTO' }), 200);
    const jpeg = Buffer.from(await (await content(staffApi, vehicle.id, first.id, 'enhanced')).body());
    expect(isJpeg(jpeg)).toBe(true);

    const second = await uploadPhoto(request, staffApi, vehicle.id, jpeg, 'image/jpeg', 'photo.jpg');
    expect(second.contentType).toBe('image/jpeg');
    expect(second.enhancement ?? null).toBeNull();
    const original = await content(staffApi, vehicle.id, second.id, 'original');
    await expectStatus(original, 200);
    expect(original.headers()['content-type']).toMatch(/^image\/jpeg/);
    expect((await original.body()).equals(jpeg)).toBe(true);

    expect((await listPhotos(staffApi, vehicle.id)).map((p) => p.id)).toEqual([first.id, second.id]);
  });

  test('IMG-01: non-JPEG/PNG bytes are 415 UNSUPPORTED_MEDIA_TYPE, sniffed from the bytes', async ({
    request, staffApi,
  }) => {
    const vehicle = await staffApi.createVehicle();
    // Declared as PNG but the bytes are text: the declared type must not be trusted.
    await expectError(
      await upload(request, staffApi, vehicle.id, Buffer.from('this is not an image'), 'image/png', 'fake.png'),
      415, 'UNSUPPORTED_MEDIA_TYPE');
    // A real GIF header.
    await expectError(
      await upload(request, staffApi, vehicle.id, Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00\x00;', 'latin1'),
        'image/gif', 'x.gif'),
      415, 'UNSUPPORTED_MEDIA_TYPE');
    // PDF bytes.
    await expectError(
      await upload(request, staffApi, vehicle.id, Buffer.from('%PDF-1.4\n%EOF\n'), 'application/pdf', 'x.pdf'),
      415, 'UNSUPPORTED_MEDIA_TYPE');
    // A genuine PNG declared with a wrong type is still accepted (sniffed).
    const ok = await uploadPhoto(request, staffApi, vehicle.id, tinyPng(), 'application/octet-stream', 'blob.bin');
    expect(ok.contentType).toBe('image/png');
    expect((await listPhotos(staffApi, vehicle.id)).map((p) => p.id)).toEqual([ok.id]);
  });

  test('IMG-01: empty file and oversize file are 400 VALIDATION', async ({ request, staffApi }) => {
    const vehicle = await staffApi.createVehicle();
    await expectError(await upload(request, staffApi, vehicle.id, Buffer.alloc(0)), 400, 'VALIDATION');
    // Valid PNG signature followed by padding, just over 2 MB.
    const big = Buffer.concat([tinyPng(), Buffer.alloc(2 * 1024 * 1024 + 1024)]);
    const res = await upload(request, staffApi, vehicle.id, big);
    await expectError(res, 400, 'VALIDATION');
    expect(await listPhotos(staffApi, vehicle.id)).toEqual([]);
  });

  test('IMG-02: Auto fix / Brighten / Sharpen produce a JPEG; each replaces the previous; original unchanged', async ({
    request, staffApi,
  }) => {
    const vehicle = await staffApi.createVehicle();
    const png = tinyPng();
    const photo = await uploadPhoto(request, staffApi, vehicle.id, png);

    // No enhanced copy yet.
    await expectStatus(await content(staffApi, vehicle.id, photo.id, 'enhanced'), 404);

    const outputs: Buffer[] = [];
    for (const preset of ['AUTO', 'BRIGHTEN', 'SHARPEN'] as const) {
      const res = await staffApi.post(`${photosPath(vehicle.id)}/${photo.id}/enhance`, { preset });
      await expectStatus(res, 200);
      const item = (await res.json()) as PhotoItem;
      expect(item).toMatchObject({ id: photo.id, vehicleId: vehicle.id, enhancement: preset, contentType: 'image/png' });

      const enhanced = await content(staffApi, vehicle.id, photo.id, 'enhanced');
      await expectStatus(enhanced, 200);
      expect(enhanced.headers()['content-type']).toMatch(/^image\/jpeg/);
      expect(enhanced.headers()['cache-control']).toMatch(/no-store/);
      const bytes = await enhanced.body();
      expect(isJpeg(bytes), `${preset} output is JPEG`).toBe(true);
      outputs.push(bytes);

      const original = await content(staffApi, vehicle.id, photo.id, 'original');
      expect(isPng(await original.body())).toBe(true);
      expect((await original.body()).equals(png), `original unchanged after ${preset}`).toBe(true);
    }
    // BRIGHTEN (gamma 0.8) must yield different pixels than AUTO; the copy was replaced.
    expect(outputs[1].equals(outputs[0])).toBe(false);

    const [listed] = await listPhotos(staffApi, vehicle.id);
    expect(listed.enhancement).toBe('SHARPEN');
  });

  test('IMG-02: missing or unknown preset and unknown variant are 400 VALIDATION', async ({ request, staffApi }) => {
    const vehicle = await staffApi.createVehicle();
    const photo = await uploadPhoto(request, staffApi, vehicle.id);
    const enhance = `${photosPath(vehicle.id)}/${photo.id}/enhance`;
    const missing = await staffApi.post(enhance, {});
    expect.soft(missing.status(), `missing preset → ${await missing.text()}`).toBe(400);
    await expectError(await staffApi.post(enhance, { preset: 'VINTAGE' }), 400, 'VALIDATION');
    await expectError(await content(staffApi, vehicle.id, photo.id, 'thumbnail'), 400, 'VALIDATION');
    const [listed] = await listPhotos(staffApi, vehicle.id);
    expect.soft(listed.enhancement ?? null, 'a rejected enhance must not apply a preset').toBeNull();
  });

  test('IMG-03: delete removes the photo; it is then 404', async ({ request, staffApi }) => {
    const vehicle = await staffApi.createVehicle();
    const keep = await uploadPhoto(request, staffApi, vehicle.id);
    const doomed = await uploadPhoto(request, staffApi, vehicle.id);
    const del = await staffApi.delete(`${photosPath(vehicle.id)}/${doomed.id}`);
    await expectStatus(del, 204);
    expect(await del.text()).toBe('');

    expect((await listPhotos(staffApi, vehicle.id)).map((p) => p.id)).toEqual([keep.id]);
    await expectStatus(await content(staffApi, vehicle.id, doomed.id, 'original'), 404);
    await expectStatus(await staffApi.delete(`${photosPath(vehicle.id)}/${doomed.id}`), 404);
    await expectStatus(
      await staffApi.post(`${photosPath(vehicle.id)}/${doomed.id}/enhance`, { preset: 'AUTO' }), 404);
  });

  test('IMG-03: a photo id under another vehicle of the same dealer is 404', async ({ request, staffApi }) => {
    const owner = await staffApi.createVehicle();
    const other = await staffApi.createVehicle();
    const photo = await uploadPhoto(request, staffApi, owner.id);
    await expectStatus(await content(staffApi, other.id, photo.id, 'original'), 404);
    await expectStatus(await staffApi.post(`${photosPath(other.id)}/${photo.id}/enhance`, { preset: 'AUTO' }), 404);
    await expectStatus(await staffApi.delete(`${photosPath(other.id)}/${photo.id}`), 404);
    expect((await listPhotos(staffApi, owner.id)).map((p) => p.id)).toEqual([photo.id]);
  });

  test('§4.8: sold vehicles keep and accept photos', async ({ request, staffApi }) => {
    const vehicle = await staffApi.createVehicle();
    const before = await uploadPhoto(request, staffApi, vehicle.id);
    await staffApi.sellVehicle(vehicle);
    const after = await uploadPhoto(request, staffApi, vehicle.id);
    expect((await listPhotos(staffApi, vehicle.id)).map((p) => p.id)).toEqual([before.id, after.id]);
  });

  test('IMG-05: another dealership\'s vehicle or photo is 404 on every photo route', async ({
    request, staffApi, rivalApi,
  }) => {
    const vehicle = await staffApi.createVehicle();
    const photo = await uploadPhoto(request, staffApi, vehicle.id);
    const rivalVehicle = await rivalApi.createVehicle();

    // Dealer A's vehicle id from dealer B.
    await expectStatus(await rivalApi.get(photosPath(vehicle.id)), 404);
    await expectStatus(await upload(request, rivalApi, vehicle.id, tinyPng()), 404);
    await expectStatus(await content(rivalApi, vehicle.id, photo.id, 'original'), 404);
    await expectStatus(await rivalApi.post(`${photosPath(vehicle.id)}/${photo.id}/enhance`, { preset: 'AUTO' }), 404);
    await expectStatus(await rivalApi.delete(`${photosPath(vehicle.id)}/${photo.id}`), 404);
    // Dealer A's photo id under dealer B's own vehicle.
    await expectStatus(await content(rivalApi, rivalVehicle.id, photo.id, 'original'), 404);
    await expectStatus(await rivalApi.post(`${photosPath(rivalVehicle.id)}/${photo.id}/enhance`, { preset: 'AUTO' }), 404);
    await expectStatus(await rivalApi.delete(`${photosPath(rivalVehicle.id)}/${photo.id}`), 404);
    // Audit of a foreign photo.
    await expectStatus(
      await rivalApi.get('/api/v1/audit', { entityType: 'VEHICLE_PHOTO', entityId: photo.id }), 404);

    // Nothing changed for dealer A.
    const [listed] = await listPhotos(staffApi, vehicle.id);
    expect(listed.id).toBe(photo.id);
    expect(listed.enhancement ?? null).toBeNull();
  });

  test('§4.8: Platform.Admin is 403 FORBIDDEN on every photo route', async ({ request, staffApi, adminApi }) => {
    const vehicle = await staffApi.createVehicle();
    const photo = await uploadPhoto(request, staffApi, vehicle.id);
    await expectError(await adminApi.get(photosPath(vehicle.id)), 403, 'FORBIDDEN');
    await expectError(await upload(request, adminApi, vehicle.id, tinyPng()), 403, 'FORBIDDEN');
    await expectError(await content(adminApi, vehicle.id, photo.id, 'original'), 403, 'FORBIDDEN');
    await expectError(
      await adminApi.post(`${photosPath(vehicle.id)}/${photo.id}/enhance`, { preset: 'AUTO' }), 403, 'FORBIDDEN');
    await expectError(await adminApi.delete(`${photosPath(vehicle.id)}/${photo.id}`), 403, 'FORBIDDEN');
    expect((await listPhotos(staffApi, vehicle.id)).map((p) => p.id)).toEqual([photo.id]);
  });

  test('§4.8: photo routes require a JWT (401 when anonymous)', async ({ request, staffApi }) => {
    const vehicle = await staffApi.createVehicle();
    expect((await request.get(`${env.gatewayUrl}${photosPath(vehicle.id)}`)).status()).toBe(401);
  });

  test('IMG-04: upload, enhance and delete are audited as VEHICLE_PHOTO CREATE / UPDATE / DELETE', async ({
    request, staffApi,
  }) => {
    const vehicle = await staffApi.createVehicle();
    const photo = await uploadPhoto(request, staffApi, vehicle.id);
    expect((await auditActions(staffApi, photo.id)).map((r) => r.action)).toEqual(['CREATE']);

    await expectStatus(
      await staffApi.post(`${photosPath(vehicle.id)}/${photo.id}/enhance`, { preset: 'BRIGHTEN' }), 200);
    await expectStatus(await staffApi.delete(`${photosPath(vehicle.id)}/${photo.id}`), 204);

    // A deleted photo's id stays queryable while its audit rows exist (§9).
    const rows = await auditActions(staffApi, photo.id);
    expect(rows.map((r) => r.action)).toEqual(['DELETE', 'UPDATE', 'CREATE']);
    for (const r of rows) {
      expect(r).toMatchObject({ entityType: 'VEHICLE_PHOTO', entityId: photo.id, actorUsername: env.staff.username });
    }
    const update = rows.find((r) => r.action === 'UPDATE')!;
    expect(Object.keys(update.fieldSummary ?? {})).toContain('enhancement');
  });
});
