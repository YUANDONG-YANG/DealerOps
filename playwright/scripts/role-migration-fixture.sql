-- Legacy-shaped rows for the one-shot dealership role migration
-- (requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md section 4).
--
-- Loaded by scripts/role-migration.sh into a throwaway database whose schema exists but whose
-- role patch marker has been cleared, so the next dealer-core start runs the patch over these
-- rows. Everything is prefixed `rm.`/`RM ` and uses the 9xxx id range so the expectations in
-- tests-migration/role-migration.spec.ts can address rows by id.
--
-- Spellings are deliberately mixed: rows written by an older build are upper case, rows loaded
-- from an older seed revision or dump are lower case, and `Associate` stands for any value
-- outside the three canonical ones.

SET @t = '2026-01-01 00:00:00.000000';

INSERT INTO dealer (id, legal_name, contact_phone, contact_email, contact_address, active, version, created_at, updated_at) VALUES
  (9001, 'RM Mixed Managers Ltd.',  '403-555-9001', 'rm9001@example.com', '1 Patch Road, Calgary, AB',  1, 0, @t, @t),
  (9002, 'RM All Staff Ltd.',       '403-555-9002', 'rm9002@example.com', '2 Patch Road, Calgary, AB',  1, 0, @t, @t),
  (9003, 'RM Already Owned Ltd.',   '403-555-9003', 'rm9003@example.com', '3 Patch Road, Calgary, AB',  1, 0, @t, @t),
  (9004, 'RM Lowercase Owner Ltd.', '403-555-9004', 'rm9004@example.com', '4 Patch Road, Calgary, AB',  1, 0, @t, @t),
  (9005, 'RM Inactive Only Ltd.',   '403-555-9005', 'rm9005@example.com', '5 Patch Road, Calgary, AB',  1, 0, @t, @t),
  (9006, 'RM No Members Ltd.',      '403-555-9006', 'rm9006@example.com', '6 Patch Road, Calgary, AB',  1, 0, @t, @t),
  (9007, 'RM Staff Tie Ltd.',       '403-555-9007', 'rm9007@example.com', '7 Patch Road, Calgary, AB',  1, 0, @t, @t);

-- 9001: several managers, mixed spelling, plus an earlier staff member and an earlier INACTIVE
-- manager. Step 3 must promote the earliest ACTIVE manager, and the two tied at 2026-02-01 are
-- separated by id.
-- 9002: every member is staff, so step 3 finds nothing and step 4 promotes the earliest active
-- member. `Associate` proves the step 2 catch-all, and the earliest row of all is inactive.
-- 9003: already has an active owner, and its manager is OLDER than the owner. Nothing may change.
-- 9004: the owner is spelled lower case. Step 1 must canonicalise it before step 3 looks for
-- owner-less dealerships, or the manager would be promoted and the dealership get two owners.
-- 9005: active = 0 on every row, so nobody is promoted.
-- 9006: no membership rows at all (no INSERT below), so nobody is promoted.
-- 9007: all staff and the two earliest rows share created_at, so the id breaks the tie.
INSERT INTO membership (id, dealer_id, username, active, dealer_role, created_by, created_at) VALUES
  (9101, 9001, 'rm.mgr.tie.a',          1, 'manager',   'system', '2026-02-01 09:00:00.000000'),
  (9102, 9001, 'rm.mgr.tie.b',          1, 'MANAGER',   'system', '2026-02-01 09:00:00.000000'),
  (9103, 9001, 'rm.mgr.late',           1, 'Manager',   'system', '2026-03-01 09:00:00.000000'),
  (9104, 9001, 'rm.staff.early',        1, 'staff',     'system', '2026-01-01 09:00:00.000000'),
  (9105, 9001, 'rm.mgr.inactive',       0, 'manager',   'system', '2025-01-01 09:00:00.000000'),

  (9201, 9002, 'rm.s2.mid',             1, 'staff',     'system', '2026-04-01 09:00:00.000000'),
  (9202, 9002, 'rm.s2.early',           1, 'STAFF',     'system', '2026-02-01 09:00:00.000000'),
  (9203, 9002, 'rm.s2.late',            1, 'Staff',     'system', '2026-06-01 09:00:00.000000'),
  (9204, 9002, 'rm.s2.inactive.oldest', 0, 'staff',     'system', '2025-01-01 09:00:00.000000'),
  (9205, 9002, 'rm.s2.weird',           1, 'Associate', 'system', '2026-07-01 09:00:00.000000'),

  (9301, 9003, 'rm.d3.mgr',             1, 'MANAGER',   'system', '2026-01-01 09:00:00.000000'),
  (9302, 9003, 'rm.d3.owner',           1, 'OWNER',     'system', '2026-05-01 09:00:00.000000'),
  (9303, 9003, 'rm.d3.staff',           1, 'staff',     'system', '2026-02-01 09:00:00.000000'),

  (9401, 9004, 'rm.d4.owner',           1, 'owner',     'system', '2026-05-01 09:00:00.000000'),
  (9402, 9004, 'rm.d4.mgr',             1, 'manager',   'system', '2026-01-01 09:00:00.000000'),

  (9501, 9005, 'rm.d5.mgr',             0, 'manager',   'system', '2026-01-01 09:00:00.000000'),
  (9502, 9005, 'rm.d5.staff',           0, 'staff',     'system', '2026-02-01 09:00:00.000000'),

  (9701, 9007, 'rm.d7.tie.a',           1, 'staff',     'system', '2026-03-01 10:00:00.000000'),
  (9702, 9007, 'rm.d7.tie.b',           1, 'STAFF',     'system', '2026-03-01 10:00:00.000000'),
  (9703, 9007, 'rm.d7.later',           1, 'staff',     'system', '2026-04-01 09:00:00.000000');

-- Vehicles for step 5. sold_by is NULL on every historical sale because the column was added with
-- this change; 9803 is the exception that already carries a value and must be left alone.
INSERT INTO vehicle (id, dealer_id, vin, make, model, model_year, source, purchase_cost, added_on,
                     condition_code, body_type, status, sold_on, sold_price, sold_by, version,
                     created_at, updated_at) VALUES
  (9801, 9001, 'RMVIN000000009801', 'Toyota', 'Corolla', 2019, 'AUCTION', 12000.00, '2026-01-10', 'AS_IS', 'other', 'SOLD',     '2026-06-01', 15000.00, NULL,                9, @t, @t),
  (9802, 9001, 'RMVIN000000009802', 'Honda',  'Civic',   2018, 'AUCTION', 11000.00, '2026-01-11', 'AS_IS', 'other', 'SOLD',     '2026-06-02', 14000.00, NULL,                9, @t, @t),
  (9803, 9001, 'RMVIN000000009803', 'Ford',   'Focus',   2017, 'AUCTION', 10000.00, '2026-01-12', 'AS_IS', 'other', 'SOLD',     '2026-06-03', 13000.00, 'rm.kept.manually',  9, @t, @t),
  (9804, 9001, 'RMVIN000000009804', 'Mazda',  'Mazda3',  2020, 'AUCTION', 13000.00, '2026-01-13', 'AS_IS', 'other', 'IN_STOCK', NULL,         NULL,     NULL,                9, @t, @t),
  (9805, 9001, 'RMVIN000000009805', 'Nissan', 'Sentra',  2016, 'AUCTION',  9000.00, '2026-01-14', 'AS_IS', 'other', 'SOLD',     '2026-06-05', 12000.00, NULL,                9, @t, @t),
  (9806, 9001, 'RMVIN000000009806', 'Subaru', 'Impreza', 2021, 'AUCTION', 14000.00, '2026-01-15', 'AS_IS', 'other', 'SOLD',     '2026-06-06', 17000.00, NULL,                9, @t, @t);

-- 9801: three SELL rows. The two newest share created_at, so the id picks the winner
--       (ORDER BY created_at DESC, id DESC) and sold_by must become rm.seller.final.
-- 9802: no audit rows at all, so sold_by stays NULL.
-- 9803: has a SELL row by someone else, but sold_by is already set and the patch only fills NULLs.
-- 9804: has a SELL row but is not SOLD, so it stays NULL.
-- 9805: its only SELL row has an empty actor, which the patch excludes, so it stays NULL.
-- 9806: only a VEHICLE/UPDATE row, not a SELL, so it stays NULL.
INSERT INTO audit_event (id, dealer_id, actor_username, entity_type, entity_id, action, created_at) VALUES
  (9901, 9001, 'rm.seller.old',      'VEHICLE', 9801, 'SELL',   '2026-01-01 09:00:00.000000'),
  (9902, 9001, 'rm.seller.runnerup', 'VEHICLE', 9801, 'SELL',   '2026-06-01 12:00:00.000000'),
  (9903, 9001, 'rm.seller.final',    'VEHICLE', 9801, 'SELL',   '2026-06-01 12:00:00.000000'),
  (9904, 9001, 'rm.other',           'VEHICLE', 9803, 'SELL',   '2026-06-03 12:00:00.000000'),
  (9905, 9001, 'rm.ghost',           'VEHICLE', 9804, 'SELL',   '2026-06-04 12:00:00.000000'),
  (9906, 9001, '',                   'VEHICLE', 9805, 'SELL',   '2026-06-05 12:00:00.000000'),
  (9907, 9001, 'rm.editor',          'VEHICLE', 9806, 'UPDATE', '2026-06-06 12:00:00.000000');
