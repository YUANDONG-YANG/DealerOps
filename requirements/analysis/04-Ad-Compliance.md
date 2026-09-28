# 04 Ad Compliance Check (course demo)

## 1. Delivery boundary and sources

PDF §5 describes the original disclosures; DOC describes AI-assisted review. This course delivers the reduced rules in SCOPE-BASELINE errata 3–4 and AI-PROTOCOL-AND-RULES §C. Original specification wording is not a second set of blocking rules.

Only Ready + TXT export is provided. No external publishing, additional vehicle fields, structured salesperson checklist answers, rule editor, or extra approval step is required. The displayed checklist follows kind/medium; checks read title + body, existing vehicle data and dealer public data. Prior use or warranty omitted entirely from the copy cannot be inferred; this is an accepted demo limitation.

## 2. Ad input

- Same-dealer vehicle; one ad per vehicle.
- Title and body: editable text; an empty draft may be saved but cannot pass the check.
- Kind: CASH / FINANCE / LEASE. Medium: ONLINE / RADIO_TV_BILLBOARD.
- Previous use, warranty and lease annual km are read from copy when present, not collected as extra form fields.

## 3. Course rule breakdown

BLOCK prevents Ready/export; REVIEW is a hint and does not prevent them. Rule codes and exact matching patterns follow AI-PROTOCOL-AND-RULES §C and the existing OmvicRuleEngine.

| ID | Check | Course result |
|---|---|---|
| AD-R01 | Dealer registered name missing | BLOCK DEALER_NAME_MISSING |
| AD-R02 | Dealer contact | All contact missing: BLOCK DEALER_CONTACT_MISSING; partial contact: REVIEW DEALER_CONTACT_INCOMPLETE |
| AD-R03 | Prior-use cue without clear disclosure | REVIEW PRIOR_USE_UNCLEAR; no cue means no finding |
| AD-R04 | New/used | REVIEW YEAR_NEW_USED_CONTRADICTION when copy implies new and year is at least two years old; no separate mandatory status field |
| AD-R05 | Year missing | REVIEW YEAR_NOT_IN_COPY |
| AD-R06 | Warranty claim present | REVIEW WARRANTY_CLAIM_NEEDS_REVIEW |
| AD-R07 | Price missing | BLOCK PRICE_MISSING |
| AD-R08 | Condition | BLOCK CONDITION_MISMATCH for Certified claim on a non-certified vehicle; BLOCK CONDITION_UNDISCLOSED if AS_IS / UNFIT / IRREPARABLE is not stated; omitted Certified wording is REVIEW CERTIFIED_NOT_IN_COPY |
| AD-R10 | Finance APR missing | BLOCK FINANCE_APR_MISSING |
| AD-R11 | Finance APR placement | REVIEW FINANCE_APR_PROXIMITY for online finance-triggered copy; no proximity finding for RADIO_TV_BILLBOARD |
| AD-R12 | Finance term missing | REVIEW FINANCE_TERM_MISSING |
| AD-R13 | Finance cash price / cost of borrowing | Price is covered by R07; no separate cost-of-borrowing rule in this demo |
| AD-R14 | Broadcast exception | Waives only R11 proximity review; price and APR remain required; missing term remains a soft hint |
| AD-R20 | Lease statement missing | BLOCK LEASE_STATEMENT_MISSING |
| AD-R21 | Lease term missing | REVIEW LEASE_TERM_MISSING |
| AD-R22 | Lease payment | REVIEW LEASE_RENT_MISSING under the existing engine predicate; general price rule R07 still applies |
| AD-R23 | Lease APR missing | BLOCK LEASE_APR_MISSING |
| AD-R24 | Lease upfront payment missing | REVIEW LEASE_DOWN_MISSING |
| AD-R25 | Annual allowance / excess-km fee | Parsed allowance < 20,000 with no excess-fee wording: BLOCK LEASE_EXCESS_KM_MISSING; exactly 20,000 or more: no excess-fee requirement; allowance unstated: REVIEW LEASE_ALLOWANCE_UNSTATED |

Finance-triggered means FINANCE, or CASH with a match to the existing APR or PAYMENT pattern in title/body. LEASE uses its own rules. No broader natural-language rate detector is added.

## 4. Decision flow and states

1. Save draft, then run Check.
2. Fixed hard finding: BLOCKED, AI skipped, HTTP 200.
3. No hard finding: call real AI (15-second timeout). A successful response produces PASSED with soft findings and AI notes retained. AI notes do not veto Ready. Timeout/error produces persisted AI_UNAVAILABLE (public HTTP 502), never Passed.
4. PASSED means the demo's hard rules passed and AI responded successfully; it is not legal approval and can contain review hints.
5. Before any check: NEEDS_AI. Editing a previously passed listing makes it STALE. Editing a non-passed listing returns it to NEEDS_AI.
6. Listing title/body/kind/medium edits (including price in copy) and vehicle condition changes invalidate the check. Other vehicle/dealer profile edits are not additional invalidation triggers in this demo.
7. Ready/export require PASSED and matching content versions; otherwise NOT_PASSED / CHECK_STALE. Use Mark ready then Export TXT for the demo.

## 5. Requirements

| ID | Requirement | Source | Priority |
|---|---|---|---|
| AD-01 | Create/edit one draft per same-dealer vehicle | PDF §5 / course design | Must |
| AD-02 | Display the kind/medium checklist; no structured salesperson answers | PDF §5 / course triage A1 | Must (display only) |
| AD-03 | Apply the course BLOCK/REVIEW rules above and retain findings with reason codes | SCOPE erratum 4 | Must |
| AD-04 | Trigger by kind, medium and CASH APR/payment patterns; LEASE uses lease rules | Closed A2 / protocol §C | Must |
| AD-05 | Read year/condition from DMS for the corresponding checks | PDF §5 / SCOPE erratum 4 | Must |
| AD-06 | Read dealer public data for name/contact checks | PDF §5 / course design | Must |
| AD-07 | Hard finding skips AI and returns BLOCKED | SCOPE | Must |
| AD-08 | Real AI reviews copy; successful notes do not block | DOC / protocol §B.6 | Must |
| AD-09 | AI timeout/failure persists AI_UNAVAILABLE, never Pass | SCOPE | Must |
| AD-10 | Store each check's time, findings and evaluated content version | Derived | Must |
| AD-11 | Listing edits or vehicle condition changes invalidate a previous pass | Course triage A5 | Must |
| AD-12 | Ready/export require a current pass | SCOPE | Must |
| AD-13 | TXT includes dealer/vehicle public fields, title/body/check time; no customer data or cost | SCOPE | Must |
| AD-14 | Dedicated disclaimer UI/footer | PDF §8 / deferred A8 | Won't this release; explain limitation at defense |
| AD-15 | Configurable rules / rule editor | PDF §8 / Q-15 | Won't this release; patterns remain in code |
| AD-16 | External auto-publishing | DOC | Won't |
| AD-17 | Image Studio | DOC / SCOPE | Won't |

## 6. Decision matrix

| Copy | Medium | Rules |
|---|---|---|
| CASH without APR/payment match | Any | R01–R08 |
| FINANCE or CASH with APR/payment match | ONLINE | R01–R08, R10–R13 |
| FINANCE or CASH with APR/payment match | RADIO_TV_BILLBOARD | Same, except R11 proximity hint is waived; R10 APR and R07 price still apply |
| LEASE, parsed allowance >= 20,000 | Any | R01–R08, R20–R24 |
| LEASE, parsed allowance < 20,000 | Any | R01–R08, R20–R25 |
| LEASE, allowance unstated | Any | R01–R08, R20–R24 plus soft LEASE_ALLOWANCE_UNSTATED |

Fixtures: design/17-Ad-Check-Fixtures.md. Manual checks: analysis/06 AT-12–20 and AT-24–28. These are acceptance definitions, not claims of executed tests.
