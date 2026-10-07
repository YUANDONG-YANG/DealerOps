# 06 Pages and Acceptance

## 1. Page list (PDF §7 + SCOPE)

| Page | Access | Purpose | Source |
|---|---|---|---|
| Login | Public | Dealer and admin sign-in | PDF |
| Admin | Platform admin | Create dealers; create / remove logins | PDF |
| DMS | Dealer user | Add, edit, review vehicles | PDF |
| CRM | Dealer user | Add, edit, review customers; link purchases | PDF |
| Ad compliance | Dealer user | Check an ad against OMVIC before publishing | PDF |
| Assistant | Dealer user | In-dealer read-only AI Q&A | SCOPE erratum 2 |

## 2. Page-level requirements

### Login

| ID | Requirement |
|---|---|
| UI-01 | One username + password sign-in form shared by admins and dealer users (reversed 2026-09-30, see design/SCOPE-BASELINE.md errata 1) |
| UI-02 | After sign-in, route by role: admin → Admin, dealer user → DMS |
| UI-03 | A user with no dealer binding sees "Not provisioned yet, contact your administrator" |
| UI-04 | Unauthenticated access to any internal page redirects to Login |

### Admin

| ID | Requirement |
|---|---|
| UI-10 | Dealer list: name, contact info, staff count |
| UI-11 | Create / edit dealer form (registered name, phone, email, address) |
| UI-12 | Dealer detail lists logins; add binding, remove binding (with confirmation) |
| UI-13 | No vehicle, customer, or ad entry points appear on this page |

### DMS

| ID | Requirement |
|---|---|
| UI-20 | List: year make model, VIN, condition, status, date added; search + filters + paging |
| UI-21 | Create / edit form: required fields marked `*`, instant client validation, server errors shown per field |
| UI-22 | Detail: all fields, linked customer, ad check status, change history |
| UI-23 | "Mark as sold" is a separate action that takes date and price together |
| UI-24 | Locked fields on sold vehicles are read-only |

### CRM

| ID | Requirement |
|---|---|
| UI-30 | List: name, email, phone, vehicles purchased count; search + paging |
| UI-31 | Create / edit form |
| UI-32 | Detail: basic info, linked vehicles (clickable), link / unlink buttons, change history |
| UI-33 | Link dialog lists only unlinked vehicles of this dealer (in stock or sold), searchable by VIN / model |

### Ad compliance

| ID | Requirement |
|---|---|
| UI-40 | Pick a vehicle → edit title, body, kind, medium; view the checklist (no additional answer fields) |
| UI-41 | Show year, condition, dealer name, and contact info pulled from DMS / dealer profile |
| UI-42 | "Check" button with a loading state (up to 15 s) |
| UI-43 | Results listed per rule with ✅ / ❌ / ⚠️ and reason |
| UI-44 | Status badge: Needs AI / Blocked / AI unavailable / Passed / Stale |
| UI-45 | Ready and Export TXT buttons are enabled only when Passed and not Stale |
| UI-46 | Dedicated disclaimer UI is deferred (AD-14); explain at defense that Passed is not legal approval |

### Assistant

| ID | Requirement |
|---|---|
| UI-50 | Chat input + answer area; answers may include vehicle / customer card links |
| UI-51 | Clear notice that the assistant is read-only and never changes data |

## 3. Acceptance cases

| ID | Scenario | Steps | Expected | Covers |
|---|---|---|---|---|
| AT-01 | Tenant isolation | Dealer A user requests dealer B's vehicle id | 404 | AUTH-07 |
| AT-02 | Shared data within a dealer | A1 creates a vehicle; A2 refreshes the list | A2 sees it | AUTH-06 |
| AT-03 | Admin has no business data | Admin calls the vehicle API | 403, no business fields | AUTH-08 |
| AT-04 | Remove login | Admin removes A2 → A2 requests vehicle list | 403 | AUTH-05 |
| AT-05 | Required fields | Create a vehicle without VIN | 400, VIN field error | DMS-01 |
| AT-06 | VIN unique | Duplicate VIN in the same dealer | `VIN_DUP`; same VIN at another dealer succeeds | DMS-03 |
| AT-07 | Sale pair | Enter only the sold date | `SOLD_PAIR_REQUIRED` | DMS-10 |
| AT-08 | Sold lock | Edit purchase cost of a sold vehicle | `SOLD_LOCKED` | DMS-11 |
| AT-09 | One vehicle, one customer | Customer 1 linked to vehicle X; customer 2 links X | `VEHICLE_ALREADY_LINKED` | CRM-07 |
| AT-10 | Sold link locked | Unlink a sold vehicle | `SOLD_LOCKED` | CRM-08 |
| AT-11 | Audit | Edit a vehicle | History shows user, UPDATE, time | AUD-01 |
| AT-12 | Missing price | CASH ad with no price | BLOCKED `PRICE_MISSING`, AI not called | AD-R07, AD-07 |
| AT-13 | Finance missing APR | FINANCE ad with payment but no APR | BLOCKED `FINANCE_APR_MISSING` | AD-R10 |
| AT-14 | Broadcast exemption | FINANCE + RADIO_TV_BILLBOARD with price/APR present; omit term, place price away from APR; then remove APR | First run: no proximity hint, missing term only REVIEW; second: BLOCKED FINANCE_APR_MISSING | AD-R10–14 |
| AT-15 | Lease 20,000 km boundary | Annual allowance written in ad copy: 20,000 km, no excess-km fee | R25 not required; required at 19,999 | AD-R25 |
| AT-16 | Condition mismatch | DMS is AS_IS; ad says Certified | `CONDITION_MISMATCH` | AD-R08 |
| AT-17 | Real AI pass | Fully compliant ad | PASSED; Ready and TXT export work | AD-08, AD-12 |
| AT-18 | AI unavailable | Check with AI service down | AI_UNAVAILABLE; Ready returns `NOT_PASSED` | AD-09 |
| AT-19 | Stale | Change advertised price in body after a pass | STALE; export returns `CHECK_STALE` | AD-11 |
| AT-20 | TXT content | Export file | Dealer and vehicle public info; no customer or cost | AD-13 |
| AT-21 | Assistant read-only | Ask "mark vehicle X as sold" | Refuses; database unchanged | AI-03 |
| AT-22 | Assistant privacy | Ask for a customer's phone number | No phone returned | AI-04 |
| AT-23 | Gateway | Browser calls the core port directly | Fails | ARC-03 |

Additional focused checks reuse the same demo records and existing screens/APIs; no new feature or test framework is needed.

| ID | Scenario | Steps | Expected | Covers |
|---|---|---|---|---|
| AT-24 | CASH payment triggers finance | Otherwise valid CASH copy includes "$299 per month" and no APR; run Check | BLOCKED FINANCE_APR_MISSING, AI skipped; repeat with APR present to confirm finance soft hints | AD-04, AD-R10–12; complements BE-09 |
| AT-25 | Sale before CRM link | Sell an unlinked same-dealer vehicle; link it to a customer; attempt second link and unlink | First link succeeds; second VEHICLE_ALREADY_LINKED; unlink SOLD_LOCKED | CRM-05–08; BE-05/06 |
| AT-26 | CRM required fields and edit | Try creating with each of the four required fields blank; then create valid customer, edit and reopen | Blank input rejected; valid create/edit persist; history records change without contact values | CRM-01/02/04/11/12; CL-2, BE-11 |
| AT-27 | Soft findings do not veto | Use otherwise hard-valid copy missing year and finance term; real AI returns successfully | PASSED; saved findings are REVIEW and AI notes retained; Ready/export succeed; no AI veto state | AD-03/08/10/12, AD-R05/12 |
| AT-28 | Checklist is display only | Select CASH, FINANCE, LEASE and switch medium | Displayed checklist follows selection; no prior-use/warranty/km answer fields or required ticks | AD-02, UI-40 |

These cases define expected behavior; execution results must be recorded separately. Existing BE/FE/CL references are in design/16-Acceptance-and-Test.md.

Minimum classroom demo set (SCOPE): AT-01, AT-03, AT-12, AT-13, AT-17, AT-19.
