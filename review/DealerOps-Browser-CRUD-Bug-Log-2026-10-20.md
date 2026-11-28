# DealerOps browser CRUD check and bug log (2026-10-20)

Manual browser pass on the local dev stack (web 5174, gateway 8080) with a headed Chromium driven by Playwright scripts. Accounts: `admin` (platform admin) and `lafe` (Dealer.User of Mazda). All bugs B1–B10 were fixed and re-checked in the browser the same day (see Fixes).

## Bugs

| # | Severity | Area | Requirement | Steps | Expected | Actual |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | Medium | Admin › Staff drawer | AUTH-03 | Admin › Dealerships › Staff › enter a 5-character temporary password › Create and bind | A plain message such as "Use 8–72 characters." under Temporary password | The raw .NET validation text is shown: "The field Password must be a string or array type with a minimum length of '8'." The browser does not check the length before sending the request, so the server returns 400 |
| B2 | Medium | Admin › Edit dealership | AUTH-02 | Edit a dealership › Contact email = `not-an-email` › Save | A field error such as "Enter a valid email address." | The top message reads "Check required contact fields: Validation failed. Contact email: The ContactEmail field is not a valid e-mail address." It says "required" for a value that is present, shows the raw .NET text, and nothing is checked before sending (400 from `PATCH /api/v1/admin/dealers/{id}`) |
| B3 | Low | Ads › Export TXT | AD-13 | Pass a check › Mark ready › Export TXT | Readable values, as on screen ("As-is", "Trade-in") and a normal UTC time | The file prints the enum codes `Condition: AS_IS` and `Source: TRADE_IN`, and `Checked at: 2026-10-20T17:04:13.0000000Z` has seven fractional digits |
| B4 | Low (dev only) | Profile | — | Open /profile and type a new display name right after the form appears › Save changes | The typed name is saved | Under React StrictMode the page loads `/api/v1/me` twice. When the second response arrives after typing has started, it overwrites the input, so "Profile saved." appears but the old name is saved. Production builds load once, so this is unlikely outside dev |
| B5 | Low | Header › join-request bell | AUTH-25 | One pending join request for the dealership | Screen-reader name "1 join request" | The bell's `aria-label` is "1 join requests" |
| B6 | Low | Login after account deletion | UI-profile | Profile › Delete my account › Yes, delete | The sign-in page confirms the deletion | Profile redirects to `/login?notice=deleted`, but the sign-in page ignored that notice, so nothing was shown |
| B7 | Low | DMS drawer › Image Studio | IMG-04 | Open a vehicle › upload or delete a photo | The drawer's audit trail shows the new `Photo · CREATE` / `Photo · DELETE` row, as it does after a work-order change | The audit trail kept the old rows until the drawer was reopened |
| B8 | High | Admin › Members tab | AUTH-05 | Admin › Members › click a member's Status checkbox | The checkbox unbinds (with confirmation) or reactivates the member | The checkbox could not be clicked: its `<label>` used `.switch-label` (white text, `pointer-events: none`, meant for text inside the old `.switch` button), so clicks never reached the input and the "Active" / "Inactive" text was white on white. Existing tests only read the text, so they passed |
| B9 | Medium | Ads after an admin rule change | AD-15 | A dealer has an ad open › admin saves any rule › dealer clicks Run check | The check runs with the new rule set | `409 VERSION_CONFLICT`: "Refresh and retry: someone else changed this record…", although nobody edited the ad. Saving a rule incremented `contentVersion` through tracked entities, so EF also bumped every listing's edit `version`
| B10 | Low | DMS drawer › Image Studio | IMG-01 | Enhance a photo, then delete it | No request for the deleted photo | After the list reloaded, the preview briefly still pointed at the deleted id and requested its content (404 in the console, no message on screen); reproduced on every enhance-then-delete

## Fixes

| # | Change | Re-check |
| --- | --- | --- |
| B1 | `CreateMemberRequest.Password` length attributes carry "Use 8-72 characters.", the same text as the password reset and self-registration requests | The field error reads "Use 8-72 characters." |
| B2 | `EmailAddress` on the dealership create and patch requests says "Enter a valid email address."; the admin form shows the field errors without the "Check required contact fields:" prefix or the generic "Validation failed." | The form shows "Contact email: Enter a valid email address." |
| B3 | Export TXT prints condition and source with the web's wording (`As-is`, `Trade in`) and the check time to the second (`2026-10-03T11:14:00Z`) | Exported file checked |
| B4 | The profile load ignores a response that arrives after its effect was cleaned up | Typing right after the form appears is kept |
| B6 | The sign-in page shows "Your account was deleted." for `notice=deleted` | Notice shown |
| B8 | The Members status label uses the existing `.checkbox-label` style; the unused `.switch`, `.switch-knob` and `.switch-label` styles were removed | Reactivate and unbind both work from the Members tab; the label is readable |
| B9 | `ComplianceRuleService.Update` saves the override and then increments `content_version` with one bulk update in the same transaction, so the listing's edit version is unchanged (design/14 §admin rules, design/21 AD-15 describe only the content-version change) | On the E2E stack, with the ad page left open: REVIEW severity and a custom message apply, a disabled rule is skipped, the restored rule blocks again |
| B5 | The bell says "1 join request" for one request and "N join requests" otherwise; the two assertions in `playwright/tests/ui/team-profile.spec.ts` were updated with the user's approval | Spec passes |
| B10 | The preview effect uses the id of a photo that is still in the list, so a deleted id is never fetched | Three enhance-then-delete runs: 0 requests with 404 |
| B7 | `PhotoStudioPanel` takes an optional `onChanged` callback after upload, enhance, and delete; the DMS drawer reloads its audit trail there | `Photo · CREATE` and `Photo · DELETE` appear without reopening |

Existing E2E specs pass: `ads-ready-export`, `admin-dealers`, `admin-members`, `team-profile`, `api/tenancy` (42/42), then `team-profile`, `ads-workspace`, `register-landing`, `auth` after B6/B7 (44/44). After B8/B9 the full suite passes: 309 passed, 3 skipped. After B5/B10, `team-profile`, `ads-workspace` and `dms-detail` pass (24/24).

## Checked and working

lafe (Dealer.User):

- DMS: list, search by VIN, create (no default source/condition, As-is label), edit with audit entry, rejects three-decimal cost, sell with date + price + CRM buyer (buyer linked), sold vehicle keeps purchase fields locked and hides Sell / Delete / Decode, delete an in-stock vehicle.
- CRM: create, search by digits-only phone, edit address, link a vehicle and unlink it, linked leads shown, soft delete.
- Leads: filters, create with a new customer + vehicle of interest + first note, change stage and owner, add a note, Lost requires a reason, closed lead is read-only except notes, lead shows on the customer.
- Sales report: loads with the vehicle sales and lead funnel sections.
- Ads: deep link `/ads?vehicleId=`, BLOCK findings (PRICE_MISSING, DEALER_NAME_MISSING, DEALER_CONTACT_MISSING, CONDITION_UNDISCLOSED, NEW_USED_NOT_STATED), real AI review gives PASSED, Mark ready, Export TXT (no cost or customer data), simulated publish / unpublish, editing after a pass gives STALE and disables export, Image Studio panel shows on the Ads page.
- Team: Members and Join requests tabs load. Profile: edit display name.

admin (platform admin):

- Dealerships: list, search, create (values trimmed, blank name rejected), edit address.
- Staff: create and bind, reset password (the old temporary password is rejected and the new one works), the new staff member sees an empty tenant, unbind takes effect right away (next page shows NO ACCESS), and an unbound user can still sign in and sees only the no-access page.
- Members search, Pending accounts tab, Ad rules tab (view only; no rule was toggled, because a change would stale every dealer's checks), and admin is kept off business pages (`/dms` redirects to `/admin`).

Second round (lafe, plus throwaway accounts):

- Work orders: add, edit the task, Start (In progress), Done with a cost (repair cost goes from 100 to 145.50), cancel; each step is audited.
- Image Studio in the DMS drawer: upload, Auto fix enhancement ("Enhanced · Auto fix"), delete with confirmation.
- Lease ad check: LEASE_APR_MISSING, LEASE_TERM_MISSING, LEASE_DOWN_MISSING, LEASE_ALLOWANCE_UNSTATED and DEALER_CONTACT_INCOMPLETE for a lease copy with only a monthly payment.
- Optimistic locking: a second session saving a stale vehicle or customer gets "Refresh and retry: someone else changed this record…".
- Assistant: answers "How many vehicles are in stock?" from dealership data and states it is read-only.
- Phone width (390 px): DMS, CRM, Leads, Ads, Team, Profile and Sales report have no horizontal scroll.
- Self-registration → request to join Mazda → the bell shows the request → lafe approves on Team → the new member opens DMS → the member deletes the account and its password stops working.

Third round:

- Filters match the API counts: DMS status / condition / year / make and Reset, CRM link status, Leads stage / owner / overdue; DMS page 2 shows the next ten rows.
- Sales report: every KPI matches a recomputation from the raw vehicle and lead lists (5 sold, revenue $91,479.00, gross profit $21,379.65, 34.4 days, 15 in stock, $280,913.75 invested, 16 leads, 8 open, 50% win rate).
- Ads: a sold vehicle's ad is read-only (Save draft, Run check, Mark ready, Export TXT disabled); finance copy without an APR gives FINANCE_APR_MISSING and FINANCE_TERM_MISSING; on Radio / TV / Billboard the APR proximity check is skipped.
- Image Studio rejects a non-image ("Photo must be a JPEG or PNG.") and a 3 MB file ("Photo must be 2 MB or smaller.").
- Profile phone: invalid value rejected with a field error; a local number is stored as `+1…`; clearing works.
- Register: empty form, short password, no email or phone, and a taken username each show a field error; an invalid email is stopped by the browser's email field.
- Sign-in with a formatted local phone `(403) 555-xxxx` and with an upper-case email.
- Admin: Pending accounts lists self-registered users; "Bind without password" binds one; a dealership logo uploads, shows in the staff header, and is removed.
- Ad rules (E2E stack only, because a change stales every dealership's checks): severity, message, disable and restore, as listed under B9.
- Leads: sold vehicles are not offered as the vehicle of interest; Overdue only lists a past follow-up; notes are newest first; Won locks the lead but still accepts notes; the assistant does not read lead notes (LEAD-09).

Not bugs (checked against requirements):

- A vehicle with no check shows `NEEDS_AI` / "Needs AI review" (Requirements §AD state rules: "Before any check, the state is `NEEDS_AI`").
- The sign-in token is in `sessionStorage`, so a new browser tab must sign in again (design/13 §Login call, design/15).
- An unbound account opening /profile sees the no-access page (design/13).
- Condition stays editable on a sold vehicle (DMS-11 locks only the purchase fields; a condition change invalidates the ad check under AD-11).

## Outside the code

- Google sign-in on `http://localhost:5174` fails with `[GSI_LOGGER]: The given origin is not allowed for the given client ID`. The client ID in `frontend/react/src/auth/google.ts` needs `http://localhost:5174` under Authorized JavaScript origins in the Google Cloud console; that is account configuration, not a code defect.

## Test data left on the dev database

- Mazda: sold vehicle `2020 TOYOTA Camry` VIN `FXC4CXXMJF0XU25SE` (a sold vehicle cannot be deleted). The QA customers, vehicle `BA55XNSSKCDRU18GS` and vehicle `6YZPN4HUC9WZ3AJRN` were soft-deleted.
- Dealership `QA Dealer 0888` (id 312), with two unbound staff accounts `qa_staff_0888` and `qa_staff_2634`. There is no dealership delete.
- lafe's display name was set back to `lafe`.
- The QA vehicle `LPPTA2H1RTK1BK73H` (second round) was soft-deleted; its work orders, photo audit and lease listing stay in history. The throwaway accounts `qa_reg_7877` and `qa_del_8009` deleted themselves.
- The third round soft-deleted its QA customer and the throwaway account `qa_pend_3591` deleted itself. Seeded ad 414 (2003 Honda Accord) was edited and restored, then rechecked to PASSED.
- The B3 re-check marked one seeded Mazda listing with a passed check as Ready before exporting it.
