# 08 Design Review Against the Requirements Analysis

Review date: 2026-09-25. Compares `design/` (v6: 00, 12–19, AI-PROTOCOL-AND-RULES, SCOPE-BASELINE) against the source specification and the requirement items in 01–07.

Findings fall into three groups:

- **A. Gaps**: the source asks for something and the design misses or weakens it without a signed ruling.
- **B. Deliberate deviations**: the design departs from the source on purpose. Check that each one is actually signed off.
- **C. Analysis corrections**: places where 01–07 should follow the design because the design ruling is sound.

Most of the design matches the source: roles, tenant isolation (404 vs 403), DMS fields and enums, VIN uniqueness, sale pair, sold lock, one vehicle one customer, audit who/what/when, five check states, Ready + TXT, the Gateway, and the assistant.

---

## A. Gaps

| # | Severity | Source | What the design does | Why it matters | Recommendation |
|---|---|---|---|---|---|
| A1 | **High** | PDF §5: "the salesperson completes a checklist" | No salesperson input. All checks are regex over the ad text (15 §6, PROTOCOL §C). "If applicable" items (previous use, extended warranty offered, lease km allowance) are only detected when the copy already mentions them. | A former taxi advertised with silent copy produces **no flag at all**. This is the case the rule exists for. | Add checklist answers to the `POST /listings/{id}/checks` body (`priorUse: NONE\|POLICE\|TAXI\|RENTAL`, `extendedWarranty: bool`, `leaseKmPerYear: int?`) and store them in the check row. No vehicle columns are needed, so the 15 ban on new columns still holds. A declared prior use or warranty with no disclosure in the copy → hard. |
| A2 | **High** | PDF §5: rules apply "if the ad **shows a rate or payment**" | Finance rules run only when `adKind == FINANCE` (PROTOCOL C.1). | A `CASH` ad saying "$299/month at 5.9%" skips every finance rule and can reach PASSED. | Trigger finance rules when a rate or payment pattern matches, whatever the `adKind` is. Alternatively, make it hard `FINANCE_KIND_MISMATCH` when a CASH ad contains payment language. Add a fixture. |
| A3 | **High** | PDF §4: CRM "Car(s) purchased", linked to DMS | Links are allowed only for `IN_STOCK` vehicles. A sold vehicle cannot be newly linked (`WRONG_DEALER_OR_SOLD`), and `sell` takes no customer (15 §4, 14 §6.1). | If staff record the sale in DMS **before** linking in CRM, that purchase can never be recorded against the buyer. Whether it works depends on the order of the two steps. | Either allow `PUT link` for a SOLD vehicle that has no customer yet (still one vehicle one customer, still no unlink after sale), or add an optional `customerId` to `POST /vehicles/{id}/sell`. |
| A4 | Medium | PDF §5: "flags anything OMVIC requires that is still missing" | A successful AI call always becomes `PASSED` (PROTOCOL B.6 step 6). AI notes and soft findings can never block. 12/13 do not require the UI to show soft findings on a Passed result. | "Passed" can appear while term, down payment, or prior use are still flagged. Users will read Passed as fully compliant. | Require the UI to show the soft findings list and AI notes on Passed, labelled "Passed — review N items". Optionally require an "I reviewed these" tick before Ready. |
| A5 | Medium | PDF §5 (year, condition, dealer name/contact are compared); 17 FX-11 | `contentVersion++` happens only on listing edits and on vehicle `conditionCode` (14 §4.4). Edits to vehicle `modelYear` / `make` / `model` / `vin`, or to the dealer's legal name and contacts (Admin PATCH), do not make a Passed check Stale. | The TXT export and the check can disagree with the current vehicle or dealer facts. | Also bump the version on vehicle public-field edits. At Ready / Export, compare a hash of the check inputs (vehicle public fields + dealer public four) with the current values. |
| A6 | Medium | PDF §3, §4 field lists | 14 lists required fields only. There are no format rules: VIN is `VARCHAR(32)` with no 17-char check, and year range, email / phone format, Carfax URL, `addedOn` not in the future, `soldOn ≥ addedOn`, and `purchaseCost ≥ 0` are all unspecified. | Each implementer will pick different rules, so the front end and back end won't match. | Add a validation table to 14 (see 02 §2 and 03 §2 of this analysis for proposed values). |
| A7 | Low | PDF §8: rules updatable "without a code change" | Rules are `static final Pattern` constants in `OmvicRuleEngine` (PROTOCOL §C). | Not required for the course, but the spec calls it out as a discussion point. | Record it as a known limitation in 00, or move the patterns and thresholds (20,000 km) to `application.yml`. |
| A8 | Low | PDF §8: compliance output is not legal advice | No disclaimer in 12 or 13. The AI prompt only says "never claim legal approval". | Users may treat Passed as legal clearance. | Add a fixed notice on the Ad compliance page and in the TXT footer. |
| A9 | Low | PDF §8: backup strategy | `main.bicep` sets `backupRetentionDays: 7`, but no design doc mentions backup or restore. | It will come up in review questions. | One line in 07 or 08: 7-day PITR, no geo-redundancy, restore procedure. |
| A10 | Low | Acceptance coverage | 16 has no case for required-field validation (missing VIN → 400 with `fieldErrors`). 17 has no fixture for A2 or A1. | Gaps above would pass acceptance. | Add BE-17 (required fields), FX-23 (CASH with payment), FX-24 (declared prior use not disclosed). |

---

## B. Deliberate deviations (check sign-off)

| # | Source says | Design ruling | Where | Signed in SCOPE-BASELINE? |
|---|---|---|---|---|
| B1 | Username / password | Entra only | 15 §8 | ✅ Erratum 1 |
| B2 | "Before published" | Ready + TXT export | 14 §8 | ✅ Erratum 3 |
| B3 | 5 pages | + Assistant page | 10 | ✅ Erratum 2 |
| B4 | Always required: status (new/used), year, extended-warranty terms, previous use; finance: loan term, cost of borrowing; lease: term, payment, upfront amount | **Soft only** (never blocks Ready). Cost of borrowing has no rule at all. New/used is only a contradiction check. | PROTOCOL §C.0a | ❌ **Not in SCOPE-BASELINE.** C.0a says "do not fix without instructor sign-off", but no sign-off is recorded. Add it as erratum 4, or promote the finance term and lease term / payment / upfront amount to hard. |
| B5 | Radio / TV / billboard "exempt from displaying **these** alongside the rate" (these = APR, loan term, cash price) | Only the proximity check is waived; APR is still hard for broadcast FINANCE | 15 §6, FX-14 | ❌ An interpretation choice. The wording can also mean all three disclosures are waived. Confirm with the instructor. |
| B6 | Car source "etc." | Fixed four values incl. `OTHER` | 00 | Implicit; acceptable |
| B7 | Admin "view credentials" | Members list shows Entra oid + display name; no email column | 14 §3.5 | Implicit; acceptable |

---

## C. Corrections to this analysis (follow the design)

| Analysis item | Change to match design |
|---|---|
| 04 §3 severity column | R04, R05, R06, R12, R13, R21, R22, R24 are soft in the current design (see B4). Mark them "Block (spec) / Soft (design, pending B4)". |
| 04 §4 flow, "AI finds issue → BLOCKED / NEEDS_AI" | Wrong for the current design: AI success → PASSED with notes; AI failure → AI_UNAVAILABLE. AI cannot block (see A4). |
| 04 §2 checklist inputs, AD-02 | Not in the design. Keep as the proposal in A1. |
| 04 AD-R02 | Design splits contact: all three missing → hard `DEALER_CONTACT_MISSING`; one or two present → soft `DEALER_CONTACT_INCOMPLETE`. |
| 04 AD-R11 "Finance triggered by kind or content" (07 Q-11) | Design uses kind only (see A2). |
| 02 DMS-15 Stale triggers | Design: condition only (see A5). |
| 01 AUTH-14 | Design is stricter: one person may hold **one active dealer at a time** across all dealers, not just "not twice in the same dealer" (15 §2.2). |
| 01 §7 "last login removed" | Matches design: unbind is soft (`active=0`), rebinding reactivates the same row. |
| 05 AUD-08 admin audit | Design writes `DEALER` / `MEMBERSHIP` audit, but staff cannot query it (14 §9). Upgrade from Could to done. |
| 06 UI-03 wording | Design: unbound users get a `/` no-access shell with Sign out only. |
| 03 CRM-13 duplicate-email warning | Not in design; stays Could. |

---

## D. Suggested next steps

1. Get instructor sign-off on **B4** and **B5**, then add them to SCOPE-BASELINE errata.
2. Decide **A1–A3** (the three High items). Each touches 14 (contract), PROTOCOL §C (rules), 17 (fixtures), and 16 (acceptance).
3. Add the validation table (A6) and the disclaimer (A8). These are small and don't change scope.
4. After the rulings, update 04 and 07 of this analysis so the two stay in sync.
