# Change Request Follow-up — 2026-11-03

Inputs:
- `requirements/iteration-2/implementation-check/` (20 threads, CR-001 to CR-068): 54 implemented, 13 partial, 1 not applicable.
- `CR-Source-Review-2026-11-03.md`.
- The decisions in `CR-Analysis-2026-11-03.md` §6.

Rule: **the client's requests come first.** Where an author suggestion conflicts with a client request, the client request wins. Where the client left an item open, the documented default stands.

## 1. Disposition of the partial items

| CR | Check finding | Decision | Action |
|---|---|---|---|
| CR-009 | Create-account buttons removed; no dealership inquiry; `/register` still exists. | The client said "for now, removing the button to create account from the home page will suffice". The inquiry waits for the client discussion. | None. Accepted as complete for this release. |
| CR-010 | Dealership admin role not built. | Optional, and to be discussed with the client (D5). | None. |
| CR-012 | Leads sorting covers only the current page of 10. | The client asked for sortable columns, and a page-only sort is misleading. | **Fix:** server `sort` parameter on the lead list, wired to the Leads headers. |
| CR-014, CR-016 | Activity and admin Audit log have no Location column. | Location exists on `origin/robin` (commit `54b6664`, `audit_event.client_location`). The screenshots come from that build. | **Fix:** merge `origin/robin` into `V2`, then make Location sortable on both logs. |
| CR-018 | Pending accounts: Registered sorts only the first page. | Same as CR-012. | **Fix:** server sort on the pending-accounts list. |
| CR-020 | Manager record-audit menus sort only the loaded page. | Same as CR-012. | **Fix:** pass the sort to the audit API from those panels. |
| CR-022 | Discard prompts exist; an ordinary save is not confirmed. The staff-account and member-edit drawers have no dirty guard. | The text asks for a confirmation "when there is unsaved data", and asks for a confirmation before save only for the "larger change" (Team > Dealership profile) and for closing a lead. A confirm on every save would add a click to routine CRM and DMS work. | **Fix:** add the dirty guard to the admin staff-account drawer and the Team member-edit drawer. Every listed save shows a success message. No confirm on ordinary saves. |
| CR-041 | A WON lead sold to that customer cannot reopen, and neither can a lead that would duplicate an open lead. | Matches D7; a reopen must not contradict a recorded sale or the duplicate rule. | None. |
| CR-047 | Only the VIN model-year code is enforced. | Author suggestion with no matching rule given (P22). A full decode check needs the external decoder at save time. | None for this release. Recorded as a limitation. |
| CR-048 | Carfax URL must be https on carfax.com or carfax.ca; it is not unique across vehicles; a blank URL saves. | "Exclusive" is read as "accept only Carfax links" (P23). Carfax is optional vehicle data. | None. |
| CR-051 | Buyer-site inquiries skip the duplicate-lead check. | P5. A repeat shopper inquiry must not fail. | **Fix:** when the customer already has an open lead on the vehicle, add the inquiry as a note on that lead instead of creating a new one. |
| CR-052 | Leads close as WON or LOST; nothing is written on the customer. | The lead stage is "the appropriate label" (P27). | None. |
| CR-055 | The admin still binds directly when the dealership has no manager. | Onboarding needs a first manager (D3, P8). | None. Documented exception. |

## 2. Client over author conflict

| CR | Check finding | Decision | Action |
|---|---|---|---|
| CR-063 | Sample ads link to `/register`. | The client asked to remove the home-page create-account entry (CR-009). An ad linking to sign-up brings it back (D4, P1). | **Fix:** sample ads link back to `/login` ("Sign in to check your own ads"). |

## 3. Order of work

1. Wait for the running implementation workflow to finish, so the working tree is stable.
2. Merge `origin/robin` into `V2`, resolving conflicts in the audit, `Program.cs`, `openapi.yaml` and design 13/14 files. Re-point `v1` to `origin/robin`, so it is the real pre-change snapshot.
3. Apply the fixes above: CR-012, 014, 016, 018, 020, 022, 051 and 063.
4. Build Core, the Gateway and the React frontend, then rerun the affected Playwright specs and the full suite.
5. Commit on `V2`.

## 7. Follow-up implementation, audit fixes and retest (2026-11-03)

This section closes the follow-up pass. It covers the fixes listed in §1 and §2, the Owner / Manager /
Sales dealership hierarchy (D5, specified in `requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md`),
the defects the six read-only audits reported, and the final build and Playwright run.

Note on paths: the change-request documents were moved during the pass. They now live in
`requirements/iteration-2/` (`CR-Analysis-2026-11-03.md`, `CR-Role-Hierarchy-2026-11-03.md`,
`CR-Source-Review-2026-11-03.md`, this file); `requirements/update-cr/` no longer exists.

### 7.1 Follow-up fixes carried out

- Server sorting for the paged lists that previously sorted one page only: leads (CR-012),
  pending accounts (CR-018) and the manager record-audit panels (CR-020), plus Location on the
  dealership and platform-admin logs (CR-014, CR-016) after `origin/robin` was merged into `V2`.
- Dirty guards on the admin staff-account drawer and the Team member-edit drawer, with a save
  confirmation kept only for the dealership profile and for closing a lead (CR-022).
- Buyer-site inquiries from a shopper who already has an open lead on the vehicle become a note on
  that lead, with no second lead and no second unresolved inbox message (CR-051).
- Sample ads link back to `/login` (CR-063, decision D4).
- `VehicleService` now decodes the VIN through the vPIC catalog client on create and on edit and
  refuses a save whose make, model or model year disagrees with the decode, falling back to the
  VIN's model-year character when the decoder is unavailable (CR-047, decision D9). This closes the
  limitation recorded in §1 for CR-047.

### 7.2 Owner / Manager / Sales hierarchy

The single dealership Owner tier was implemented as specified (D5): one active owner per dealership
is enforced in code, as the user decided on 2026-11-03. Appointing a second owner transfers the
office and drops the sitting owner to Manager in the same change, with both membership rows audited.
The only owner cannot be demoted, unbound by the platform admin, deleted by the admin or self-deleted
while other members remain (`409 LAST_OWNER`); the owner who is also the last active member can still
leave, and the next admin bind bootstraps the next owner. Join requests and the dealership profile are
owner-only; a manager sees Members and Activity; a sales member has no Team page.

### 7.3 Audit fixes

1. Free-text audit search returned 500 on every query. `field_summary` and `previous_values` are
   JSON columns, so `string.Contains` translated to `LOWER(col) LIKE CAST(@p AS json)` and MySQL
   rejected it. Both predicates now use `.ToLower().IndexOf(text) >= 0`
   (`backend/dotnet/DealerOps.Core/Audit/AuditService.cs`), which translates to `LOCATE(...)`.
   CR-027 and CR-058 work again on the dealership and the platform-admin log.
2. Stale role expectations in `playwright/tests/api/dealer-roles.spec.ts`,
   `playwright/tests/ui/team-roles.spec.ts` and `playwright/tests/ui/team-profile.spec.ts` were
   repaired against the one-active-owner rule and the owner-only tabs, and the cardinality rules were
   given API and UI coverage.
3. `playwright/tests/ui/admin-members.spec.ts`: the bind-error assertions matched the drawer's
   owner-bootstrap line through a shared class; they now target the bind error and the field error.
4. The DMS and report specs were repaired against the shipped search placeholder, the typed Year
   box and the period selector, and given coverage for blanks-last sorting, the `SOLD_LOCKED` buyer
   guard and the new filter bar.
5. `playwright/tests/api/leads.spec.ts` asserted that a WON lead whose vehicle was sold to another
   customer still reopens. The contract (`design/14-Backend-API-Contract.md` §5.5, decision D7)
   refuses it with `400 WRONG_DEALER_OR_SOLD`; the test now asserts the refusal.
6. Duplicated local VIN and sale helpers left by the interrupted phase were removed in favour of
   `playwright/support/api.ts`.
7. `Api.sellVehicle` in `playwright/support/api.ts` still posted a sale with no buyer, which D8
   refuses with 400. The helper now defaults to "Other" with a typed buyer name, so the four specs
   that still use it sell again.

Spec repairs made in this final pass, all of them outdated expectations rather than application
defects:

- `playwright/support/api.ts`: `randomVin` now carries an unassigned world manufacturer identifier.
  With a random prefix the new D9 decode check matched a real manufacturer and refused almost every
  generated vehicle; with an unassigned one the decoder reports no vehicle and the server keeps its
  model-year fallback. The decode itself is exercised with real VINs in the catalog specs.
- `playwright/tests/api/catalog-photos.spec.ts`: the public dealership directory carries its contact
  block (`design/14-Backend-API-Contract.md` §4.6.2, CR H4); the spec asserted it was absent.
- `playwright/tests/ui/ads-check.spec.ts`: the pass / fail / review marks are themed `CheckMark`
  icons, not emoji, so the rows are asserted on the icon state next to the text.
- `playwright/tests/ui/ads-publish.spec.ts`, `playwright/tests/ui/ads-ready-export.spec.ts`: the
  allowed browser-error pattern still matched the old client log wording, so the AI-provider skip
  failed on an unexpected console line.
- `playwright/tests/ui/dms-details-payments.spec.ts`: the Make and Model boxes swap between a text
  input and a select while the catalog loads, and the type-ahead list covers the Search button; both
  are now handled instead of racing.
- `playwright/tests/ui/team-profile.spec.ts`: the dealership-profile edit now starts after the page's
  load effect has settled, because the React StrictMode dev build runs it twice and a late response
  put the stored values back in the form.

### 7.4 Builds and validation

| Command | Result |
|---|---|
| `dotnet build backend/dotnet/DealerOps.Core.sln` | Build succeeded, 0 errors, 2 warnings (pre-existing `NU1902` on MySqlConnector) |
| `cd frontend/react && npm run build` | Built in 3.30s, 0 errors (chunk-size advisory only) |
| `cd playwright && npx tsc --noEmit -p tsconfig.json` | Clean |
| `cd playwright && npm test` (private stack restarted from the working tree, then the full suite) | See below |

The private E2E stack was restarted from the working tree before the run and stopped afterwards
(`cd playwright && npm run stack:stop`), so the local development ports are free.

### 7.5 Final Playwright counts

| Run | Passed | Failed | Skipped |
|---|---|---|---|
| First full run after the builds | 409 | 23 | 7 |
| Final full run | **428** | **0** | **11** |

All 11 skips are AI-provider dependent: five in `tests/api/ads.spec.ts`, three in
`tests/api/buyer-site.spec.ts`, and one each in `tests/ui/ads-publish.spec.ts`,
`tests/ui/ads-ready-export.spec.ts` and `tests/ui/shop-disclaimer.spec.ts`.

### 7.6 Remaining limitations

- No AI provider key is configured for the E2E stack, so the AI service answers every compliance
  review with `503 AI_KEY_MISSING` and the gateway turns it into `502 AI_UNAVAILABLE`. No ad can pass
  a check, so no vehicle can be publicly listed and the buyer-inquiry path cannot run here. The
  affected specs skip; they need a stack with a provider key, not a code change.
- `GET /actuator/health` reports `ai: UP` with no provider key, because the AI health endpoint is a
  liveness probe. The specs therefore detect the missing provider from the first `502` rather than
  from health.
- The D9 decode check depends on the external vPIC service. When it is unreachable or does not know
  the VIN, the save keeps the model-year character check only, and no spec asserts the decode-match
  refusal, because the outcome would depend on that third-party service.
- Nothing was committed, and no configuration file was changed.
