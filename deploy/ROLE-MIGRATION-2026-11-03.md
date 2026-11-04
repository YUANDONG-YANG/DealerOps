# Runbook: dealership role migration (2026-11-03)

Spec: `requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md` §4. Patch code:
`backend/dotnet/DealerOps.Core/Program.cs`, the block guarded by the marker
`dealer_role_hierarchy_2026_11_03`.

Read sections 1-3 before you deploy. Section 5 is the revert and is lossy: read it before you
need it.

## 1. What the migration does

The dealership roles change from `{ MANAGER, STAFF }` to `{ OWNER, MANAGER, SALES }`.
`dealer-core` runs the data patch itself, at startup, right after `EnsureCreated` (this project has
no migration framework). In plain English:

1. Every `membership.dealer_role` is upper-cased, so the mixed spellings described in 2.4 become one
   canonical value and the later comparisons no longer depend on the column's collation (2.5).
2. Every `membership.dealer_role` that is not `OWNER`, `MANAGER` or `SALES` becomes `SALES`. That is
   what converts the old `STAFF`/`staff` rows.
3. For each dealership that has no active owner yet, its **earliest active manager** (lowest
   `created_at`, then lowest `id`) becomes `OWNER`. Later managers stay `MANAGER`.
4. For each dealership that still has no active owner and no active manager but does have at least
   one active member, its **earliest active member** (same ordering) becomes `OWNER`. This is what
   stops an all-staff dealership from coming out of the migration with nobody who can administer it.
   A dealership with no active members at all is left alone.
5. `vehicle.sold_by`, added with this change and therefore `NULL` on every earlier sale, is
   backfilled for sold vehicles from the `actor_username` of the vehicle's most recent
   `VEHICLE`/`SELL` `audit_event` row, so the sales report's per-salesperson rows reconcile with its
   headline totals on historical data. A sold vehicle with no `SELL` audit row keeps `NULL`.

All five statements run in one transaction, together with an `INSERT IGNORE` into the `schema_patch`
table. **It is one-shot, not re-runnable.** Once the marker row exists, the patch never runs again
on that database, even if the role data is later changed or reverted. There is no way to run it
without starting the new build, and no dry run — section 2 is the dry run.

What it does **not** do: it writes no audit rows, and it promotes nobody in a dealership that has no
active members at all. Those dealerships come out of the migration with no owner; the next platform
admin bind bootstraps one directly. Every dealership that has at least one active member comes out
with exactly one owner, by step 3 or step 4. Check the step 2.4 list before you deploy so you know
who step 4 promotes.

## 2. Pre-flight, read-only, against the target database

All queries below are read-only. Run them against the database you are about to deploy to
(Azure for the cloud demo), **before** publishing the new build.

### 2.1 Connect

Same inputs the seed scripts use, from the repository root:

```bash
cd deploy/terraform
host="$(terraform output -raw mysql_fqdn)"
rg="$(terraform output -raw resource_group_name)"
export MYSQL_PWD="$(terraform output -raw mysql_admin_password)"
user="$(az mysql flexible-server show -g "$rg" -n "${host%%.*}" --query administratorLogin -o tsv | tr -d '\r')"
cd ../..
# Your IP needs a firewall rule; deploy/seed/import-to-azure.sh opens and closes one itself.
ip="$(curl -fsS https://api.ipify.org)"
az mysql flexible-server firewall-rule create -g "$rg" -n "${host%%.*}" \
  --rule-name "role-preflight-$(date +%s)" --start-ip-address "$ip" --end-ip-address "$ip" -o none
mysql -h "$host" -u "$user" --ssl-mode=REQUIRED dealer_core
```

Delete the firewall rule when you are done (`az mysql flexible-server firewall-rule delete ... --yes`).

### 2.2 Has the patch already run here?

```sql
SELECT patch_id, applied_at
FROM schema_patch
WHERE patch_id = 'dealer_role_hierarchy_2026_11_03';
```

A row means this database is already migrated and the patch will **not** run again. Zero rows (or
`schema_patch` does not exist yet) means it will run on the next start.

### 2.3 Exactly which rows would be promoted to OWNER

This is the patch's own selection, as a `SELECT`. The rows it returns are the ones that will read
`OWNER` after the deploy.

```sql
SELECT m.dealer_id,
       d.legal_name,
       m.username,
       m.dealer_role AS role_now,
       m.created_at
FROM membership m
JOIN dealer d ON d.id = m.dealer_id
WHERE m.id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY dealer_id ORDER BY created_at, id) AS rn
        FROM membership
        WHERE active = 1
          AND dealer_role = 'MANAGER'
          AND dealer_id NOT IN (
              SELECT dealer_id FROM (
                  SELECT DISTINCT dealer_id
                  FROM membership
                  WHERE active = 1 AND dealer_role = 'OWNER'
              ) owned
          )
    ) ranked
    WHERE ranked.rn = 1
)
ORDER BY m.dealer_id;
```

Save the output. Step 5 needs it.

### 2.4 Stored spelling, case-sensitively, plus the dealerships that get no owner

A database can hold **mixed spellings**: rows written by the app are upper case (`MANAGER`,
`STAFF`), while rows loaded from an older seed revision or dump can be lower case (`manager`,
`staff`). Group case-sensitively or the two merge and you cannot see which you have:

```sql
SELECT CAST(dealer_role AS BINARY) AS stored_value,
       active,
       COUNT(*) AS member_rows
FROM membership
GROUP BY CAST(dealer_role AS BINARY), active
ORDER BY stored_value, active;
```

**This expectation applies to the un-migrated Azure database, which is this runbook's target.**
There, expect only `MANAGER`/`manager` and `STAFF`/`staff` before the deploy; anything else is a
surprise, so stop and work out where it came from.

It does **not** apply to a local `dealer_core` or `dealer_core_e2e` database freshly loaded from
`dealer-platform/seed/sql/`. Those seed files were rewritten to the new role model, so a seeded
database legitimately shows only `OWNER` (the five cloud memberships in `09_cloud_additions.sql`)
and `SALES`, with no `MANAGER` and no `STAFF` membership row at all, before the patch has run.
That is not a surprise and not a reason to stop. On such a database step 2 changes nothing, step 3
promotes nobody because there is no `MANAGER` row to promote, and the real work is step 4
(earliest active member becomes owner in each dealership that has no owner) plus the `sold_by`
backfill in step 5. `MANAGER` and `STAFF` do still appear inside historical `audit_event` payload
JSON in the seed; that is the record of what happened and the patch does not touch it.

Dealerships with no active owner or manager. Step 4 promotes the earliest active member of each one,
so this is the list of dealerships whose owner is picked by member seniority rather than by role:

```sql
SELECT d.id, d.legal_name, COUNT(*) AS active_members
FROM membership m
JOIN dealer d ON d.id = m.dealer_id
WHERE m.active = 1
GROUP BY d.id, d.legal_name
HAVING SUM(m.dealer_role IN ('OWNER', 'MANAGER')) = 0
ORDER BY d.id;
```

### 2.5 Collation (do not skip this)

The patch compares `dealer_role` against the literals `'OWNER'`, `'MANAGER'`, `'SALES'`, so the
result depends on the column's collation:

```sql
SELECT @@character_set_database AS db_charset, @@collation_database AS db_collation;

SELECT table_name, column_name, character_set_name, collation_name
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'membership'
  AND column_name = 'dealer_role';
```

Step 1 of the patch upper-cases every stored value and the later statements compare against
`UPPER(dealer_role)`, so the outcome is the same under `_ci`, `_cs` and `_bin`. Run the queries
anyway: the pre-flight queries 2.3 and 2.4 above are written with bare literals, so under a `_cs` or
`_bin` collation **their** output is wrong even though the patch is not. In that case re-run them
with `UPPER(m.dealer_role)` in place of `m.dealer_role` before you trust the promotion list.

## 3. Back up first

The Azure demo database holds accounts and dealerships that exist **only** online and are not in the
local `dealer_core`. Do not deploy before this step passes.

1. Take the backup. **Before the deploy, take the backup only**, with the backup script on its own:

   ```bash
   deploy/seed/backup-azure-incremental.sh
   ```

   It writes `deploy/seed/backups/azure-incr-<time>.sql.gz`. The `.sql.gz` files are deliberately
   not in git.

   > **Do not run `deploy/seed/save-cloud-to-seed.sh` until Azure has been migrated.** That
   > wrapper takes the same backup and then runs
   > `dealer-platform/seed/scripts/gen_cloud_additions.py`, which **regenerates**
   > `dealer-platform/seed/sql/09_cloud_additions.sql` from whatever Azure currently holds. That
   > file is generated, not hand-maintained, but today it carries 13 hand edits that moved its role
   > literals to `OWNER`/`SALES`. Run the wrapper while Azure still holds `MANAGER`/`STAFF` and it
   > overwrites those edits with the old values, with no warning and no conflict. Nothing is
   > unrecoverable either way - the `.sql.gz` backups under `deploy/seed/backups/` still hold the
   > pre-migration rows - but the committed seed would quietly regress.

   Once the migrated build is deployed and Azure is migrated - query 2.2 returns the marker row -
   run the wrapper to refresh the committed seed:

   ```bash
   deploy/seed/save-cloud-to-seed.sh
   ```

   If it reports that a previously saved account is missing from Azure, **do not** pass
   `--allow-removal` unless you know the account was removed on purpose. The regenerated
   `09_cloud_additions.sql` is in git, so commit it.

2. Join the backup files into one restorable dump:

   ```bash
   cat deploy/seed/backups/azure-incr-*.sql.gz > deploy/seed/restore.sql.gz
   ```

3. Verify the dump restores, locally, before you trust it. The dump is **data only** (no schema), so
   the target database must already have the tables. `dealer_core_e2e` is the throwaway database the
   browser-test stack uses, so it is the safe target; the e2e stack recreates it on every start, so
   do the import after starting the stack and do not restart the stack until you are finished.

   ```bash
   playwright/scripts/e2e-stack.sh start      # creates dealer_core_e2e and its schema
   gunzip -c deploy/seed/restore.sql.gz | mysql -h 127.0.0.1 -u root -p dealer_core_e2e
   ```

4. Confirm the restore actually contains the people whose work you are protecting:

   ```sql
   USE dealer_core_e2e;
   SELECT COUNT(*) AS users, SUM(username IN
       ('lafe','yuandongyang061903','Fadhil','Logan','test','ga3205519s')) AS demo_accounts
   FROM app_user;

   SELECT m.dealer_id, d.legal_name, m.username, m.dealer_role, m.active
   FROM membership m JOIN dealer d ON d.id = m.dealer_id
   WHERE m.username IN ('lafe','yuandongyang061903','Fadhil','Logan','test','ga3205519s')
   ORDER BY m.dealer_id;
   ```

   `demo_accounts` must be 6 and every membership must be present. If anything is missing, the dump
   is not a usable backup: fix that before deploying.

## 4. What changes for the known demo accounts

Taken from the membership rows in `dealer-platform/seed/sql/09_cloud_additions.sql` and
`dealer-platform/seed/sql/01_dealers_users.sql`. Dealership ids are the ones the cloud database
assigned; only `31`, `33`, `34` and `27` are stable across seed loads, so match on `legal_name`.

| Dealership | Member | Role before | Role after | Team page after |
|---|---|---|---|---|
| Summit Auto Group Inc. (31) | `lafe` | sole active manager | **owner** | yes |
| Summit Auto Group Inc. (31) | `yuandongyang061903` | staff | sales | **no** |
| Summit Auto Group Inc. (31) | `simran.tran`, `connor.kelly`, `jeanluc.silva` | staff | sales | **no** |
| Southgate Motors Inc. (33) | `Fadhil` | sole active manager, sole member | **owner** | yes |
| Lakeshore Auto Group Ltd. (34) | `Logan` | sole active manager | **owner** | yes |
| Lakeshore Auto Group Ltd. (34) | `test` | staff | sales | **no** |
| test Dealer | `test1` | staff (active, earliest) | **owner** (step 4: no manager to promote) | yes |
| test Dealer | `test4` | staff (active) | sales | **no** |
| test Dealer | `hana.yoshida`, `test3` | staff (inactive) | sales | n/a (inactive) |
| GA3 Exec Motors 205519 Ltd | `ga3205519m` | sole active manager | **owner** | yes |
| GA3 Exec Motors 205519 Ltd | `ga3205519s` | staff | sales | **no** |
| GA3 Exec North 205519 Ltd | `ga3205519b` | sole active manager, sole member | **owner** | yes |
| Westside Motor Co. Corp. (27) | `test4` | staff (inactive) | sales | n/a (inactive) |

Two things to tell the team afterwards:

- **test Dealer has no manager**, so step 4 makes its earliest active member (`test1`) the owner
  rather than leaving it unadministered. The same happens in every seeded dealership whose members
  are all staff - get the full list from query 2.4 and tell those people they are now owners.
- **Westside Motor Co. Corp. does get an owner on a seeded database.** Its row in the table above
  records only what `09_cloud_additions.sql` adds, the inactive `test4` membership; it is not the
  dealership's whole membership. In a database freshly loaded from `dealer-platform/seed/sql/`, the
  dealership matched by the legal name `Westside Motor Co. Corp.` also has five active members from
  `01_dealers_users.sql` and no manager, so step 4 promotes the earliest of them, `hiroshi.osei`
  (`2026-02-24 16:48`), to owner. Whether Azure's dealership `27` holds those seeded members as
  well is a property of that database, so read it off query 2.4 instead of assuming: a dealership
  comes out of the migration with no owner only when it has no active member at all.
- Every member who becomes **Sales loses the Team page** and the dealership audit log. For the demo
  accounts above that is `yuandongyang061903`, `test`, `ga3205519s`, `test1`, `test4` and the
  Summit seed members. They keep all business data: DMS, CRM, leads, work orders, selling a vehicle.

## 5. The revert, and why it is not symmetric

**Read this before rolling back.** Rolling the build back without the SQL below breaks the demo:
the reverted build's enum can parse `MANAGER` and `STAFF` only, so every row reading `OWNER` or
`SALES` throws when it is read. In practice that is nearly every dealer-user sign-in and every
member list returning **500**, and the old build cannot repair the data itself.

The reverse mapping is **lossy**: `OWNER` and `MANAGER` both collapse into `MANAGER`, so the
owner-versus-manager distinction is destroyed and cannot be recovered from the data afterwards.

**5.1 Capture the owner list first.** Keep the output somewhere outside the database.

```sql
SELECT m.dealer_id, d.legal_name, m.username, m.active, m.created_at
FROM membership m
JOIN dealer d ON d.id = m.dealer_id
WHERE m.dealer_role = 'OWNER'
ORDER BY m.dealer_id, m.username;
```

**5.2 Revert the data**, in the same window as the build rollback:

```sql
START TRANSACTION;
UPDATE membership SET dealer_role = 'MANAGER' WHERE dealer_role IN ('OWNER', 'MANAGER');
UPDATE membership SET dealer_role = 'STAFF'   WHERE dealer_role = 'SALES';
DELETE FROM schema_patch WHERE patch_id = 'dealer_role_hierarchy_2026_11_03';
COMMIT;

ALTER TABLE membership ALTER COLUMN dealer_role SET DEFAULT 'STAFF';
```

Both the `DELETE` and the `ALTER` matter:

- Without the `DELETE`, the marker row stays and a later roll-forward to the new build **will not
  re-run the migration**. The new build then reads `STAFF` rows it cannot parse and you are back to
  500s with no automatic fix.
- Without the `ALTER`, the column default is still `SALES` (the forward patch set it), which the
  old build cannot parse if any insert relies on the default.

**5.3 After reverting**, the owner list from 5.1 is the only record of who was owner. Roll forward
again and the migration will re-pick the earliest active manager per dealership, which is not
necessarily the same person.

## 6. If it goes wrong

**Symptom to expect:** HTTP 500 from member reads - `GET /api/dealers/{id}/members`, the Team page,
and dealer-user sign-in - with an enum parse failure in the `dealer-core` log. That means
`membership.dealer_role` holds a value the running build's enum cannot parse.

1. **Check the data, not the code.** Run query 2.4 against the live database. Compare what it
   returns with the build that is running: new build needs `OWNER`/`MANAGER`/`SALES`, old build needs
   `MANAGER`/`STAFF`.
2. **Check whether the patch ran.** Query 2.2. Marker present but legacy spellings still in the
   table means the patch ran against different data than you think, or someone reverted the data
   without deleting the marker.
3. **Check the collation** (2.5) if managers have vanished into sales. That is the case-sensitive
   collation failure, and query 2.3 would have shown it.

Recovery order, least destructive first:

1. **Forward-fix the data** and keep the new build. For legacy rows the patch missed:
   `UPDATE membership SET dealer_role = 'SALES' WHERE dealer_role NOT IN ('OWNER','MANAGER','SALES');`
   then re-appoint owners from the query 2.3 output using the platform admin UI, which writes audit
   rows. Prefer this: no data is lost.
2. **Revert** (section 5) only if the new build itself is broken, not just the data. Accept the loss
   of the owner distinction, and capture 5.1 first.
3. **Restore the backup** (`SEED_FILE=deploy/seed/restore.sql.gz deploy/seed/import-to-azure.sh`)
   only if rows are missing rather than merely mis-roled. It replaces every Azure row, so anything
   the team did since the backup is gone.

Do not run `./deploy/deploy.sh --apply --seed` to "reset" your way out: `--seed` replaces every
Azure row with the local `dealer_core` database and would discard cloud-only accounts that the
backup in section 3 has not captured.

## 7. Restoring a dump taken before the migration

A dump taken before 2026-11-03 holds `MANAGER`/`STAFF` (or `manager`/`staff`) membership rows and no
`schema_patch` row, because that table did not exist yet. Loading one into a database whose marker is
already claimed used to leave values the running build cannot parse, with the patch refusing to run
again: member reads and dealer-user sign-in return 500 and the service cannot repair itself.

`deploy/seed/import-to-azure.sh` and `deploy/seed/load-demo-sql.sh` now close that. After the load
each one counts the membership rows whose `dealer_role` is not `OWNER`, `MANAGER` or `SALES`. If any
exist they delete the `dealer_role_hierarchy_2026_11_03` marker row, so dealer-core applies the
migration again on its next start:

- `import-to-azure.sh` restarts dealer-core itself, so the conversion happens in the same run. It
  prints the row count and says the marker was cleared.
- `load-demo-sql.sh` deliberately restarts nothing, so it prints the `az webapp restart` command to
  run. Until that restart, member reads keep returning 500.

The check reads the database after the load rather than the dump's text, so a post-migration dump is
unaffected: it carries its own `schema_patch` rows, leaves no legacy value behind, and the marker is
not touched.

Owners are **re-derived, not restored**. The re-run picks the earliest active manager per dealership
exactly as described in section 1, so a dealership whose owner was later changed by hand comes back
with the seniority pick instead. Section 5.3 applies: keep the 5.1 owner list.

The `.sql.gz` files are records of what the database held and are never rewritten. Which of the
committed ones are pre-migration:

| File in `deploy/seed/` | Membership rows | Pre-migration? |
|---|---|---|
| `azure-backup-20261101-140636.sql.gz` | none (empty `membership`, admin account only) | no legacy value, harmless |
| `azure-backup-20261101-191108.sql.gz` | none (empty `membership`, two accounts) | no legacy value, harmless |
| `azure-backup-20261101-220806.sql.gz` | 109: 103 `staff`, 3 `STAFF`, 3 `MANAGER` | **yes** |
| `azure-backup-20261101-221747.sql.gz` | 113: 103 `staff`, 7 `STAFF`, 3 `MANAGER` | **yes** |
| `dealer_core_seed.sql.gz` | 103 `staff` | **yes** |

Any `deploy/seed/backups/azure-incr-*.sql.gz` taken before the migrated build was deployed is
pre-migration as well, including the section 3 backup and the `restore.sql.gz` joined from it. None
of them carry a `schema_patch` row.
