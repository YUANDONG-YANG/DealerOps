# Dealership role hierarchy — 2026-11-03

This replaces decision **D5** in `CR-Analysis-2026-11-03.md` §6 and answers CR-010. The optional "dealership admin / owner / regional manager" becomes **one** role, the dealership Owner, and the dealership gains a third tier.

`admin`, `owner` and `regional manager` in the change document all mean this single Owner role. No cross-dealership regional manager is built.

## 1. Levels

JWT roles stay `Platform.Admin` and `Dealer.User`. Every in-dealership difference lives in `membership.dealer_role`.

| Level | Role | Wire value | Appointed by |
|---|---|---|---|
| Outside the dealership | Platform admin | `Platform.Admin` (JWT) | Existing seeding |
| Highest in the dealership | Owner | `OWNER` | The platform admin, first one only |
| Middle | Manager | `MANAGER` | The owner |
| Business | Sales | `SALES` | The owner or a manager |

`DealerRole` becomes `{ Owner, Manager, Sales }`, stored as `OWNER`, `MANAGER`, `SALES` through `EnumSnakeCaseConverter`, which upper-cases what it writes.

**One active owner per dealership.** Nobody inside the dealership can create a second one.

## 2. Appointment rules

- The platform admin creates and **binds the first owner directly**. An empty dealership has nobody to approve a join request, so this bootstrap cannot become a join request.
- Once the dealership has an active owner, the platform admin only **files a join request**; the owner approves it. This keeps decision D3.
- The platform admin keeps `SetRole` for any role, which is how an owner is replaced when one leaves. Setting `OWNER` **transfers** the office: the sitting owner is demoted to `MANAGER` and the target promoted in one transaction, with an audit row for both memberships.
- **Last-owner protection.** Demoting, unbinding or deleting the only active owner is refused with **409** `LAST_OWNER`, so a successor is appointed first. An owner who is the dealership's last active member may still be unbound or deleted: the dealership becomes empty and the next admin bind bootstraps its owner directly. A demotion has no such exception, because it keeps the member active and would leave staff with no owner.
- The owner appoints managers and sales, and may demote a manager to sales.
- A manager acts on **sales members only**: promote a sales member to manager, and edit that member's full name and phone. A manager cannot touch the owner, cannot promote anyone to owner, and cannot demote another manager.
- Nobody changes their own role.

## 3. Permissions

| Capability | Owner | Manager | Sales |
|---|---|---|---|
| DMS, CRM, Leads, work orders, sell a vehicle | yes | yes | yes |
| Open Team | yes | yes | no |
| Dealership profile | yes | no | no |
| Approve or reject join requests | yes | no | no |
| Dealership audit log | yes | yes | no |
| Set a sales member to manager | yes | yes | no |
| Set a manager to sales | yes | no | no |
| Edit a member's full name and phone | any member below owner | sales only | no |
| Remove a member | manager and sales | sales only | no |
| Change the owner | no (platform admin only) | no | no |

The owner and the manager must differ, or the two tiers collapse back into today's single `MANAGER`. The dividing powers are the **dealership profile**, **join requests** and **acting on managers**.

## 4. Existing data

`EnsureCreated` plus the idempotent DDL patch list in `backend/dotnet/DealerOps.Core/Program.cs` owns the schema, so the role rename is a data patch there:

1. `UPDATE membership SET dealer_role = UPPER(dealer_role)`, which canonicalises the spelling. Rows written by the app are already upper case, because `EnumSnakeCaseConverter` upper-cases what it writes, and the committed seed files under `dealer-platform/seed/sql/` now hold upper case (`OWNER`, `MANAGER`, `SALES`) as well. The step stays because a database may still carry rows written by an earlier build or loaded from an older seed revision or dump, which can be lower case (`staff`, `manager`), and because normalising first makes the patch independent of the column's collation. Every later comparison is written against `UPPER(dealer_role)`, so the patch behaves identically under a `_ci`, `_cs` or `_bin` collation. Without this, a case-sensitive collation would read a lower-case `manager` as a legacy spelling, flatten it to `SALES` in step 2 and then skip that dealership in step 3, leaving it with neither a manager nor an owner and raising no error.
2. `UPDATE membership SET dealer_role = 'SALES' WHERE UPPER(dealer_role) NOT IN ('OWNER','MANAGER','SALES')`, so any legacy spelling (`staff`, `STAFF`) lands on `SALES`.
3. Per dealership that has no active owner, the **earliest** active `MANAGER` membership (lowest `created_at`, then lowest `id`) becomes `OWNER`. Later managers stay `MANAGER`.
4. Per dealership that has at least one active member but, after step 3, still no active `OWNER` and no active `MANAGER`, the **earliest** active membership (same ordering) becomes `OWNER`. Without this, a dealership whose members were all staff ends the rename with every row reading `SALES`, and §3 then leaves nobody inside it who can open Team, approve a join request or edit the dealership profile: only the platform admin could rescue it. A dealership with no active member at all is left untouched, and the next platform-admin bind bootstraps its owner directly as in §2.
5. `vehicle.sold_by` is backfilled from the audit trail: for every sold vehicle whose `sold_by` is still `NULL`, the `actor_username` of the most recent `VEHICLE`/`SELL` `audit_event` row for that vehicle (`entity_id` is the vehicle id, ordered by `created_at` then `id` descending). The column was added with this change, so every earlier sale has it `NULL`, and the sales report's per-salesperson rows would not add up to its headline totals on historical data. A sold vehicle with no `SELL` audit row keeps `NULL` and stays out of the per-salesperson breakdown while still counting in the totals.

**The patch runs once; it is not idempotent and must not be re-run.** Steps 3 and 4 override whatever role a row holds, so re-running them would undo an administrator's decision: unbind an owner intending to bind a replacement, restart Core, and the earliest manager would be promoted silently. Program.cs therefore keeps a marker table, `schema_patch (patch_id, applied_at)`, claims the patch id `dealer_role_hierarchy_2026_11_03` with `INSERT IGNORE`, and runs all five statements only when that insert claimed the row. They share one explicit transaction with the marker, so a transient MySQL failure rolls the marker back instead of leaving the data half migrated.

Roles are stored in upper case — `OWNER`, `MANAGER`, `SALES` — which is what `EnumSnakeCaseConverter` writes and what the patch leaves behind.

**Reverting the data also means deleting the marker row** (`DELETE FROM schema_patch WHERE patch_id = 'dealer_role_hierarchy_2026_11_03'`). Leave it in place and a later roll-forward skips the migration, so the new build reads the restored legacy spellings and fails to parse them. `deploy/ROLE-MIGRATION-2026-11-03.md` §5 has the full revert.

The column default is patched in the same list (`ALTER TABLE membership ALTER COLUMN dealer_role SET DEFAULT 'SALES'`), because `ADD COLUMN` cannot change the default of a column a pre-existing database already has.

**Deployment note.** Take a fresh Azure backup before the first start that carries this patch. The rename is lossy in reverse: `SALES` does not say whether a row was `staff` or already `sales`, and a promoted `OWNER` cannot be told from an owner appointed later. The seed files under `dealer-platform/seed/sql/` carry the migrated values, so a restore through `deploy/seed/import-to-azure.sh` or `deploy/deploy.sh --apply --seed` no longer reintroduces unparseable role text.

## 5. Not changed

- **Sales report.** It counts every member who sold a vehicle. It is not filtered by role, and `sold_by` is not restricted to the Sales role: an owner or a manager may sell a vehicle and must appear in the report.
- **Business data access.** All three in-dealership roles see the same dealership data; only team administration differs.
- **Tenancy.** A member still belongs to one dealership.

## 5a. Scope boundary

The change document describes this role as having "some admin capabilities ... like the platform admin account, but is exclusive to a single dealership". **Decision of 2026-11-03: meet the change document and no more.** The owner edits a member's full name and phone, which is what the client's own request names ("edit certain employee information"), and nothing beyond it.

The owner therefore does **not** get these platform-admin powers, which stay with the platform admin:

| Platform-admin power | Why the owner does not get it |
|---|---|
| Edit a member's sign-in email | The email is a sign-in credential. An owner who can change it can take over a member's account inside their own dealership. |
| Delete a user account | The owner removes a member from the dealership; the account itself survives, which keeps the sale and audit history intact (design/15 §8.6, NFR-07). |
| Remove or edit pending accounts | The dealership-facing equivalent is approving or rejecting a join request, which the owner already does. |

The change document calls this role optional and says it "should likely be discussed further with the client before full implementation occurs". Any widening of the table above needs that discussion first.

## 6. Code and documents affected

- `backend/dotnet/DealerOps.Core/Dealer/DealerRole.cs`, `MembershipService.cs`, `JoinRequestService.cs`, `DealerTeamController.cs`, `AdminMemberController.cs`
- `backend/dotnet/DealerOps.Core/Common/Tenant/TenantGuard.cs`: `RequireManager` splits into `RequireOwner` (profile, join requests) and `RequireTeamAccess` (owner or manager)
- `backend/dotnet/DealerOps.Core/Program.cs`: the data patch in §4
- `frontend/react/src`: `TeamPage.tsx`, `AdminPage.tsx`, `router.tsx`, `layouts/AppLayout.tsx`, `api/me.ts`, `api/members.ts`
- `design/15-Data-Auth-and-Gateway.md` §2.5, `design/14-Backend-API-Contract.md` §3.7b and §5.6–5.8, `design/21-Feature-Extensions.md` AUTH-27, `dealer-platform/openapi.yaml`
- `playwright/tests/global.setup.ts` and the role specs
