# 04 Ad Compliance Check (OMVIC)

## 1. Source points (PDF §5, §8, DOC)

- Before a listing is published, the salesperson completes a checklist and the system flags anything OMVIC requires that is still missing.
- DOC: an AI compliance assistant screens ads automatically; this is the product's key differentiator.
- PDF §8: the rules are reference material, not legal advice; production should allow **rule updates without a code change**.
- SCOPE erratum 3: "publish" = mark Ready + export TXT; no external site integration.

## 2. Ad input

| Field | Code | Required | Notes |
|---|---|---|---|
| Vehicle | `vehicleId` | ✅ | One ad per vehicle |
| Title | `title` | ✅ | Ad headline |
| Body | `body` | ✅ | Ad copy |
| Ad kind | `adKind` | ✅ | `CASH` / `FINANCE` / `LEASE` |
| Medium | `medium` | ✅ | `ONLINE` / `RADIO_TV_BILLBOARD` |

Checklist items (ticked or filled in by the salesperson):

| Item | Applies to |
|---|---|
| Special previous use (police / emergency, taxi / limousine, daily lease / rental) | All |
| Extended warranty offered | All |
| Annual lease km allowance (km/year) | LEASE |

## 3. Rule breakdown

### 3.1 All ads (always required)

| Rule ID | Check | Data source | When missing |
|---|---|---|---|
| AD-R01 | Dealer's registered name | Dealer profile + body | Block `DEALER_NAME_MISSING` |
| AD-R02 | Dealer contact info | Dealer profile + body | Block |
| AD-R03 | Previous-use disclosure (**only if applicable**: police / emergency, taxi / limousine, daily lease / rental) | Checklist + body | Ticked but not in body → block |
| AD-R04 | New / used status | Body | Block |
| AD-R05 | Year | DMS + body | Block |
| AD-R06 | Extended warranty terms (**only if offered**) | Checklist + body | Ticked but not in body → block |
| AD-R07 | Price | Body | Block `PRICE_MISSING` |
| AD-R08 | Condition (Certified / As-is / Unfit / Irreparable) | DMS + body | Not stated → `CONDITION_UNDISCLOSED`; better than DMS → `CONDITION_MISMATCH` |

### 3.2 Finance / credit ads (`adKind=FINANCE`, or the body shows a rate / payment)

| Rule ID | Check | When missing |
|---|---|---|
| AD-R10 | APR | Block `FINANCE_APR_MISSING` |
| AD-R11 | APR as prominent as the payment | Online: left to AI (soft `FINANCE_APR_PROXIMITY`) |
| AD-R12 | Loan term | Block |
| AD-R13 | Cash price / cost of borrowing | Block |
| AD-R14 | **Exception**: with `medium=RADIO_TV_BILLBOARD`, R11–R13 need not appear alongside the rate | Exempt |

### 3.3 Lease ads (`adKind=LEASE`)

| Rule ID | Check | When missing |
|---|---|---|
| AD-R20 | States that it is a lease | Block |
| AD-R21 | Term | Block |
| AD-R22 | Payment amount | Block |
| AD-R23 | APR | Block `LEASE_APR_MISSING` |
| AD-R24 | Upfront payment amount | Block |
| AD-R25 | Excess-km cost: required **only when the annual allowance is under 20,000 km**; exactly 20,000 is not required | Block |

## 4. Decision flow

```
Save ad ─► Fixed-rule check
             ├─ Hard miss ─► BLOCKED (AI not called, HTTP 200)
             └─ No hard miss ─► AI review (≤ 15 s)
                                  ├─ Pass ───────► PASSED
                                  ├─ AI finds issue ─► BLOCKED / NEEDS_AI
                                  └─ Timeout / error ─► AI_UNAVAILABLE (never shown as a pass)
PASSED ─(edit title / body / kind / medium / condition / price, etc.)─► STALE
PASSED and not STALE ─► can mark Ready ─► can export TXT
```

## 5. Check states

| State | Meaning | Ready / export allowed |
|---|---|---|
| `NEEDS_AI` | Not checked yet, or edited and awaiting re-check | ❌ |
| `BLOCKED` | Fixed rules found a hard miss | ❌ |
| `AI_UNAVAILABLE` | AI timed out or failed | ❌ |
| `PASSED` | Fixed rules and AI both pass, content unchanged | ✅ |
| `STALE` | Passed once, content changed since | ❌ |

## 6. Requirements

| ID | Requirement | Source | Priority |
|---|---|---|---|
| AD-01 | Create / edit an ad draft (title, body, kind, medium) for a vehicle of the same dealer; one ad per vehicle | PDF §5 | Must |
| AD-02 | Provide the checklist: previous use, extended warranty, lease annual km | PDF §5 | Must |
| AD-03 | Run fixed rules AD-R01–R25 and list each missing item with a reason code | PDF §5 | Must |
| AD-04 | Rules switch on by ad kind + medium; rules that don't apply are not shown as failures | PDF §5 | Must |
| AD-05 | Year and condition are pulled from DMS and compared with the body | PDF §5 | Must |
| AD-06 | Dealer name and contact info are pulled from the dealer profile and compared with the body | PDF §5 | Must |
| AD-07 | On a hard miss, AI is not called; the result is BLOCKED directly | SCOPE | Must |
| AD-08 | With no hard miss, a real AI model reviews semantic issues (e.g. APR prominence, overstated condition) | DOC, SCOPE | Must |
| AD-09 | AI timeout (15 s) or failure → `AI_UNAVAILABLE`, persisted; the UI must **not** show a pass | SCOPE | Must |
| AD-10 | Every check is stored (time, state, issue list, content version checked) | Derived | Must |
| AD-11 | Editing the ad or relevant vehicle fields turns a passed check Stale | SCOPE | Must |
| AD-12 | Ready is allowed only when PASSED and not STALE; otherwise `NOT_PASSED` / `CHECK_STALE` | SCOPE | Must |
| AD-13 | After Ready, export TXT: dealer public four fields + vehicle public fields + title/body + check time; **no** customer data or cost | SCOPE | Must |
| AD-14 | Show a prominent notice: "Rules are reference material, not legal advice" | PDF §8 | Should |
| AD-15 | Rules are configurable (rule table / config file) and can change without a code change | PDF §8 | Could (production need; course build may use a config file only) |
| AD-16 | Integration with external listing sites / auto-publishing | DOC | Won't |
| AD-17 | Image Studio (AI photo enhancement) | DOC | Won't (excluded by SCOPE) |

## 7. Decision matrix (examples)

| Kind | Medium | Annual km | Rules checked |
|---|---|---|---|
| CASH | Any | — | R01–R08 |
| FINANCE | ONLINE | — | R01–R08, R10–R13 |
| FINANCE | RADIO_TV_BILLBOARD | — | R01–R08, R10 (R11–R13 exempt from "shown alongside") |
| LEASE | Any | ≥ 20,000 | R01–R08, R20–R24 |
| LEASE | Any | < 20,000 | R01–R08, R20–R25 |

Sample ads are in `design/17-Ad-Check-Fixtures.md`.
