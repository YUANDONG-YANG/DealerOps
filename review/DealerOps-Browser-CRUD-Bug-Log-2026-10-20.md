# DealerOps browser CRUD check and bug log (2026-10-20)

Manual browser pass on the local dev stack (web 5174, gateway 8080) with a headed Chromium driven by Playwright scripts. Accounts: `admin` (platform admin) and `lafe` (Dealer.User of Mazda). Bugs are recorded only; nothing has been fixed yet.

## Bugs

| # | Severity | Area | Requirement | Steps | Expected | Actual |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | Medium | Admin › Staff drawer | AUTH-03 | Admin › Dealerships › Staff › enter a 5-character temporary password › Create and bind | A plain message such as "Use 8–72 characters." under Temporary password | The raw .NET validation text is shown: "The field Password must be a string or array type with a minimum length of '8'." The browser does not check the length before sending the request, so the server returns 400 |
| B2 | Medium | Admin › Edit dealership | AUTH-02 | Edit a dealership › Contact email = `not-an-email` › Save | A field error such as "Enter a valid email address." | The top message reads "Check required contact fields: Validation failed. Contact email: The ContactEmail field is not a valid e-mail address." It says "required" for a value that is present, shows the raw .NET text, and nothing is checked before sending (400 from `PATCH /api/v1/admin/dealers/{id}`) |
| B3 | Low | Ads › Export TXT | AD-13 | Pass a check › Mark ready › Export TXT | Readable values, as on screen ("As-is", "Trade-in") and a normal UTC time | The file prints the enum codes `Condition: AS_IS` and `Source: TRADE_IN`, and `Checked at: 2026-10-20T17:04:13.0000000Z` has seven fractional digits |
| B4 | Low (dev only) | Profile | — | Open /profile and type a new display name right after the form appears › Save changes | The typed name is saved | Under React StrictMode the page loads `/api/v1/me` twice. When the second response arrives after typing has started, it overwrites the input, so "Profile saved." appears but the old name is saved. Production builds load once, so this is unlikely outside dev |

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

Not bugs (checked against requirements):

- A vehicle with no check shows `NEEDS_AI` / "Needs AI review" (Requirements §AD state rules: "Before any check, the state is `NEEDS_AI`").
- Condition stays editable on a sold vehicle (DMS-11 locks only the purchase fields; a condition change invalidates the ad check under AD-11).

## Test data left on the dev database

- Mazda: sold vehicle `2020 TOYOTA Camry` VIN `FXC4CXXMJF0XU25SE` (a sold vehicle cannot be deleted). The QA customers, vehicle `BA55XNSSKCDRU18GS` and vehicle `6YZPN4HUC9WZ3AJRN` were soft-deleted.
- Dealership `QA Dealer 0888` (id 312), with two unbound staff accounts `qa_staff_0888` and `qa_staff_2634`. There is no dealership delete.
- lafe's display name was set back to `lafe`.
