# 09 Verification Checklist

Every finding from [08-Design-Review.md](08-Design-Review.md), with the exact evidence to open and what to look for. Paths are relative to the repo root. Line numbers are as of commit `2cecbe4`.

Fill in the **Verdict** column: `Confirmed` / `Rejected` / `Partly` + a note.

## How to use

1. Open the evidence location.
2. Check the **Claim** against the text there and against the spec PDF section.
3. Fill in the verdict. If rejected, write which document or line proves otherwise.

---

## A. Gaps

| ID | Claim | Spec | Evidence | What to look for | Verdict |
|---|---|---|---|---|---|
| A1 | There is no salesperson checklist input; "if applicable" items are only regex hits on the ad copy | PDF §5 first paragraph | `design/15-Data-Auth-and-Gateway.md:220` · `:290` · `:295` · `design/AI-PROTOCOL-AND-RULES.md:327` | Line 220 bans prior-use / warranty columns. Lines 290 and 295 trigger only when the copy contains a cue. Nothing in 14 §8.2 `POST /checks` takes checklist answers (body is `{version}`). | |
| A2 | Finance rules run only when `adKind == FINANCE` | PDF §5 "If the ad shows a rate or payment" | `design/15-Data-Auth-and-Gateway.md:298` · `design/AI-PROTOCOL-AND-RULES.md:346–347` | The condition is `adKind==FINANCE`; no rule looks for payment / rate text in CASH ads. | |
| A3 | A vehicle sold before being linked can never be linked to a customer | PDF §4 "Car(s) purchased" | `design/15-Data-Auth-and-Gateway.md:167` · `:173` · `design/14-Backend-API-Contract.md:312` (§4.5 sell body) · `:427` | Link requires `IN_STOCK`. The sell body is `{soldOn, soldPrice, version}` with no `customerId`. Walk it through: sell first → link → `400 WRONG_DEALER_OR_SOLD`. | |
| A4 | AI success always becomes PASSED; the UI is not required to show soft findings on Passed | PDF §5 "flags anything … still missing" | `design/AI-PROTOCOL-AND-RULES.md:205` · `design/12-Frontend-UI-Conventions.md:40` · `design/13-Frontend-Engineering.md:185` | Step 6 writes PASSED on any AI success. Neither 12 nor 13 says the soft list / `aiNotes` must be shown with Passed. | |
| A5 | Only `conditionCode` edits on the vehicle stale a Passed check; year / make / model / VIN and dealer info edits do not | PDF §5 (year, dealer name / contact are compared) | `design/14-Backend-API-Contract.md:309` · `design/DEVELOPMENT-DESIGN.md:103` | 14 names condition only. DEVELOPMENT-DESIGN says "vehicle price/condition", but the vehicle has no price field. Neither mentions year or the admin dealer PATCH (14 §3.4). | |
| A6 | No field format rules for VIN, year, email, phone, URL, dates | PDF §3, §4 | `design/14-Backend-API-Contract.md:280` · `design/AI-CODING-BACKEND.md:546` | Only "Required: …". VIN column is length 32 with no 17-char rule. Search 14 for `@Email` / year range — none. | |
| A7 | OMVIC rules are hard-coded | PDF §8 Compliance | `design/AI-PROTOCOL-AND-RULES.md:224` onward | `static final Pattern` constants; 20000 km threshold in code; no config key for rules in §D.1. | |
| A8 | No "not legal advice" disclaimer in the UI | PDF §8 Compliance | `design/12-Frontend-UI-Conventions.md` §5 · `design/13-Frontend-Engineering.md` §Ad compliance | Search both for "legal" / "disclaimer" — no hits. | |
| A9 | Backup exists in Bicep but not in any design doc | PDF §8 Hosting | `dealer-platform/infra/main.bicep:194` | `backupRetentionDays: 7`. Search `design/` for "backup" — only unrelated "classroom backup" hits. | |
| A10 | Acceptance has no required-field case and no fixtures for A1 / A2 | — | `design/16-Acceptance-and-Test.md` BE-01–BE-16 · `design/17-Ad-Check-Fixtures.md` FX-01–FX-22 | No BE case posts a vehicle with a missing required field. No FX is a CASH ad with payment text or an undisclosed declared prior use. | |

## B. Deliberate deviations

| ID | Claim | Spec | Evidence | What to look for | Verdict |
|---|---|---|---|---|---|
| B1–B3 | Earlier external sign-in plan, Ready + TXT, Assistant page are signed errata | PDF §2, §5, §7 | `design/SCOPE-BASELINE.md:64–68` | Three numbered errata. | |
| B4 | Several "always required" disclosures are soft only, and this is **not** in the signed errata | PDF §5 lists | `design/AI-PROTOCOL-AND-RULES.md:310–327` vs `design/SCOPE-BASELINE.md:64–68` | C.0a lists year, new/used, warranty, prior use, finance term, cost of borrowing, lease term/rent/down as soft. SCOPE-BASELINE has only errata 1–3. | |
| B5 | Broadcast exemption waives proximity only; APR is still hard | PDF §5 "Exception: radio, TV and billboard ads are exempt from displaying these alongside the rate" | `design/15-Data-Auth-and-Gateway.md:298` onward · `design/17-Ad-Check-Fixtures.md:249` (FX-14) | `FINANCE_APR_MISSING` has no medium condition; FX-14 still includes an APR. Decide which reading of "these" is right. | |
| B7 | Admin "view credentials" = member list without email | PDF §2 | `design/14-Backend-API-Contract.md:188` (§3.5) | Response fields; note at line 208 "does not invent email". | |

## C. Corrections to my analysis

| Item | Claim | Evidence | Verdict |
|---|---|---|---|
| C1 | AI cannot block; my 04 §4 flow is wrong | `design/AI-PROTOCOL-AND-RULES.md:205` | |
| C2 | Dealer contact: all three missing = hard, one or two = soft | `design/AI-PROTOCOL-AND-RULES.md` C.1 rows `DEALER_CONTACT_MISSING` / `_INCOMPLETE` | |
| C3 | One person has at most one active dealer overall | `design/15-Data-Auth-and-Gateway.md:83` | |

## Items I did not verify

- Actual code under `dealer-core/`, `dealer-web/`, etc. The review compares **documents only**; the implementation may already differ.
- `design/archive/` (withdrawn) and the course PPT (not readable here).
- Whether `dealer-platform/openapi.yaml` matches 14.
- Real OMVIC regulation text. The review uses the spec PDF's wording as the reference, which PDF §8 itself calls non-authoritative.
