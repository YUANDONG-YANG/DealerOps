# Audit Log: Actor Name, Actor Role, and Dealership Name at Event Time (2026-11-09)

Request (Robin, 2026-11-09): the platform admin's audit log shows the dealership as a bare id
(`285`) and has no role column. An audit row must record the details **as they were when the
operation happened**: the actor's name, the actor's role, and the dealership's name. A later
rename or role change must not rewrite history.

Status: **implemented 2026-11-09** at Robin's request. The read fields are added in
`AuditService.PageOfLog` (admin and dealership logs only), not in `ToItem`, so a record's history
keeps its current contract, as `dealerId` and `clientIp` already do.

## Current behavior

- `audit_event` stores `dealer_id` and `actor_username` only
  (`backend/dotnet/DealerOps.Core/Audit/AuditEventEntity.cs`). There is no snapshot of the
  actor's display name, the actor's role, or the dealership's name.
- `AuditItem` (`Audit/Dto/AuditItem.cs`) therefore carries only `DealerId`, and
  `frontend/react/src/components/AuditLogPanel.tsx:91` renders the Dealership column as
  `String(r.dealerId)` (or `Platform` when null).
- Every audit row is written by one method, `AuditService.Record`
  (`backend/dotnet/DealerOps.Core/Audit/AuditService.cs:48`), which receives `dealerId` and
  `actorUsername`. Callers do not need to change.
- Columns added after the first deploy go through the `ALTER TABLE` list in
  `backend/dotnet/DealerOps.Core/Program.cs:294` (the same way `client_ip` and
  `client_location` were added); `EnsureCreated` covers new databases.

## Open issue

| ID | Severity | Where | Issue | Smallest fix |
|---|---|---|---|---|
| B1 | Gap (audit content) | `AuditEventEntity.cs`, `AuditService.Record`, `Program.cs`, `AuditItem.cs`, `AuditService.ToItem`, `api/audit.ts`, `AuditLogPanel.tsx` | The audit row does not record who the actor was (name, role) or which dealership by name at the time of the event. | See steps 1-5 below. |

### Steps

1. **Columns.** Add to `AuditEventEntity` and to the `Program.cs` `ALTER TABLE` list:
   - `actor_display_name VARCHAR(120) NULL` — `app_user.display_name` at event time.
   - `actor_role VARCHAR(16) NULL` — `PLATFORM_ADMIN` when `app_user.role` is
     `Platform.Admin`; otherwise the actor's `membership.dealer_role` (`OWNER` / `MANAGER` /
     `SALES`) at the row's `dealer_id`; null when there is no such membership (unbound account,
     self sign-up) or the actor is `anonymous` / unknown.
   - `dealer_name VARCHAR(255) NULL` — `dealer.legal_name` of `dealer_id` at event time; null
     when `dealer_id` is null.
2. **Snapshot on write.** In `AuditService.Record`, before building the entity, look up the three
   values from `_db.AppUsers` (by username), `_db.Memberships` (username + dealerId, active), and
   `_db.Dealers` (by id), and set them on the new row. Use the values in the current
   `DbContext` (tracked entities included), so a row written in the same unit of work as a
   rename or role change records the state that operation produced. No caller signature changes.
3. **Read.** Add `ActorDisplayName`, `ActorRole`, `DealerName` (all `string?`) to `AuditItem`
   and fill them in `ToItem`, so the record-history views get them too. Never re-resolve them on
   read: the stored snapshot is the audit truth.
4. **UI.** Add `actorDisplayName`, `actorRole`, `dealerName` to the row type in
   `frontend/react/src/api/audit.ts`. In `AuditLogPanel.tsx`:
   - Actor cell: `username` plus the display name, e.g. `lafe (Lafe Smith)`.
   - New non-sortable `Role` column right after `Actor`, on both the admin and the dealership
     logs; `—` when null.
   - Dealership cell: `Platform` when `dealerId` is null, else `dealerName`, falling back to
     `#<dealerId>` for rows written before this change.
   - Sorting and the `dealerId` filter stay on the id; no change to sort/filter contract.
5. **Docs.** `design/15-Data-Auth-and-Gateway.md` `audit_event` table (next to
   `client_location`, around line 610): add the three columns and state they are snapshots taken
   at write time. `design/14-Backend-API-Contract.md` §9.2 / §9.3 item description and
   `AuditItem` in `dealer-platform/openapi.yaml`: add `actorDisplayName`, `actorRole`,
   `dealerName`.

### Rows written before this change

They have no snapshot; the three columns stay null and the UI falls back as in step 4. Do
**not** backfill them with today's names and roles: that would present current values as
historical ones, which is what this change exists to prevent.

## Validation for the implementer

- `dotnet build` of `DealerOps.Core`; `npm run build` in `frontend/react`.
- Smoke against a database that existed before the change: Core starts and the `ALTER TABLE`
  statements add the three columns.
- Sign in as `admin`: the new `LOGIN` row shows Role `PLATFORM_ADMIN`, Dealership `Platform`.
- As `lafe`, edit a vehicle photo: the row shows lafe's display name, dealership role, and the
  dealership's legal name.
- As admin, rename that dealership and change lafe's role; reload the log: lafe's earlier rows
  keep the old dealership name and old role, and only new rows show the new values.
