# 10 Review of Cursor's Changes

Review date: 2026-09-25. Scope: the uncommitted working tree after commit `d7b7872`. 79 modified files plus about 25 new files (+2,593 / −606 lines) across `dealer-core`, `ai-service`, `dealer-web`, `design/`, and `requirements/`.

Method: read Cursor's own record (`ANALYSIS-LOG.md` "Code verification and fixes", 08 "Resolution"), then checked each claim against the code. No tests were run and no code was changed by this review.

## Summary

| # | Severity | Finding |
|---|---|---|
| R1 | **Critical** | A3 is recorded as resolved, but `CustomerService.link()` still rejects sold vehicles |
| R2 | **High** | Rule severity contradicts itself: the code and SCOPE erratum 4 say REVIEW; PROTOCOL §C.0a and fixtures doc 17 say BLOCK |
| R3 | **High** | Any AI note now turns a check into BLOCKED; this makes the "review only" items block Ready through the AI |
| R4 | **High** | The change goes far beyond the minimum-spec triage (A1, A4–A7 implemented while recorded as "deferred") |
| R5 | Medium | The new checklist migration adds prior-use / warranty columns, which design 15 still forbids |
| R6 | Medium | Two AI-to-recommendation mappers with different rules; one is unused |
| R7 | Low | Unit test names say "IsHardBlock" but assert `hardBlocked()` is false |
| R8 | Low | Two migrations both widen `customer.email` to 254 |

---

## R1 · A3 not actually fixed (Critical)

| | |
|---|---|
| Cursor's claim | `ANALYSIS-LOG.md`: "A3 Confirmed, resolved. Link allows a this-store sold vehicle with no customer." |
| Code | `dealer-core/src/main/java/com/dealerops/core/customer/CustomerService.java:152–154` still has `if (vehicle.getStatus() != VehicleStatus.IN_STOCK) throw WRONG_DEALER_OR_SOLD`. |
| Everything else was changed | `CustomerVehicleRepository.findLinkable` (line 23 onward) no longer filters by status, so the CRM picker **shows** sold vehicles. `CustomerVehicleLinkIT.soldUnlinkedVehicleCanBeLinkedThenDuplicateConflicts` expects 200. Design 14 / 15 / 16 and analysis 03 say sold links are allowed. |
| Effect | A user picks a sold vehicle in the picker → `400 WRONG_DEALER_OR_SOLD`. The updated integration test will fail. |
| Fix for the developer | Delete the three lines at `CustomerService.java:152–154`. |

## R2 · Severity contradiction (High)

| Source | Says |
|---|---|
| `dealer-core/src/main/resources/compliance/omvic-rules.json` (what actually runs) | `YEAR_NOT_IN_COPY`, `DEALER_CONTACT_INCOMPLETE`, `CERTIFIED_NOT_IN_COPY`, `FINANCE_TERM_MISSING`, `FINANCE_COST_OF_BORROWING_MISSING`, `LEASE_TERM/RENT/DOWN_MISSING`, `PRIOR_USE_*`, `WARRANTY_*` = `REVIEW` |
| `design/SCOPE-BASELINE.md` erratum 4 (new) | Same items stay `REVIEW` |
| `OmvicRuleEngineTest` | Asserts `hardBlocked()` is **false** for those items |
| `design/AI-PROTOCOL-AND-RULES.md` §C.0a (rewritten) | Lists model year, incomplete contact, certified omitted, finance term, cost of borrowing, lease term / payment / upfront, and ticked prior use / warranty as **hard `BLOCK`** |
| `design/17-Ad-Check-Fixtures.md` (rewritten) | FX-18 now expects `BLOCKED CONDITION_UNDISCLOSED`; FX-21 now "hard block"; §2 lists the same items as hard misses |

Effect: the code and SCOPE agree, the two coding references do not. A classroom run of FX-18 / FX-21 will not match doc 17. The next AI coding pass that follows PROTOCOL will flip the JSON back to BLOCK.

Fix for the developer: restore §C.0a and doc 17 to the REVIEW wording, so they match the JSON and erratum 4.

## R3 · AI notes now block (High)

| | |
|---|---|
| Change | `ComplianceCheckService.recommendationFromOutcome` (line 143): any non-blank AI note other than the exact clean-pass sentence → `BLOCKED`. PROTOCOL B.6 step 6 was rewritten to match. |
| Before | AI success → `PASSED`; notes were shown only. |
| Conflict | The AI prompt (`SystemPrompts`) asks the model to report "unclear prior-use hints, incomplete warranty boasts, finance/lease wording". Those are the items erratum 4 says must **not** block. A note from the model on them now blocks Ready anyway. |
| Demo risk | The classroom "real AI passes a clean ad" demo (FX-10, Review 2) now depends on the model returning exactly `{"ok":true,"issues":[]}` or the exact sentence. Any extra remark → BLOCKED. |
| Note | This implements A4, which the triage marked "not planned". |

Fix for the developer: either revert to "AI success → PASSED, notes shown" (minimum spec), or block only on notes with `severity: "BLOCK"` (see R6: `AiRecommendationMapper` already does that but is unused).

## R4 · Scope far beyond the minimum (High)

The triage (08, "Minimum-spec triage") said to do A2, A3, B4 only. Cursor's log says "Not expanded on purpose: A1, A4–A10". The working tree contains:

| Item | Implemented in | Log says |
|---|---|---|
| A1 checklist | `V20260925_1__add_listing_checklist.sql`, `AdChecklist.java`, `AdChecklistForm.vue`, `adChecklist.ts`, `ListingEntity` +59 lines | "No further checklist work" |
| A4 AI notes block | `ComplianceCheckService`, `AiRecommendationMapper`, ai-service JSON reply format | "deferred" |
| A5 wider stale triggers | `VehicleService.patch` | "deferred" |
| A6 field validation | `VehicleRules`, `VehicleValidationException`, `customer/validation/*`, `CustomerContacts`, migrations 2 and 3 | "deferred" |
| A7 rules config | `OmvicRuleCatalog`, `omvic-rules.json` | "deferred" |
| Unrequested | Assistant `DealerCounts`, audit query changes, Admin view changes, `DmsView.vue` +329 lines, `CrmView.vue` +239 lines, export now also requires `status=READY` | not mentioned |

Effect: a large untested diff (unit tests only; ITs not run per the log) sitting on top of a working build, and a log that doesn't describe it. This conflicts with the project rule "meet the spec at its minimum".

Recommendation: keep only A2 (`OmvicRuleEngine` finance trigger), A3 (after fixing R1), and B4 (erratum 4). Revert the rest, or split it into separate commits so each can be judged.

## R5 · Columns the design forbids (Medium)

`V20260925_1__add_listing_checklist.sql` adds `prior_use_*`, `extended_warranty_offered`, and `annual_km_allowance` to `listing`. `design/15-Data-Auth-and-Gateway.md:220` still says "**Do not** add columns for APR / extended warranty / prior use". Cursor removed the matching ban from PROTOCOL §C.0a but not from 15. Migration naming (`V20260925_n`) also differs from the `V2__*` convention in 15.

## R6 · Two mappers (Medium)

`compliance/AiRecommendationMapper.java` (BLOCK-severity note → BLOCKED, otherwise NEEDS_AI) is referenced nowhere. The live path is `ComplianceCheckService.recommendationFromOutcome` (any note → BLOCKED). Keep one.

## R7 · Misleading test names (Low)

`OmvicRuleEngineTest`: `missingModelYearIsHardBlock` (line 77), `missingFinanceTermIsHardBlock` (86), `missingCashPriceOrCostOfBorrowingIsHardBlock` (96), `missingLeaseTermAndUpfrontAmountAreHardBlocks` (162) all assert `hardBlocked()` is **false**. The names describe the PROTOCOL wording (R2), the assertions describe the JSON.

## R8 · Duplicate migration (Low)

`V20260925_2__widen_customer_email.sql` and `V20260925_3__crm_field_rules.sql` both run `MODIFY email VARCHAR(254) NOT NULL`. Harmless, but one is redundant.

---

## Verified OK

| Item | Evidence |
|---|---|
| A2 finance trigger | `OmvicRuleEngine.java:154–159`: finance rules run for `FINANCE`, or for a non-lease ad whose copy shows an APR, interest rate, or payment. Matches spec §5. |
| B4 erratum | `design/SCOPE-BASELINE.md` erratum 4 present and matches the JSON. |
| Rule ids vs catalog | Every rule id emitted by `OmvicRuleEngine` has an entry in `omvic-rules.json`, so none silently falls back to BLOCK. |
| A8 disclaimer | Present in `AdWorkspace.vue`. |

## For the developer, smallest path to a clean state

1. Fix R1 (delete 3 lines).
2. Fix R2 (restore §C.0a / doc 17 wording to REVIEW).
3. Decide R3: revert to "AI success → PASSED" (minimum) or use the severity-aware mapper.
4. Decide R4: keep A2 + A3 + B4; revert or separate the rest.
5. Then run the ITs once (`CustomerVehicleLinkIT`, `BlockedSkipsAiIT`) before committing.

---

## Follow-up (2026-09-25): result of the instructions in 11

| Check | Result |
|---|---|
| Backup branch | `backup/cursor-wip-2026-09-25` exists (110 files, +5,198 / −596 vs its parent). Nothing was lost. |
| Fix commit | `128c86b`. 12 files, +38 / −21. The code and design diff is **identical** to `a4a040d` without the log change. |
| A2 | Finance rules run for CASH ads that show an APR or a payment. |
| A3 | `CustomerService.link()` has no `IN_STOCK` / `WRONG_DEALER_OR_SOLD` check. `unlink()` still returns `SOLD_LOCKED` (line 150). `CrmView.vue:139` lists vehicles with no status filter. **R1 is fixed.** |
| B4 | Erratum 4 is in SCOPE-BASELINE. |
| R2–R8 | Gone from `main`. They exist only on the backup branch. |
| Working tree | Clean except an untracked `.vercel/` (Vercel CLI link folder). |
| Not verified | Step 5 compile: no output was pasted, so not confirmed. Tests not run, by instruction. |
| Outside this task | `4928618` (ignore MCP configs) and `1c371aa` (Railway deploy workflow) landed between the instructions and the fix. They don't touch requirements scope. |

Verdict: **accepted.** A2, A3, and B4 are closed.
