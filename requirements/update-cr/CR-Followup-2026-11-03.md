# Change Request Follow-up — 2026-11-03

Inputs:
- `requirements/update-cr/implementation-check/` (20 threads, CR-001 to CR-068): 54 implemented, 13 partial, 1 not applicable.
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
