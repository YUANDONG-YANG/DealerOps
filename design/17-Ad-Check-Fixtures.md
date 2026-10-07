# 17 · Ad-compliance check samples / AI evaluation fixtures

Version: current (v6) · 2026-09-21  
**Current.** Fixed rules and reason codes follow the [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) section 6 pseudocode. Check HTTP, five states, Blocked=200, and `AI_UNAVAILABLE`=502 follow [14-Backend-API-Contract.md](14-Backend-API-Contract.md) section 8.  
This document **only** provides runnable ad-text fixtures and expected states. It is not a rule implementation, not OpenAPI, and not an OMVIC certification. System output may only be "rule hits + review advice"; **do not** write OMVIC approved / certified in the UI or reports.

Retired `05` is not a current requirement. This document only borrows its "repeatable English samples + expected rules" intent and rewrites it for v6 `CASH` / `FINANCE` / `LEASE` and `ONLINE` / `RADIO_TV_BILLBOARD`. Finance/lease checks are **In Scope** (align 00 / 15); do not follow the reference draft that said finance cannot be done.

Out of scope: Service Bus, async ad review, queue polling, external ad sites, claiming legal certification. A check is a staff-synchronous `POST /api/v1/listings/{id}/checks` (rules before AI, AI ≤15s).

---

## 1. Shared dealership and vehicle premises

Unless a fixture says otherwise, always use this dealership's **public four fields** (same as the 14 examples). Fixed rules do a case-insensitive contains on the dealership name; contact must match phone digits / email / address text.

| Field | Value |
|---|---|
| `legalName` | Prairie Auto Ltd. |
| `contactPhone` | 403-555-0100 |
| `contactEmail` | desk@prairie.example |
| `contactAddress` | 100 1 Ave SW, Calgary |

Vehicles (no purchase cost enters the check; asking price is taken from the ad body only, **not** `purchaseCost`):

| Code | year / make / model | VIN (sample) | `conditionCode` | `source` |
|---|---|---|---|---|
| V-ASIS | 2020 Toyota Camry | 1HGCM82633A004352 | `AS_IS` | `AUCTION` |
| V-CERT | 2022 Honda Civic | 2HGFC2F59NH000001 | `CERTIFIED` | `TRADE_IN` |
| V-UNFIT | 2016 Ford F-150 | 1FTFW1E50GFA00001 | `UNFIT` | `OTHER` |
| V-IRREP | 2018 Chevrolet Cruze | 1G1BE5SM8J7100001 | `IRREPARABLE` | `AUCTION` |

Amount/rate writing follows 15: `$`, `CAD`, and `C$` are allowed; APR must look like `6.99% APR` or `APR 6.99%` / `APR: 6.99%`.

---

## 2. How to run and how to record results

1. Create the matching vehicle in this dealership's DMS → `PATCH` listing (`title`/`body`/`adKind`/`medium`) → `POST .../checks` (with current `version`).
2. **Hard miss** (`hard[]` not empty): HTTP **200**, `recommendation=BLOCKED`, `aiStatus=SKIPPED`, **do not** call AI. `checkStatus=BLOCKED`. Ready / Export → **409** `NOT_PASSED`.
3. **Hard miss empty:** fixed rules return `NEEDS_AI`; core calls Gateway `POST /internal/v1/ad-check`. Success and the model reports no further hard miss → **200** `PASSED` / `SUCCESS`. Timeout or failure → HTTP **502** `AI_UNAVAILABLE`; check row **already written** `recommendation=UNAVAILABLE`; listing already points to it; GET listing `checkStatus=AI_UNAVAILABLE`; **UI must not treat as Pass**; Ready / Export → **409** `NOT_PASSED`.
4. Only `PASSED` and `check.contentVersion == listing.contentVersion` may Ready, then export **TXT** (dealership public four fields + vehicle public fields + title/body + check time; no customer, no cost).
5. **Stale** is only for "previously PASSED, then version incremented". After Blocked, editing copy and reopening the page is `NEEDS_AI`, not Stale.
6. Labels are all **team-authored**. Self-built fixture scores only describe this sample set; they do not pre-commit accuracy and do not treat the GitHub `ai-manager` repo itself as acceptance proof.

`ruleFindings` HTTP shape is in 14 (`ruleId` / `severity` / `passed` / `message`). The **reason codes** in the tables below use 15 pseudocode identifiers (for example `PRICE_MISSING`); mapping them to `ruleId` must not change semantics. `severity`: hard miss=`BLOCK`, soft=`REVIEW`.

---

## 3. Samples

Each item: `id`, `offerType` (= `adKind`), `channel` (= `medium`), `title`, `body`, vehicle/dealership premises, fixed-rule expectation, expectation if AI is entered, Ready/export, classroom demo.

### FX-01 · Missing price (CASH / ONLINE)

| | |
|---|---|
| **id** | `FX-01` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2020 Toyota Camry — great daily driver |
| **body** | Sold as-is by Prairie Auto Ltd. Call 403-555-0100, email desk@prairie.example, visit 100 1 Ave SW, Calgary. Clean title story, come see it this weekend. |
| **Vehicle/dealership premises** | V-ASIS. Body has **no** `$` / `CAD` / `dollars` price. Dealership name present. Full contact present. `as-is` present. No APR (CASH does not require it). |
| **Fixed rules** | **Blocked** · `PRICE_MISSING` · `aiStatus=SKIPPED` · HTTP 200 |
| **If AI is entered** | do not call AI |
| **Ready/export** | No |
| **Classroom demo** | **Yes** (acceptance: missing price is blocked) |

### FX-02 · Missing dealership name (CASH / ONLINE)

| | |
|---|---|
| **id** | `FX-02` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2020 Toyota Camry cash deal |
| **body** | Cash price $18,900 CAD. Sold as-is. Call 403-555-0100, email desk@prairie.example, visit 100 1 Ave SW, Calgary. |
| **Vehicle/dealership premises** | V-ASIS. Price present. Body **does not** contain `Prairie Auto Ltd.` ("the dealership" does not count). Full contact present. `as-is` present. |
| **Fixed rules** | **Blocked** · `DEALER_NAME_MISSING` · do not call AI · HTTP 200 |
| **If AI is entered** | do not call AI |
| **Ready/export** | No |
| **Classroom demo** | No (automated regression is enough) |

### FX-03 · FINANCE missing APR (ONLINE)

| | |
|---|---|
| **id** | `FX-03` |
| **offerType** | `FINANCE` |
| **channel** | `ONLINE` |
| **title** | Finance this 2020 Toyota Camry |
| **body** | Cash price $18,900. 60 month term available. Sold as-is by Prairie Auto Ltd. 403-555-0100 · desk@prairie.example · 100 1 Ave SW, Calgary. |
| **Vehicle/dealership premises** | V-ASIS. Price, dealership name, contact, `as-is`, and term present. Body has **no** APR regex (do not write `% APR` / `APR 6.99%`). |
| **Fixed rules** | **Blocked** · `FINANCE_APR_MISSING` · do not call AI · HTTP 200. May also have soft `FINANCE_APR_PROXIMITY` (ONLINE), which does not change the hard block. |
| **If AI is entered** | do not call AI |
| **Ready/export** | No |
| **Classroom demo** | **Yes** (acceptance: finance missing APR is blocked) |

### FX-04 · LEASE missing APR (ONLINE)

| | |
|---|---|
| **id** | `FX-04` |
| **offerType** | `LEASE` |
| **channel** | `ONLINE` |
| **title** | Lease a 2020 Toyota Camry |
| **body** | Lease this Camry. $399 per month, 36 months, $2,000 down payment, 20,000 km per year. Sold as-is by Prairie Auto Ltd. 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. Cash price $18,900. |
| **Vehicle/dealership premises** | V-ASIS. Lease statement, rent, term, down payment, allowance, price, dealership name, contact, `as-is` present. **No** APR. |
| **Fixed rules** | **Blocked** · `LEASE_APR_MISSING` · do not call AI · HTTP 200 |
| **If AI is entered** | do not call AI |
| **Ready/export** | No |
| **Classroom demo** | No |

### FX-05 · AS_IS not disclosed

| | |
|---|---|
| **id** | `FX-05` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2020 Toyota Camry — $18,900 |
| **body** | Cash price $18,900. Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. Ready for a test drive. |
| **Vehicle/dealership premises** | V-ASIS. Price and dealership/contact present. Body has **no** `as-is` / `as is`. |
| **Fixed rules** | **Blocked** · `CONDITION_UNDISCLOSED` · do not call AI · HTTP 200 |
| **If AI is entered** | do not call AI |
| **Ready/export** | No |
| **Classroom demo** | No |

### FX-06 · UNFIT not disclosed

| | |
|---|---|
| **id** | `FX-06` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2016 Ford F-150 work truck $9,500 |
| **body** | Cash price $9,500. Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. Strong frame, sold as a project. |
| **Vehicle/dealership premises** | V-UNFIT. Price and dealership/contact present. Body has **no** `unfit` / `not roadworthy` / `not fit`. "project" is not disclosure. |
| **Fixed rules** | **Blocked** · `CONDITION_UNDISCLOSED` · do not call AI · HTTP 200 |
| **If AI is entered** | do not call AI |
| **Ready/export** | No |
| **Classroom demo** | No |

### FX-07 · IRREPARABLE not disclosed

| | |
|---|---|
| **id** | `FX-07` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2018 Chevrolet Cruze $3,200 parts special |
| **body** | Cash price $3,200. Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. Great for parts or a rebuild. |
| **Vehicle/dealership premises** | V-IRREP. Price and dealership/contact present. Body has **no** `irreparable` / `salvage` / `write-off` / `write off`. |
| **Fixed rules** | **Blocked** · `CONDITION_UNDISCLOSED` · do not call AI · HTTP 200 |
| **If AI is entered** | do not call AI |
| **Ready/export** | No |
| **Classroom demo** | No |

### FX-08 · Ad claims CERTIFIED, actual vehicle is AS_IS

| | |
|---|---|
| **id** | `FX-08` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | Certified 2020 Toyota Camry $18,900 |
| **body** | Factory certified / CPO Camry. Cash price $18,900. Sold as-is by Prairie Auto Ltd. 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **Vehicle/dealership premises** | V-ASIS (`conditionCode=AS_IS`). Body has both `certified`/`cpo` and `as-is`. Rule: claiming certified when the actual vehicle is not CERTIFIED → hard block. |
| **Fixed rules** | **Blocked** · `CONDITION_MISMATCH` (ad claims better than the actual vehicle) · do not call AI · HTTP 200 |
| **If AI is entered** | do not call AI |
| **Ready/export** | No |
| **Classroom demo** | No |

### FX-09 · LEASE annual allowance below 20000 km with no excess-km fee

| | |
|---|---|
| **id** | `FX-09` |
| **offerType** | `LEASE` |
| **channel** | `ONLINE` |
| **title** | Lease 2020 Toyota Camry 15,000 km |
| **body** | Lease this 2020 Toyota Camry. $399 per month, 36 months, $2,000 down payment, 6.99% APR, 15000 km per year. Sold as-is by Prairie Auto Ltd. 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. Cash price $18,900. |
| **Vehicle/dealership premises** | V-ASIS. APR, lease, term, rent, down payment, price, dealership/contact, `as-is` present. Allowance **15000 km/year**; body has **no** `excess` / `overage` / additional km. |
| **Fixed rules** | **Blocked** · `LEASE_EXCESS_KM_MISSING` · do not call AI · HTTP 200 |
| **If AI is entered** | do not call AI |
| **Ready/export** | No |
| **Classroom demo** | No |

### FX-10 · Clean CASH (can Pass then export TXT)

| | |
|---|---|
| **id** | `FX-10` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2020 Toyota Camry — cash $18,900 |
| **body** | 2020 Toyota Camry, VIN 1HGCM82633A004352. Cash price $18,900 CAD. Sold as-is. HST and licensing extra. Sold by Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. In-stock now. |
| **Vehicle/dealership premises** | V-ASIS. Price, dealership name, phone+email+address, year, `as-is` present. No finance/lease wording. No "certified". |
| **Fixed rules** | **Needs AI** (`hard[]` empty; `soft[]` usually empty, year already in copy) · will call AI |
| **If AI is entered** | expect **Pass** (`PASSED` / `SUCCESS` / HTTP 200). `aiNotes` may be empty or non-hard-miss notes only. **Not** an OMVIC certification. |
| **Ready/export** | **Yes** (Ready after Passed and not Stale, then export TXT) |
| **Classroom demo** | **Yes** (acceptance: real ad copy through real AI once; export after pass) |

### FX-11 · After a price change the old check becomes Stale (prerequisite steps, no independent body)

| | |
|---|---|
| **id** | `FX-11` |
| **offerType** | (reuse FX-10 `CASH`) |
| **channel** | (reuse FX-10 `ONLINE`) |
| **title** / **body** | **Not** a new ad. Change the price on the **same listing after FX-10 PASSED**. |
| **Vehicle/dealership premises** | still V-ASIS. |
| **Prerequisite steps** | 1) Run FX-10 and get `PASSED` (Ready first is optional). 2) `PATCH` listing: change the body price to `$17,900` (or any different asking price), `contentVersion++`, `status` returns to `DRAFT`. **Do not** clear `lastCheckId`. 3) GET listing: `lastCheck.recommendation` was still PASSED, but versions no longer match → **`checkStatus=STALE`**. 4) Ready / Export without rechecking → **409** `CHECK_STALE`. Changing vehicle `conditionCode` also increments listing version with the same effect; **changing purchase cost alone does not void**. |
| **Fixed rules** | this step **does not run** a check. Expect page five-state **Stale**. After a new `POST .../checks`, re-judge against the new body (no longer Stale). |
| **If AI is entered** | the voiding step does not call AI. Recheck follows §2 against the new body. |
| **Ready/export** | **No** (until recheck and pass) |
| **Classroom demo** | **Yes** (acceptance: after a price change the old check cannot export) |

### FX-12 · AI unavailable (rules already passed)

| | |
|---|---|
| **id** | `FX-12` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | (same as FX-10) |
| **body** | (same as FX-10) |
| **Vehicle/dealership premises** | same as FX-10. At runtime force AI timeout / broken Key / stub failure (adapter ≤15s). **Do not** impersonate this fixture with a hard-miss ad. |
| **Fixed rules** | **Needs AI** (same as FX-10, `hard[]` empty) · will call AI |
| **If AI is entered** | call fails. HTTP **502** `AI_UNAVAILABLE`. `compliance_check` **already persisted**: `recommendation=UNAVAILABLE`, `aiStatus=UNAVAILABLE` (or `FAILED` then normalized to unavailable). listing.`lastCheckId` already points at that row. GET: `checkStatus=AI_UNAVAILABLE`. **UI must not treat as Pass**. |
| **Ready/export** | No (409 `NOT_PASSED`) |
| **Classroom demo** | **Yes** (contrast with the real-AI success path; failure must not show passed) |

### FX-13 · Clean CASH · RADIO_TV_BILLBOARD

| | |
|---|---|
| **id** | `FX-13` |
| **offerType** | `CASH` |
| **channel** | `RADIO_TV_BILLBOARD` |
| **title** | 2020 Camry eighteen nine at Prairie Auto |
| **body** | On air: 2020 Toyota Camry, cash price $18,900. Sold as-is at Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **Vehicle/dealership premises** | V-ASIS. Medium is radio/outdoor; CASH has no APR-proximity rule. Price, dealership name, three contacts, `as-is`, year present. |
| **Fixed rules** | **Needs AI** · call AI. No `FINANCE_APR_PROXIMITY`. |
| **If AI is entered** | expect **Pass** |
| **Ready/export** | Yes (after Pass and not Stale) |
| **Classroom demo** | No (guarantee at least 1 RADIO channel fixture; class prefers FX-10) |

### FX-14 · FINANCE with APR · RADIO_TV_BILLBOARD (proximity waived)

| | |
|---|---|
| **id** | `FX-14` |
| **offerType** | `FINANCE` |
| **channel** | `RADIO_TV_BILLBOARD` |
| **title** | Finance the 2020 Camry — 6.99 percent APR |
| **body** | 2020 Toyota Camry. Cash price $18,900. Finance at 6.99% APR, 60 months. Sold as-is by Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **Vehicle/dealership premises** | V-ASIS. APR regex, term, cash price, dealership/contact, `as-is` present. `medium=RADIO_TV_BILLBOARD` → **do not add** `FINANCE_APR_PROXIMITY`. |
| **Fixed rules** | **Needs AI** (`soft[]` may be empty or unrelated items only) · call AI |
| **If AI is entered** | expect **Pass** (radio waives "interest rate shown next to APR") |
| **Ready/export** | Yes (after Pass) |
| **Classroom demo** | No |

### FX-15 · FINANCE with APR · ONLINE (proximity handed to AI)

| | |
|---|---|
| **id** | `FX-15` |
| **offerType** | `FINANCE` |
| **channel** | `ONLINE` |
| **title** | 2020 Toyota Camry 6.99% APR finance |
| **body** | 2020 Toyota Camry. Cash price $18,900. 6.99% APR, 60 month term. Sold as-is by Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **Vehicle/dealership premises** | V-ASIS. APR, term, cash price, dealership/contact, `as-is` present. ONLINE → soft `FINANCE_APR_PROXIMITY` (layout cannot be reliably regexed). |
| **Fixed rules** | **Needs AI** · `FINANCE_APR_PROXIMITY` (REVIEW) · call AI · **not** Blocked |
| **If AI is entered** | this fixture writes rate and APR in the same sentence; expect **Pass**. If the model only comments on layout and reports no hard miss, still Pass. |
| **Ready/export** | Yes (after Pass) |
| **Classroom demo** | No |

### FX-16 · Complete LEASE (ONLINE)

| | |
|---|---|
| **id** | `FX-16` |
| **offerType** | `LEASE` |
| **channel** | `ONLINE` |
| **title** | Lease 2020 Toyota Camry 6.99% APR |
| **body** | Lease this 2020 Toyota Camry. Cash price $18,900. $399 per month, 36 months, $2,000 down payment, 6.99% APR, 20,000 km per year. Sold as-is by Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **Vehicle/dealership premises** | V-ASIS. Lease statement, APR, term, rent, down payment, ≥20000 km/year, price, dealership/contact, `as-is` present. Allowance meets the threshold; **do not add** `LEASE_EXCESS_KM_MISSING`. |
| **Fixed rules** | **Needs AI** · call AI |
| **If AI is entered** | expect **Pass** |
| **Ready/export** | Yes (after Pass) |
| **Classroom demo** | No |

### FX-17 · CERTIFIED disclosed (CASH / ONLINE)

| | |
|---|---|
| **id** | `FX-17` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2022 Honda Civic certified $22,400 |
| **body** | 2022 Honda Civic, dealer certified. Cash price $22,400. Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **Vehicle/dealership premises** | V-CERT. Body has `certified`, matching `conditionCode=CERTIFIED`. Price and full dealership/contact present. |
| **Fixed rules** | **Needs AI** · no `CONDITION_MISMATCH` / no `CERTIFIED_NOT_IN_COPY` · call AI |
| **If AI is entered** | expect **Pass** |
| **Ready/export** | Yes (after Pass) |
| **Classroom demo** | No |

### FX-18 · CERTIFIED without the keyword (paraphrase → AI)

| | |
|---|---|
| **id** | `FX-18` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2022 Honda Civic cash $22,400 |
| **body** | 2022 Honda Civic. Inspected and backed by our in-house quality program. Cash price $22,400. Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **Vehicle/dealership premises** | V-CERT. Body has **no** `certified` / `cpo` / `certifi`. Price and dealership/contact present. |
| **Fixed rules** | **Needs AI** · soft `CERTIFIED_NOT_IN_COPY` · **not** a hard block · call AI |
| **If AI is entered** | paraphrase is allowed. This fixture expects **Pass**; `aiNotes` may note "condition is CERTIFIED, copy did not use certified". Do not auto-Blocked because of a soft hit. |
| **Ready/export** | Yes (if AI Pass); if the classroom model insists on the missing word, record FN/team label; still must not be a rule hard block |
| **Classroom demo** | No |

### FX-19 · UNFIT disclosed

| | |
|---|---|
| **id** | `FX-19` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2016 Ford F-150 unfit $9,500 |
| **body** | 2016 Ford F-150. This vehicle is unfit / not roadworthy. Cash price $9,500. Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **Vehicle/dealership premises** | V-UNFIT. Body has `unfit` or `not roadworthy`. Price and dealership/contact present. |
| **Fixed rules** | **Needs AI** · disclosed so no `CONDITION_UNDISCLOSED` · call AI |
| **If AI is entered** | expect **Pass** (disclosure complete; model may note unfit/not-roadworthy risk, but Pass if no new hard miss) |
| **Ready/export** | Yes (after Pass) |
| **Classroom demo** | No |

### FX-20 · IRREPARABLE disclosed

| | |
|---|---|
| **id** | `FX-20` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2018 Cruze irreparable salvage $3,200 |
| **body** | 2018 Chevrolet Cruze. Irreparable salvage / write-off. Cash price $3,200. Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. For parts only. |
| **Vehicle/dealership premises** | V-IRREP. Body has `irreparable` or `salvage` or `write-off`. Price and dealership/contact present. |
| **Fixed rules** | **Needs AI** · disclosed · call AI |
| **If AI is entered** | expect **Pass** |
| **Ready/export** | Yes (after Pass) |
| **Classroom demo** | No |

### FX-21 · Only one contact shown (soft, not a hard block)

| | |
|---|---|
| **id** | `FX-21` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2020 Toyota Camry $18,900 as-is |
| **body** | 2020 Toyota Camry. Cash price $18,900. Sold as-is by Prairie Auto Ltd. Call 403-555-0100. |
| **Vehicle/dealership premises** | V-ASIS. Dealership name, price, `as-is`, year present. Phone only; **no** email or address. |
| **Fixed rules** | **Needs AI** · soft `DEALER_CONTACT_INCOMPLETE` · **not** `DEALER_CONTACT_MISSING` (hard block only when there is no contact at all) · call AI |
| **If AI is entered** | expect **Pass** (`PASSED` / `SUCCESS` / HTTP 200) with the soft `DEALER_CONTACT_INCOMPLETE` finding retained. AI notes do not veto Ready (requirements/analysis/04-Ad-Compliance.md §4 item 3, AT-27); evaluation note: the model should produce a locatable remark about the missing email/address. If it does not, record it as a review miss; UI still must not be hand-edited into certification copy. |
| **Ready/export** | Yes (after Pass; the REVIEW hint does not block) |
| **Classroom demo** | No |

### FX-22 · LEASE with no lease statement

| | |
|---|---|
| **id** | `FX-22` |
| **offerType** | `LEASE` |
| **channel** | `ONLINE` |
| **title** | 2020 Camry 6.99% APR $399/mo |
| **body** | 2020 Toyota Camry. $399 per month, 36 months, $2,000 down payment, 6.99% APR, 20,000 km per year. Cash price $18,900. Sold as-is by Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **Vehicle/dealership premises** | V-ASIS. `adKind=LEASE`, body has **no** `lease` / `leasing` / `lessee`. APR and remaining lease numbers present. |
| **Fixed rules** | **Blocked** · `LEASE_STATEMENT_MISSING` · do not call AI · HTTP 200 |
| **If AI is entered** | do not call AI |
| **Ready/export** | No |
| **Classroom demo** | No |

---

## 4. Coverage check

| Requirement | Fixtures |
|---|---|
| Missing price → Blocked, no AI | FX-01 |
| Missing dealership name → Blocked, no AI | FX-02 |
| FINANCE missing APR → Blocked, no AI | FX-03 |
| LEASE missing APR → Blocked, no AI | FX-04 |
| CERTIFIED / AS_IS / UNFIT / IRREPARABLE undisclosed or misstated | FX-05, FX-06, FX-07, FX-08, FX-18 |
| Same conditions disclosed | FX-10 (AS_IS), FX-17 (CERTIFIED), FX-19, FX-20 |
| After price change old check Stale | FX-11 (steps, not an independent body) |
| Clean CASH → Pass → export TXT | FX-10 |
| AI unavailable: 502 + persisted, UI must not treat as Pass | FX-12 |
| `RADIO_TV_BILLBOARD` | FX-13, FX-14 |
| `ONLINE` | most of the rest |
| `CASH` / `FINANCE` / `LEASE` | all three kinds present |

Suggested classroom order: FX-01 → FX-03 → FX-10 (real AI) → export TXT → FX-11 price change cannot export → (optional) FX-12 cut AI.

---

## 5. Explicitly out of scope

- Do not treat this file as an "OMVIC approved" checklist.
- Do not invent Service Bus / async ad review / a second database.
- Do not require the implementation group to add columns for APR, extended warranty, or prior use; APR is found in the body only.
- Empty draft (title/body both empty) follows 15: hard-block `PRICE_MISSING` + `DEALER_NAME_MISSING` + `CONDITION_UNDISCLOSED`; no standalone ad body.
- Assistant Q&A is not in this fixture set.
