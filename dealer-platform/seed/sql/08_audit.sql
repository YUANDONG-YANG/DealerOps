SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- DealerOps demo seed: audit_event history for every seeded record.
-- Runs last, after 01-07 and the photo loader. Nothing here is hardcoded per record: each
-- statement derives its rows with INSERT ... SELECT from the seeded tables, restricted to the
-- 30 seed dealerships (dealer.contact_email from contract/dealers.json).
--
-- field_summary mirrors what DealerOps.Core writes for the same entity and action:
--   - enum values inside field_summary use the C# enum name (Enum.ToString()), e.g. "TradeIn",
--     "AsIs", "Suv", "Contacted", "InProgress"; literal strings "IN_STOCK", "SOLD", "OPEN" are
--     written as the code writes them.
--   - customer email / phone / homeAddress are recorded as `true` (field name only, AUD-04).
-- entity_type and action use the UPPER_SNAKE_CASE form read by EnumSnakeCaseConverter.
-- Actors are dealership staff (first or second membership of the dealership, chosen by id
-- parity) unless the row names its own author (note author, photo uploader, lead owner,
-- work-order assignee, join-request approver); dealer and staff membership creation is
-- performed by 'admin'.
-- Every insert is guarded by NOT EXISTS on (entity_type, entity_id, action, created_at), so the
-- file can be re-run (for example after more photos are loaded) without duplicating history.

-- The 30 seed dealerships and their two staff accounts: u1 / u2 are the first and second active
-- membership created by 'admin' (01_dealers_users.sql inserts them in contract order).
DROP TEMPORARY TABLE IF EXISTS seed_audit_staff;
CREATE TEMPORARY TABLE seed_audit_staff (
  email VARCHAR(120) NOT NULL PRIMARY KEY,
  u1 VARCHAR(64) NOT NULL,
  u2 VARCHAR(64) NOT NULL
);
INSERT INTO seed_audit_staff (email, u1, u2)
SELECT r.contact_email,
       COALESCE(MAX(IF(r.rn = 1, r.username, NULL)), 'admin'),
       COALESCE(MAX(IF(r.rn = 2, r.username, NULL)), MAX(IF(r.rn = 1, r.username, NULL)), 'admin')
FROM (
  SELECT d.contact_email, m.username, ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY m.id) AS rn
  FROM dealer d
  LEFT JOIN membership m ON m.dealer_id = d.id AND m.active = 1 AND m.created_by = 'admin'
  WHERE d.contact_email IN (
    'sales@lakeshoreautosales.ca',
    'sales@northgatemotors.ca',
    'sales@mapleleafpreowned.ca',
    'sales@trilliumcarcentre.ca',
    'sales@huronvalleyauto.ca',
    'sales@carlingavenuemotors.ca',
    'sales@riversideautogroup.ca',
    'sales@baystreetautos.ca',
    'sales@kingswaycarcompany.ca',
    'sales@limestonecitymotors.ca',
    'sales@goldenhorseshoeauto.ca',
    'sales@royaloakautosales.ca',
    'sales@escarpmentmotors.ca',
    'sales@pinecrestautosales.ca',
    'sales@thamesvalleymotors.ca',
    'sales@grandriverauto.ca',
    'sales@ambassadorautosales.ca',
    'sales@simcoecountymotors.ca',
    'sales@lakeviewpreowned.ca',
    'sales@canalstreetauto.ca',
    'sales@northernlightsmotors.ca',
    'sales@rideauautocentre.ca',
    'sales@crossroadscarsales.ca',
    'sales@eastgateautomart.ca',
    'sales@westsidemotorco.ca',
    'sales@highlandautosales.ca',
    'sales@brockstreetmotors.ca',
    'sales@heritageautosales.ca',
    'sales@summitautogroup.ca',
    'sales@parkwaymotors.ca'
  )
) r
GROUP BY r.contact_email;

-- 1. DEALER CREATE (DealerAdminService.Create)
INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT d.id, 'admin', 'DEALER', d.id, 'CREATE',
       JSON_OBJECT('legalName', d.legal_name, 'contactPhone', d.contact_phone,
                   'contactEmail', d.contact_email, 'contactAddress', d.contact_address),
       d.created_at
FROM dealer d JOIN seed_audit_staff s ON s.email = d.contact_email
WHERE NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'DEALER' AND a.entity_id = d.id
                    AND a.action = 'CREATE' AND a.created_at = d.created_at);

-- 2. MEMBERSHIP CREATE: staff added by 'admin' (MembershipService.Add) and approved join
--    requests (JoinRequestService.Approve, created_by = the approving staff member).
INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT m.dealer_id, m.created_by, 'MEMBERSHIP', m.id, 'CREATE',
       IF(m.created_by = 'admin', JSON_OBJECT('username', m.username),
          JSON_OBJECT('username', m.username, 'source', 'google_request')),
       m.created_at
FROM membership m
JOIN dealer d ON d.id = m.dealer_id
JOIN seed_audit_staff s ON s.email = d.contact_email
WHERE NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'MEMBERSHIP' AND a.entity_id = m.id
                    AND a.action = 'CREATE' AND a.created_at = m.created_at);

-- Vehicle facts shared by statements 3-5 and 14:
--   done_cost  = cost of DONE work orders, which WorkOrderService added to repair_cost later;
--   base_repair = the repair cost entered on the vehicle form itself (NULL when none);
--   first_wo_at = creation of the vehicle's first work order (a later edit must precede it);
--   wo_ok      = 1 when repair_cost already includes the DONE work-order costs, so the
--                work-order driven repairCost updates (statement 14) reconcile to repair_cost;
--   edited     = 1 when the base repair cost / Carfax link were added by a later edit (statement 4)
--                instead of on creation;
--   sell_ts    = the sale moment (vehicle.updated_at when it falls on sold_on).
DROP TEMPORARY TABLE IF EXISTS seed_audit_vehicle;
CREATE TEMPORARY TABLE seed_audit_vehicle AS
SELECT x.*,
       CASE WHEN x.wo_ok = 1 THEN NULLIF(x.repair_cost - x.done_cost, 0)
            ELSE x.repair_cost END AS base_repair
FROM (
  SELECT v.id, v.dealer_id, v.repair_cost, v.carfax_url, v.created_at,
         IF(MOD(v.id, 2) = 0, s.u1, s.u2) AS actor,
         COALESCE(w.done_cost, 0) AS done_cost,
         IF(w.done_cost > 0 AND v.repair_cost IS NOT NULL AND v.repair_cost >= w.done_cost, 1, 0) AS wo_ok,
         CASE WHEN v.status = 'SOLD' AND v.sold_on IS NOT NULL THEN
           GREATEST(IF(DATE(v.updated_at) = v.sold_on, v.updated_at, TIMESTAMP(v.sold_on, '19:30:00')),
                    v.created_at + INTERVAL 1 MINUTE)
         END AS sell_ts,
         w.first_wo_at,
         IF(MOD(v.id, 3) <> 0, 1, 0) AS edit_candidate
  FROM vehicle v
  JOIN dealer d ON d.id = v.dealer_id
  JOIN seed_audit_staff s ON s.email = d.contact_email
  LEFT JOIN (SELECT vehicle_id, SUM(IF(status = 'DONE', cost, NULL)) AS done_cost,
                    MIN(created_at) AS first_wo_at
             FROM work_order GROUP BY vehicle_id) w ON w.vehicle_id = v.id
) x;
ALTER TABLE seed_audit_vehicle ADD COLUMN edited TINYINT NOT NULL DEFAULT 0;
UPDATE seed_audit_vehicle SET edited = 1
WHERE edit_candidate = 1 AND (base_repair > 0 OR carfax_url IS NOT NULL)
  AND (first_wo_at IS NULL OR first_wo_at > created_at + INTERVAL 2 MINUTE);

-- 3. VEHICLE CREATE (VehicleService.Create, CreatedVehicleFields)
INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT v.dealer_id, sv.actor, 'VEHICLE', v.id, 'CREATE',
       JSON_MERGE_PATCH(
         JSON_OBJECT(
           'make', v.make, 'model', v.model, 'modelYear', v.model_year, 'vin', v.vin,
           'source', CONCAT(UPPER(LEFT(SUBSTRING_INDEX(v.source, '_', 1), 1)), LOWER(SUBSTRING(SUBSTRING_INDEX(v.source, '_', 1), 2)),
                            IF(LOCATE('_', v.source) > 0, CONCAT(UPPER(LEFT(SUBSTRING_INDEX(v.source, '_', -1), 1)), LOWER(SUBSTRING(SUBSTRING_INDEX(v.source, '_', -1), 2))), '')),
           'purchaseCost', v.purchase_cost,
           'addedOn', DATE_FORMAT(v.added_on, '%Y-%m-%d'),
           'conditionCode', CONCAT(UPPER(LEFT(SUBSTRING_INDEX(v.condition_code, '_', 1), 1)), LOWER(SUBSTRING(SUBSTRING_INDEX(v.condition_code, '_', 1), 2)),
                                   IF(LOCATE('_', v.condition_code) > 0, CONCAT(UPPER(LEFT(SUBSTRING_INDEX(v.condition_code, '_', -1), 1)), LOWER(SUBSTRING(SUBSTRING_INDEX(v.condition_code, '_', -1), 2))), '')),
           'bodyType', CONCAT(UPPER(LEFT(v.body_type, 1)), LOWER(SUBSTRING(v.body_type, 2))),
           'status', 'IN_STOCK'),
         IF(sv.edited = 0 AND sv.base_repair IS NOT NULL, JSON_OBJECT('repairCost', sv.base_repair), JSON_OBJECT()),
         IF(sv.edited = 0 AND v.carfax_url IS NOT NULL, JSON_OBJECT('carfaxUrl', v.carfax_url), JSON_OBJECT())),
       v.created_at
FROM vehicle v JOIN seed_audit_vehicle sv ON sv.id = v.id
WHERE NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'VEHICLE' AND a.entity_id = v.id
                    AND a.action = 'CREATE' AND a.created_at = v.created_at);

-- 4. VEHICLE UPDATE: repair cost and/or Carfax link added by a later edit
--    (VehicleService.Patch, ChangedVehicleFields), within a day of creation and before the
--    vehicle's first work order and any sale.
INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT u.dealer_id, u.actor, 'VEHICLE', u.id, 'UPDATE', u.summary, u.ts
FROM (
  SELECT sv.dealer_id, sv.actor, sv.id,
         JSON_MERGE_PATCH(
           IF(sv.base_repair IS NOT NULL, JSON_OBJECT('repairCost', sv.base_repair), JSON_OBJECT()),
           IF(sv.carfax_url IS NOT NULL, JSON_OBJECT('carfaxUrl', sv.carfax_url), JSON_OBJECT())) AS summary,
         sv.created_at + INTERVAL LEAST(86400,
           GREATEST(60, TIMESTAMPDIFF(SECOND, sv.created_at, COALESCE(sv.sell_ts, GREATEST(NOW(), sv.created_at))) DIV 4),
           GREATEST(60, COALESCE(TIMESTAMPDIFF(SECOND, sv.created_at, sv.first_wo_at) DIV 2, 86400))) SECOND AS ts
  FROM seed_audit_vehicle sv
  WHERE sv.edited = 1
) u
WHERE NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'VEHICLE' AND a.entity_id = u.id
                    AND a.action = 'UPDATE' AND a.created_at = u.ts);

-- 5. VEHICLE SELL (VehicleService.Sell, ChangedSellFields)
INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT v.dealer_id, sv.actor, 'VEHICLE', v.id, 'SELL',
       JSON_OBJECT('status', 'SOLD', 'soldOn', DATE_FORMAT(v.sold_on, '%Y-%m-%d'), 'soldPrice', v.sold_price),
       sv.sell_ts
FROM vehicle v JOIN seed_audit_vehicle sv ON sv.id = v.id
WHERE sv.sell_ts IS NOT NULL AND v.sold_price IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'VEHICLE' AND a.entity_id = v.id
                    AND a.action = 'SELL' AND a.created_at = sv.sell_ts);

-- 6. CUSTOMER CREATE (CustomerService.Create, ContactFieldChanges with no previous values)
INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT c.dealer_id, IF(MOD(c.id, 2) = 0, s.u1, s.u2), 'CUSTOMER', c.id, 'CREATE',
       JSON_OBJECT('name', c.name, 'email', CAST('true' AS JSON), 'phone', CAST('true' AS JSON),
                   'homeAddress', CAST('true' AS JSON)),
       c.created_at
FROM customer c
JOIN dealer d ON d.id = c.dealer_id
JOIN seed_audit_staff s ON s.email = d.contact_email
WHERE NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'CUSTOMER' AND a.entity_id = c.id
                    AND a.action = 'CREATE' AND a.created_at = c.created_at);

-- 7. CUSTOMER UPDATE for some customers (CustomerService.Patch): contact fields by name only.
--    id mod 5 = 0 -> phone; 2 -> homeAddress; 4 -> email and phone. Half-way between creation
--    and the earlier of ten days later or now.
INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT u.dealer_id, u.actor, 'CUSTOMER', u.id, 'UPDATE', u.summary, u.ts
FROM (
  SELECT c.dealer_id, c.id, IF(MOD(c.id, 2) = 0, s.u2, s.u1) AS actor,
         CASE MOD(c.id, 5)
           WHEN 0 THEN JSON_OBJECT('phone', CAST('true' AS JSON))
           WHEN 2 THEN JSON_OBJECT('homeAddress', CAST('true' AS JSON))
           ELSE JSON_OBJECT('email', CAST('true' AS JSON), 'phone', CAST('true' AS JSON))
         END AS summary,
         c.created_at + INTERVAL GREATEST(60, TIMESTAMPDIFF(SECOND, c.created_at,
           LEAST(GREATEST(NOW(), c.created_at), c.created_at + INTERVAL 10 DAY)) DIV 2) SECOND AS ts
  FROM customer c
  JOIN dealer d ON d.id = c.dealer_id
  JOIN seed_audit_staff s ON s.email = d.contact_email
  WHERE MOD(c.id, 5) IN (0, 2, 4)
) u
WHERE NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'CUSTOMER' AND a.entity_id = u.id
                    AND a.action = 'UPDATE' AND a.created_at = u.ts);

-- 8. CUSTOMER_VEHICLE LINK (CustomerService.Link)
INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT cv.dealer_id, IF(MOD(cv.vehicle_id, 2) = 0, s.u1, s.u2), 'CUSTOMER_VEHICLE', cv.id, 'LINK',
       JSON_OBJECT('customerId', cv.customer_id, 'vehicleId', cv.vehicle_id),
       cv.linked_at
FROM customer_vehicle cv
JOIN dealer d ON d.id = cv.dealer_id
JOIN seed_audit_staff s ON s.email = d.contact_email
WHERE NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'CUSTOMER_VEHICLE' AND a.entity_id = cv.id
                    AND a.action = 'LINK' AND a.created_at = cv.linked_at);

-- 9. LEAD CREATE (LeadService.Create): stage is always New on creation.
INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT l.dealer_id, IF(l.owner_username IN (s.u1, s.u2), l.owner_username, IF(MOD(l.id, 2) = 0, s.u1, s.u2)),
       'LEAD', l.id, 'CREATE',
       JSON_MERGE_PATCH(JSON_OBJECT('customerId', l.customer_id, 'stage', 'New'),
                        IF(l.vehicle_id IS NOT NULL, JSON_OBJECT('vehicleId', l.vehicle_id), JSON_OBJECT())),
       l.created_at
FROM sales_lead l
JOIN dealer d ON d.id = l.dealer_id
JOIN seed_audit_staff s ON s.email = d.contact_email
WHERE NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'LEAD' AND a.entity_id = l.id
                    AND a.action = 'CREATE' AND a.created_at = l.created_at);

-- 10. LEAD UPDATE: one stage change per step from New to the stored stage (LeadService.Patch).
--     CONTACTED: Contacted. QUALIFIED: Contacted, Qualified. WON: Contacted, Qualified, Won.
--     LOST: Contacted, Lost (even id) or Lost (odd id); Lost also records lostReason = true.
--     Steps are spread evenly between creation and the lead's last update.
DROP TEMPORARY TABLE IF EXISTS seed_audit_lead_path;
CREATE TEMPORARY TABLE seed_audit_lead_path (
  stage VARCHAR(16) NOT NULL,
  variant TINYINT NOT NULL,
  step TINYINT NOT NULL,
  steps TINYINT NOT NULL,
  label VARCHAR(16) NOT NULL
);
INSERT INTO seed_audit_lead_path (stage, variant, step, steps, label) VALUES
  ('CONTACTED', 0, 1, 1, 'Contacted'), ('CONTACTED', 1, 1, 1, 'Contacted'),
  ('QUALIFIED', 0, 1, 2, 'Contacted'), ('QUALIFIED', 0, 2, 2, 'Qualified'),
  ('QUALIFIED', 1, 1, 2, 'Contacted'), ('QUALIFIED', 1, 2, 2, 'Qualified'),
  ('WON', 0, 1, 3, 'Contacted'), ('WON', 0, 2, 3, 'Qualified'), ('WON', 0, 3, 3, 'Won'),
  ('WON', 1, 1, 3, 'Contacted'), ('WON', 1, 2, 3, 'Qualified'), ('WON', 1, 3, 3, 'Won'),
  ('LOST', 0, 1, 2, 'Contacted'), ('LOST', 0, 2, 2, 'Lost'),
  ('LOST', 1, 1, 1, 'Lost');

INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT u.dealer_id, u.actor, 'LEAD', u.id, 'UPDATE', u.summary, u.ts
FROM (
  SELECT l.dealer_id, l.id,
         IF(l.owner_username IN (s.u1, s.u2), l.owner_username, IF(MOD(l.id, 2) = 0, s.u1, s.u2)) AS actor,
         IF(p.label = 'Lost', JSON_OBJECT('stage', 'Lost', 'lostReason', CAST('true' AS JSON)),
            JSON_OBJECT('stage', p.label)) AS summary,
         l.created_at + INTERVAL (GREATEST(p.steps * 60, TIMESTAMPDIFF(SECOND, l.created_at,
           IF(l.updated_at > l.created_at + INTERVAL 1 HOUR, l.updated_at,
              LEAST(GREATEST(NOW(), l.created_at), l.created_at + INTERVAL 2 DAY)))) * p.step DIV p.steps) SECOND AS ts
  FROM sales_lead l
  JOIN dealer d ON d.id = l.dealer_id
  JOIN seed_audit_staff s ON s.email = d.contact_email
  JOIN seed_audit_lead_path p ON p.stage = l.stage AND p.variant = MOD(l.id, 2)
) u
WHERE NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'LEAD' AND a.entity_id = u.id
                    AND a.action = 'UPDATE' AND a.created_at = u.ts);

-- 11. LEAD NOTE: one per sales_lead_note (LeadService.WriteNote), by the note author.
INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT n.dealer_id, n.author_username, 'LEAD', n.lead_id, 'NOTE',
       JSON_OBJECT('noteId', n.id), n.created_at
FROM sales_lead_note n
JOIN dealer d ON d.id = n.dealer_id
JOIN seed_audit_staff s ON s.email = d.contact_email
WHERE NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'LEAD' AND a.entity_id = n.lead_id
                    AND a.action = 'NOTE' AND a.created_at = n.created_at);

-- Work-order facts shared by statements 12-14: actor and the moments of each status change.
--   progress_ts = InProgress (stored IN_PROGRESS, or the first step of an even-id DONE order);
--   close_ts    = Done (updated_at, or completed_on when updated_at is on another day) / Cancelled.
DROP TEMPORARY TABLE IF EXISTS seed_audit_work_order;
CREATE TEMPORARY TABLE seed_audit_work_order AS
SELECT w.id, w.dealer_id, w.vehicle_id, w.status, w.cost, w.created_at,
       IF(w.assignee_username IN (s.u1, s.u2), w.assignee_username, IF(MOD(w.id, 2) = 0, s.u1, s.u2)) AS actor,
       CASE
         WHEN w.status = 'IN_PROGRESS' THEN
           w.created_at + INTERVAL GREATEST(60, TIMESTAMPDIFF(SECOND, w.created_at,
             IF(w.updated_at > w.created_at + INTERVAL 1 HOUR, w.updated_at,
                LEAST(GREATEST(NOW(), w.created_at), w.created_at + INTERVAL 1 DAY)))) SECOND
         WHEN w.status = 'DONE' AND MOD(w.id, 2) = 0 THEN
           w.created_at + INTERVAL GREATEST(60, TIMESTAMPDIFF(SECOND, w.created_at,
             GREATEST(COALESCE(IF(DATE(w.updated_at) = w.completed_on, w.updated_at,
                                  TIMESTAMP(w.completed_on, '19:00:00')), w.updated_at),
                      w.created_at + INTERVAL 2 MINUTE)) DIV 3) SECOND
       END AS progress_ts,
       CASE
         WHEN w.status = 'DONE' THEN
           GREATEST(COALESCE(IF(DATE(w.updated_at) = w.completed_on, w.updated_at,
                                TIMESTAMP(w.completed_on, '19:00:00')), w.updated_at),
                    w.created_at + INTERVAL 2 MINUTE)
         WHEN w.status = 'CANCELLED' THEN GREATEST(w.updated_at, w.created_at + INTERVAL 2 MINUTE)
       END AS close_ts
FROM work_order w
JOIN dealer d ON d.id = w.dealer_id
JOIN seed_audit_staff s ON s.email = d.contact_email;

-- 12. WORK_ORDER CREATE (WorkOrderService.Create): always OPEN on creation.
INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT w.dealer_id, w.actor, 'WORK_ORDER', w.id, 'CREATE',
       JSON_OBJECT('vehicleId', w.vehicle_id, 'status', 'OPEN'), w.created_at
FROM seed_audit_work_order w
WHERE NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'WORK_ORDER' AND a.entity_id = w.id
                    AND a.action = 'CREATE' AND a.created_at = w.created_at);

-- 13. WORK_ORDER UPDATE (WorkOrderService.Patch): InProgress, then Done (cost and
--     completionNote by name only) or Cancelled.
INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT w.dealer_id, w.actor, 'WORK_ORDER', w.id, 'UPDATE',
       JSON_OBJECT('status', 'InProgress'), w.progress_ts
FROM seed_audit_work_order w
WHERE w.progress_ts IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'WORK_ORDER' AND a.entity_id = w.id
                    AND a.action = 'UPDATE' AND a.created_at = w.progress_ts);

INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT w.dealer_id, w.actor, 'WORK_ORDER', w.id, 'UPDATE',
       IF(w.status = 'DONE',
          JSON_OBJECT('status', 'Done', 'cost', CAST('true' AS JSON), 'completionNote', CAST('true' AS JSON)),
          JSON_OBJECT('status', 'Cancelled')),
       w.close_ts
FROM seed_audit_work_order w
WHERE w.close_ts IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'WORK_ORDER' AND a.entity_id = w.id
                    AND a.action = 'UPDATE' AND a.created_at = w.close_ts);

-- 14. VEHICLE UPDATE written by a DONE work order (VehicleService.AddRepairCost): repairCost is the
--     running total, ending at the stored vehicle.repair_cost. Only for vehicles whose stored
--     repair_cost already includes the DONE work-order costs (wo_ok = 1) and cost > 0.
INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT r.dealer_id, r.actor, 'VEHICLE', r.vehicle_id, 'UPDATE',
       JSON_OBJECT('repairCost', r.running_cost), r.close_ts
FROM (
  SELECT w.dealer_id, w.actor, w.vehicle_id, w.close_ts,
         COALESCE(sv.base_repair, 0)
           + SUM(w.cost) OVER (PARTITION BY w.vehicle_id ORDER BY w.close_ts, w.id) AS running_cost
  FROM seed_audit_work_order w
  JOIN seed_audit_vehicle sv ON sv.id = w.vehicle_id
  WHERE w.status = 'DONE' AND w.cost > 0 AND sv.wo_ok = 1
) r
WHERE NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'VEHICLE' AND a.entity_id = r.vehicle_id
                    AND a.action = 'UPDATE' AND a.created_at = r.close_ts);

-- 15. VEHICLE_PHOTO CREATE (VehiclePhotoService.Upload) by the uploader, and UPDATE
--     (VehiclePhotoService.Enhance) five minutes later for enhanced photos.
INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT p.dealer_id, p.uploaded_by, 'VEHICLE_PHOTO', p.id, 'CREATE',
       JSON_OBJECT('vehicleId', p.vehicle_id), p.created_at
FROM vehicle_photo p
JOIN dealer d ON d.id = p.dealer_id
JOIN seed_audit_staff s ON s.email = d.contact_email
WHERE NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'VEHICLE_PHOTO' AND a.entity_id = p.id
                    AND a.action = 'CREATE' AND a.created_at = p.created_at);

INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)
SELECT p.dealer_id, p.uploaded_by, 'VEHICLE_PHOTO', p.id, 'UPDATE',
       JSON_OBJECT('vehicleId', p.vehicle_id,
                   'enhancement', CONCAT(UPPER(LEFT(p.enhancement, 1)), LOWER(SUBSTRING(p.enhancement, 2)))),
       p.created_at + INTERVAL 5 MINUTE
FROM vehicle_photo p
JOIN dealer d ON d.id = p.dealer_id
JOIN seed_audit_staff s ON s.email = d.contact_email
WHERE p.enhancement IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM audit_event a WHERE a.entity_type = 'VEHICLE_PHOTO' AND a.entity_id = p.id
                    AND a.action = 'UPDATE' AND a.created_at = p.created_at + INTERVAL 5 MINUTE);

DROP TEMPORARY TABLE IF EXISTS seed_audit_work_order;
DROP TEMPORARY TABLE IF EXISTS seed_audit_lead_path;
DROP TEMPORARY TABLE IF EXISTS seed_audit_vehicle;
DROP TEMPORARY TABLE IF EXISTS seed_audit_staff;
