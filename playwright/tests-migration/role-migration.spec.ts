import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { test, expect } from '@playwright/test';

/**
 * The one-shot dealership role migration (CR-Role-Hierarchy-2026-11-03 section 4,
 * deploy/ROLE-MIGRATION-2026-11-03.md).
 *
 * The patch runs inside dealer-core's startup, once per database, behind a marker row in
 * schema_patch claimed with INSERT IGNORE. The browser suite has never exercised it with data:
 * e2e-stack.sh recreates dealer_core_e2e on every start, so EnsureCreated builds an empty schema
 * and the patch runs over zero rows, and the seed is loaded only after Core is already up. The
 * first database that will ever run it against real rows is the shared Azure demo database.
 *
 * This spec gives it that database locally. scripts/role-migration.sh starts Core alone, on its
 * own port and its own throwaway database, and:
 *   1. `prepare` recreates the database, starts Core once so EnsureCreated builds the schema
 *      (that start claims the marker over zero rows, which the script asserts), stops it, deletes
 *      the marker row - the runbook's own revert step, section 5.2 - and loads
 *      scripts/role-migration-fixture.sql, a set of legacy-shaped rows: mixed-case `staff` and
 *      `manager`, an all-staff dealership, a dealership with several managers, a dealership that
 *      already has an owner, an inactive-only dealership, one with no members, and sold vehicles
 *      with and without a VEHICLE/SELL audit row.
 *   2. the first `run` starts Core against those rows, so the patch migrates them.
 *   3. the second `run` starts Core again. The marker is claimed now, so nothing may change.
 *
 * Assertions read MySQL directly, because the point is the stored rows, not an API projection.
 * Nothing here touches dealer_core or dealer_core_e2e, and no shared stack is started or stopped.
 */

const DB = process.env.ROLE_MIGRATION_DB_NAME ?? 'dealer_core_role_migration';
const PW_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

type Role = 'OWNER' | 'MANAGER' | 'SALES';

function stack(command: 'prepare' | 'run') {
  execFileSync('bash', ['./scripts/role-migration.sh', command], {
    cwd: PW_DIR,
    stdio: 'inherit',
    env: process.env,
  });
}

/** Rows as tab-separated columns; `--skip-column-names` keeps the output addressable by index. */
function query(sql: string): string[][] {
  const out = execFileSync(
    'mysql',
    ['-h', '127.0.0.1', '-P', '3306', '-u', 'root', '--batch', '--skip-column-names', '-e', sql, DB],
    { encoding: 'utf8' },
  );
  // The Windows client writes CRLF, so split on both and drop the carriage return.
  return out
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => line.split('\t'));
}

/** Every fixture membership, keyed by id: `9101 -> { dealerId, username, active, role }`. */
function memberships() {
  const rows = query(
    `SELECT id, dealer_id, username, active, dealer_role FROM membership
     WHERE id BETWEEN 9000 AND 9999 ORDER BY id`,
  );
  return new Map(
    rows.map(([id, dealerId, username, active, role]) => [
      Number(id),
      { dealerId: Number(dealerId), username, active: active === '1', role: role as Role },
    ]),
  );
}

/** Every fixture vehicle's sold_by, keyed by id; a NULL column comes back as the string `NULL`. */
function soldBy() {
  const rows = query(
    `SELECT id, status, IFNULL(sold_by, 'NULL') FROM vehicle WHERE id BETWEEN 9800 AND 9899 ORDER BY id`,
  );
  return new Map(rows.map(([id, status, seller]) => [Number(id), { status, soldBy: seller }]));
}

/** One string holding every role and sold_by value, for the before/after comparison. */
function snapshot() {
  return JSON.stringify({
    memberships: [...memberships()],
    vehicles: [...soldBy()],
    marker: query(`SELECT patch_id, applied_at FROM schema_patch ORDER BY patch_id`),
  });
}

let afterFirstRun = '';
let afterSecondRun = '';

test.beforeAll(async () => {
  test.setTimeout(15 * 60_000);
  stack('prepare');
  stack('run');
  afterFirstRun = snapshot();
  stack('run');
  afterSecondRun = snapshot();
});

test.describe('one-shot dealership role migration', () => {
  test('CR §4.1/4.2 every stored role is one of the three canonical upper-case values', () => {
    // Grouped case-sensitively, the way runbook query 2.4 does it, or the spellings merge.
    const stored = query(
      `SELECT DISTINCT CAST(dealer_role AS CHAR) FROM membership ORDER BY 1`,
    ).map(([value]) => value);
    expect(stored.sort()).toEqual(['MANAGER', 'OWNER', 'SALES']);
    const lowerOrLegacy = query(
      `SELECT COUNT(*) FROM membership
       WHERE CAST(dealer_role AS BINARY) NOT IN ('OWNER', 'MANAGER', 'SALES')`,
    );
    expect(lowerOrLegacy[0][0]).toBe('0');
  });

  test('CR §4.1-4.4 each legacy membership lands on its expected role', () => {
    const expected: Record<number, Role> = {
      // 9001: mixed-case managers. The earliest active one wins; the tie at 2026-02-01 goes to
      // the lower id, the later manager and the earlier INACTIVE manager stay MANAGER, and the
      // earliest member of all - a staff row - becomes SALES, not owner.
      9101: 'OWNER', 9102: 'MANAGER', 9103: 'MANAGER', 9104: 'SALES', 9105: 'MANAGER',
      // 9002: all staff, so step 4 promotes the earliest ACTIVE member (9202). The inactive
      // 2025 row is older and must not win, and `Associate` falls through to SALES.
      9201: 'SALES', 9202: 'OWNER', 9203: 'SALES', 9204: 'SALES', 9205: 'SALES',
      // 9003: already owned, and its manager is older than the owner. Untouched.
      9301: 'MANAGER', 9302: 'OWNER', 9303: 'SALES',
      // 9004: the owner was spelled `owner`. Step 1 canonicalises it, so step 3 sees an owned
      // dealership and the older manager is NOT promoted.
      9401: 'OWNER', 9402: 'MANAGER',
      // 9005: inactive only. Spelling is fixed, nobody is promoted.
      9501: 'MANAGER', 9502: 'SALES',
      // 9007: all staff with the two earliest rows tied on created_at; the lower id wins.
      9701: 'OWNER', 9702: 'SALES', 9703: 'SALES',
    };
    const actual = Object.fromEntries([...memberships()].map(([id, m]) => [id, m.role]));
    expect(actual).toEqual(expected);
  });

  test('CR §4.3/4.4 every dealership with active members ends with exactly one active owner', () => {
    // The failure this guards is silent: a wrong tie-break leaves a dealership with nobody who
    // can open Team, approve a join request or edit the profile, and raises no error.
    const counts = query(
      `SELECT dealer_id, SUM(dealer_role = 'OWNER'), COUNT(*) FROM membership
       WHERE active = 1 AND dealer_id BETWEEN 9001 AND 9007
       GROUP BY dealer_id ORDER BY dealer_id`,
    );
    expect(counts.map(([dealerId]) => Number(dealerId))).toEqual([9001, 9002, 9003, 9004, 9007]);
    for (const [dealerId, owners, members] of counts) {
      expect(Number(owners), `dealership ${dealerId} active owners (of ${members} members)`).toBe(1);
    }
  });

  test('CR §4.4 a dealership with no active member gets no owner', () => {
    // 9005 has only inactive members, 9006 has none at all. The next platform-admin bind
    // bootstraps their owner directly, so the patch must leave both alone.
    const owners = query(
      `SELECT dealer_id, COUNT(*) FROM membership
       WHERE dealer_role = 'OWNER' AND dealer_id IN (9005, 9006) GROUP BY dealer_id`,
    );
    expect(owners).toEqual([]);
    expect(query(`SELECT COUNT(*) FROM membership WHERE dealer_id = 9006`)[0][0]).toBe('0');
  });

  test('CR §4.3 the owner is the earliest active manager where one exists', () => {
    const rows = memberships();
    expect(rows.get(9101)!.username).toBe('rm.mgr.tie.a');
    expect(rows.get(9101)!.role).toBe('OWNER');
    // Not the earliest member (staff, 2026-01-01) and not an inactive earlier manager (2025).
    expect(rows.get(9104)!.role).toBe('SALES');
    expect(rows.get(9105)!.active).toBe(false);
    expect(rows.get(9105)!.role).toBe('MANAGER');
  });

  test('CR §4.4 otherwise the owner is the earliest active member', () => {
    const rows = memberships();
    expect(rows.get(9202)!.username).toBe('rm.s2.early');
    expect(rows.get(9202)!.role).toBe('OWNER');
    expect(rows.get(9204)!.active).toBe(false);
    expect(rows.get(9204)!.role).toBe('SALES');
  });

  test('CR §4.5 sold_by is backfilled from the most recent VEHICLE/SELL audit actor', () => {
    const vehicles = soldBy();
    // Three SELL rows; the two newest share created_at, so `created_at DESC, id DESC` decides.
    expect(vehicles.get(9801)).toEqual({ status: 'SOLD', soldBy: 'rm.seller.final' });
  });

  test('CR §4.5 a sold vehicle the backfill does not cover keeps its value', () => {
    const vehicles = soldBy();
    expect(vehicles.get(9802)).toEqual({ status: 'SOLD', soldBy: 'NULL' }); // no SELL audit row
    expect(vehicles.get(9803)).toEqual({ status: 'SOLD', soldBy: 'rm.kept.manually' }); // already set
    expect(vehicles.get(9804)).toEqual({ status: 'IN_STOCK', soldBy: 'NULL' }); // not sold
    expect(vehicles.get(9805)).toEqual({ status: 'SOLD', soldBy: 'NULL' }); // empty audit actor
    expect(vehicles.get(9806)).toEqual({ status: 'SOLD', soldBy: 'NULL' }); // UPDATE, not SELL
  });

  test('CR §4 the patch is one-shot: a second Core start changes nothing', () => {
    // The marker is claimed, so steps 3 and 4 must not re-run. Re-running them would undo an
    // administrator's decision: unbind an owner to bind a replacement, restart Core, and the
    // earliest manager would be promoted again. The marker's applied_at is part of the snapshot,
    // so a re-claim would show up here too.
    expect(afterSecondRun).toBe(afterFirstRun);
    const marker = query(
      `SELECT COUNT(*) FROM schema_patch WHERE patch_id = 'dealer_role_hierarchy_2026_11_03'`,
    );
    expect(marker[0][0]).toBe('1');
  });
});
