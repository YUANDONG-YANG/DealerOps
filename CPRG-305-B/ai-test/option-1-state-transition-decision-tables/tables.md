# Bonus Work: State Transition and Decision Tables

**Course:** CPRG-305-B · Software Testing
**Student:** Yuandong Yang (000949205) · Yuandong.Yang@edu.sait.ca
**Capstone project:** DealerOps — a multi-tenant dealership management platform (.NET 10 backend, React frontend)
**Date:** 2026-11-05
**Bonus option selected:** *State Transition and Decision Tables — develop a complete state transition table and a decision table for relevant features of the Capstone Project.*

---

## 1. Why these two features were chosen

A state transition table is only informative when the feature has real states, guarded transitions and
illegal events. A decision table is only informative when an outcome depends on a combination of
conditions rather than a single flag. The two DealerOps features below were chosen because each is the
strongest example of one of those shapes:

| Deliverable | Feature | Why it fits |
| --- | --- | --- |
| State transition table (§3) | Sales lead follow-up (`LEAD-01`…`LEAD-08`) | Five states, two of them final-but-recoverable, with four guards on the recovery path. Backward transitions are legal, which makes a transition matrix the only readable specification. |
| Decision table (§4) | In-dealership member role administration (`AUTH-26`, `AUTH-27`) | The outcome depends on four independent conditions (caller role, self-target, requested role, target role). Prose cannot express this without ambiguity; the table exposes rules that prose had left implicit. |

Both tables were written against the **implementation**, not only the requirement text, and each cell
was traced to a specific guard in the source. Where the code and the requirement document disagree,
the table records the code's behaviour and §5 lists the discrepancy. Source files inspected:

- `backend/dotnet/DealerOps.Core/Lead/LeadService.cs`, `Lead/LeadStage.cs`
- `backend/dotnet/DealerOps.Core/Dealer/MembershipService.cs`, `Dealer/DealerRole.cs`
- `backend/dotnet/DealerOps.Core/Common/Tenant/TenantGuard.cs`
- `backend/dotnet/DealerOps.Core/Common/Exceptions/ErrorCode.cs`

### Error codes used in both tables

The API returns a code and an HTTP status from a single mapping, so the tables name the code and the
status together.

| Code | HTTP | Meaning in these tables |
| --- | --- | --- |
| `VALIDATION` | 400 | Input or event is not legal for the request shape |
| `WRONG_DEALER_OR_SOLD` | 400 | Referenced vehicle is not in stock at the caller's dealership |
| `FORBIDDEN` | 403 | Caller's role does not permit the action |
| `NOT_FOUND` | 404 | Target row does not exist inside the caller's dealership |
| `VERSION_CONFLICT` | 409 | Optimistic-lock version did not match |
| `LEAD_CLOSED` | 409 | Event is not legal for a closed lead |
| `LEAD_DUPLICATE` | 409 | An open lead already exists for this customer and vehicle |

---

## 2. Feature 1 under test: sales lead follow-up

A *lead* is one sales opportunity: a customer, optionally one vehicle of the same dealership, an
optional owner, a stage, a next follow-up date, and append-only notes.

### 2.1 States

| ID | State | Kind | Definition |
| --- | --- | --- | --- |
| — | *(none)* | pseudo | No lead row exists yet. Start state for the create event. |
| S1 | `NEW` | open | Created, not yet contacted. The only stage a create can produce. |
| S2 | `CONTACTED` | open | Customer has been reached. |
| S3 | `QUALIFIED` | open | Customer is a genuine prospect. |
| S4 | `WON` | closed | Opportunity succeeded. Final unless reopened. |
| S5 | `LOST` | closed | Opportunity failed; carries a mandatory reason. Final unless reopened. |

`WON` and `LOST` are *closed* states: `LeadStageExtensions.IsClosed()` is the single predicate that
drives every guard below.

**Not states.** Two attributes look like states and are deliberately excluded:

- **Overdue** (`LEAD-06`) is a *derived* attribute, computed per read as `open ∧ nextFollowUpOn < today`.
  It is not stored and has no transitions, so it belongs in a boundary-value analysis of the date, not here.
- **Vehicle `IN_STOCK` / `SOLD`** is the state of a *different* entity. It appears here only as guard
  input G3/G4, which is what makes the reopen path interesting.

### 2.2 Events

| ID | Event | API |
| --- | --- | --- |
| E1 | Create lead | `POST /api/v1/leads` |
| E2 | Update lead to target stage *T* | `PATCH /api/v1/leads/{id}` |
| E3 | Reopen lead to target stage *T* | `POST /api/v1/leads/{id}/reopen` |
| E4 | Add note | `POST /api/v1/leads/{id}/notes` |

### 2.3 Guards

Guards are listed in the order the implementation evaluates them. Order matters for testing: a request
that violates two guards reports only the first, so a test asserting the second guard's code must
satisfy every earlier one.

| ID | Guard | Violation result |
| --- | --- | --- |
| G0 | Request `version` equals the stored version | `VERSION_CONFLICT` 409 |
| G1 | Current stage is open (for E2) | `LEAD_CLOSED` 409 |
| G1′ | Current stage is closed (for E3) | `VALIDATION` 400 |
| G2 | Target *T* of a reopen is an open stage | `VALIDATION` 400, `fieldErrors.stage` |
| G3 | A `WON` lead's vehicle was **not** sold to this lead's customer | `LEAD_CLOSED` 409 |
| G4 | Referenced vehicle is `IN_STOCK` at this dealership | `WRONG_DEALER_OR_SOLD` 400 |
| G5 | No other **open** lead exists for the same customer and vehicle | `LEAD_DUPLICATE` 409 |
| G6 | `T = LOST` supplies a non-blank reason | `VALIDATION` 400 |
| G7 | Named owner is an active member of this dealership | `VALIDATION` 400 |

G4 and G7 are *conditional* guards on E2: the implementation evaluates them only when the request
actually changes `vehicleId` / `ownerUsername`. G5 is evaluated on E2 only when the vehicle changes
**and** the target stage stays open, because closing a lead releases its customer-vehicle pair.

---

## 3. Deliverable 1 — complete state transition table

### 3.1 Transition matrix (E2 `PATCH`, all guards satisfied)

Rows are the current state, columns the requested target stage. This matrix answers the question the
requirement prose left open — whether a lead may move backwards — and the answer is yes.

| From ↓ / To → | `NEW` | `CONTACTED` | `QUALIFIED` | `WON` | `LOST` |
| --- | --- | --- | --- | --- | --- |
| `NEW` | `NEW` (no-op) | `CONTACTED` | `QUALIFIED` | `WON` | `LOST` (needs G6) |
| `CONTACTED` | `NEW` | `CONTACTED` (no-op) | `QUALIFIED` | `WON` | `LOST` (needs G6) |
| `QUALIFIED` | `NEW` | `CONTACTED` | `QUALIFIED` (no-op) | `WON` | `LOST` (needs G6) |
| `WON` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` |
| `LOST` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` |

Between the three open stages every transition is permitted, including same-stage no-ops and regression
(`QUALIFIED → NEW`). Entering a closed state is permitted from any open stage; the usual funnel path
`NEW → CONTACTED → QUALIFIED → WON` is a convention, not a constraint. Both closed rows are uniformly
rejected, which is the single `IsClosed()` check — so one test per closed state is sufficient coverage
of those ten cells.

### 3.2 Full transition table (every event × state)

| # | Current state | Event | Guard outcome | Next state | Response |
| --- | --- | --- | --- | --- | --- |
| T01 | *(none)* | E1 create, existing customer, no vehicle | G7 ok | `NEW` | 201 |
| T02 | *(none)* | E1 create, existing customer + `IN_STOCK` vehicle | G4, G5, G7 ok | `NEW` | 201 |
| T03 | *(none)* | E1 create, new customer created in same transaction | G7 ok | `NEW` | 201 |
| T04 | *(none)* | E1 create, both `customerId` and `newCustomer` supplied | neither-or-both rejected | *(none)* | 400 `VALIDATION` |
| T05 | *(none)* | E1 create, neither supplied | neither-or-both rejected | *(none)* | 400 `VALIDATION` |
| T06 | *(none)* | E1 create, customer of another dealership | tenant scope | *(none)* | 404 `NOT_FOUND` |
| T07 | *(none)* | E1 create, vehicle `SOLD` or of another dealership | G4 fails | *(none)* | 400 `WRONG_DEALER_OR_SOLD` |
| T08 | *(none)* | E1 create, owner not an active member | G7 fails | *(none)* | 400 `VALIDATION` |
| T09 | *(none)* | E1 create, open lead already exists for customer + vehicle | G5 fails | *(none)* | 409 `LEAD_DUPLICATE` |
| T10 | `NEW` / `CONTACTED` / `QUALIFIED` | E2 → any open stage | G0 ok | target open stage | 200 |
| T11 | `NEW` / `CONTACTED` / `QUALIFIED` | E2 → `WON` | G0 ok | `WON` | 200 |
| T12 | `NEW` / `CONTACTED` / `QUALIFIED` | E2 → `LOST` with reason | G6 ok | `LOST` | 200 |
| T13 | `NEW` / `CONTACTED` / `QUALIFIED` | E2 → `LOST`, reason blank or omitted | G6 fails | unchanged | 400 `VALIDATION` |
| T14 | any open | E2 changing vehicle to a `SOLD` vehicle | G4 fails | unchanged | 400 `WRONG_DEALER_OR_SOLD` |
| T15 | any open | E2 changing vehicle to one that already has an open lead for this customer, staying open | G5 fails | unchanged | 409 `LEAD_DUPLICATE` |
| T16 | any open | E2 changing vehicle to one that already has an open lead for this customer, **and** target is `WON`/`LOST` | G5 skipped | target closed stage | 200 |
| T17 | any open | E2 setting owner to a non-member | G7 fails | unchanged | 400 `VALIDATION` |
| T18 | any open | E2 with stale `version` | G0 fails | unchanged | 409 `VERSION_CONFLICT` |
| T19 | `WON` | E2 → any stage | G1 fails | `WON` | 409 `LEAD_CLOSED` |
| T20 | `LOST` | E2 → any stage | G1 fails | `LOST` | 409 `LEAD_CLOSED` |
| T21 | `LOST` | E3 reopen → `NEW`/`CONTACTED`/`QUALIFIED`, no vehicle | G1′, G2 ok | target open stage, reason cleared | 200 |
| T22 | `LOST` | E3 reopen, vehicle still `IN_STOCK`, no duplicate | G1′, G2, G4, G5 ok | target open stage, reason cleared | 200 |
| T23 | `LOST` | E3 reopen, vehicle now `SOLD` | G4 fails | `LOST` | 400 `WRONG_DEALER_OR_SOLD` |
| T24 | `LOST` | E3 reopen, another open lead exists for customer + vehicle | G5 fails | `LOST` | 409 `LEAD_DUPLICATE` |
| T25 | `WON` | E3 reopen, vehicle **not** sold to this lead's customer, still `IN_STOCK` | G3, G4, G5 ok | target open stage | 200 |
| T26 | `WON` | E3 reopen, vehicle sold **to this lead's customer** | G3 fails | `WON` | 409 `LEAD_CLOSED` |
| T26b | `WON` | E3 reopen, vehicle sold **to a different customer** | G3 passes, G4 fails | `WON` | 400 `WRONG_DEALER_OR_SOLD` |
| T27 | `WON` | E3 reopen, lead has no vehicle | G3 vacuously true | target open stage | 200 |
| T28 | `WON` / `LOST` | E3 reopen → `WON` or `LOST` | G2 fails | unchanged | 400 `VALIDATION` + `fieldErrors.stage` |
| T29 | any open | E3 reopen | G1′ fails | unchanged | 400 `VALIDATION` |
| T30 | `WON` / `LOST` | E3 reopen with stale `version` | G0 fails | unchanged | 409 `VERSION_CONFLICT` |
| T31 | any state incl. `WON` / `LOST` | E4 add note | — | unchanged | 201 |

### 3.3 Reading of the table

Three properties of the feature are visible in the table but not in the requirement prose:

1. **The closed states are recoverable, but asymmetrically.** `LOST` has three guards on its way back
   (G2, G4, G5); `WON` has four (G2, G3, G4, G5). G3 is the business rule that a win already converted
   into a sale to that same customer is permanent.

   G3 and G4 overlap, and the overlap is the point. `SoldToLeadCustomer` can only be true when the
   vehicle's status is `SOLD`, and a `SOLD` vehicle also fails G4. So G3 never decides whether a reopen
   succeeds — it decides only *which error* a sold vehicle produces, because it is evaluated first.
   The three-way split is T25 (vehicle `IN_STOCK` → 200), T26 (sold to this lead's customer → 409
   `LEAD_CLOSED`) and T26b (sold to anyone else → 400 `WRONG_DEALER_OR_SOLD`). A test suite that
   checked only T25 and T26 would pass if G3 were deleted, since T26 would then return 400 from G4 and
   still be "an error"; T26b is what makes the distinction observable.
2. **Closing a lead relaxes a constraint.** The uniqueness rule G5 applies only to open leads, so T16
   succeeds where T15 fails on the same data with only the target stage changed. This is the clearest
   example in the feature of an outcome that depends on the target state, not the source state.
3. **Notes are state-independent.** T31 is a single row covering all five states because the add-note
   path has no `IsClosed()` guard. Staff can annotate a closed lead, which is consistent with notes
   being an append-only audit trail (`LEAD-07`).

### 3.4 Test cases derived from the table

Each test case is one row or one equivalence class of rows. 32 transition rows collapse to 19 cases
because the closed-state rejections (T19/T20) and the open-to-open matrix (T10) are each uniform.

| TC | Covers | Precondition | Action | Expected |
| --- | --- | --- | --- | --- |
| ST-01 | T01 | Customer C exists | Create lead for C, no vehicle | 201, stage `NEW` |
| ST-02 | T02 | C exists, vehicle V `IN_STOCK` | Create lead for C on V | 201, stage `NEW` |
| ST-03 | T03 | — | Create lead with a new customer payload | 201, lead and customer both persisted |
| ST-04 | T04, T05 | C exists | Create with both, then with neither, customer selector | 400 `VALIDATION` both times |
| ST-05 | T06 | Customer C2 of dealership B | Create lead for C2 as dealership A | 404 `NOT_FOUND` |
| ST-06 | T07 | Vehicle V `SOLD` | Create lead on V | 400 `WRONG_DEALER_OR_SOLD` |
| ST-07 | T08 | Username U not a member | Create lead with owner U | 400 `VALIDATION` |
| ST-08 | T09 | Open lead L1 for C + V | Create second lead for C + V | 409 `LEAD_DUPLICATE` |
| ST-09 | T10 | Lead L `QUALIFIED` | Patch to `NEW` | 200, stage `NEW` (backward transition is legal) |
| ST-10 | T11 | Lead L `NEW` | Patch to `WON` | 200, stage `WON` (funnel skip is legal) |
| ST-11 | T12, T13 | Lead L open | Patch to `LOST` with blank reason, then with a reason | 400 `VALIDATION`, then 200 |
| ST-12 | T15, T16 | Open L1 for C + V; open L2 for C, no vehicle | Patch L2 to V staying `CONTACTED`; then patch L2 to V with stage `WON` | 409 `LEAD_DUPLICATE`, then 200 |
| ST-13 | T18 | Lead L open, version *n* | Patch with version *n−1* | 409 `VERSION_CONFLICT` |
| ST-14 | T19, T20 | Lead L `WON`; lead M `LOST` | Patch each to `CONTACTED` | 409 `LEAD_CLOSED` both |
| ST-15 | T21, T22 | Lead L `LOST` with reason, vehicle `IN_STOCK` | Reopen to `CONTACTED` | 200, stage `CONTACTED`, `lostReason` cleared |
| ST-16 | T23 | Lead L `LOST` on vehicle V, V now `SOLD` | Reopen L | 400 `WRONG_DEALER_OR_SOLD` |
| ST-17 | T25 | Lead L `WON` on V, V still `IN_STOCK` | Reopen L to `CONTACTED` | 200, stage `CONTACTED` |
| ST-17b | T26, T26b | Lead L `WON` on V, V sold to a different customer; lead M `WON` on W, W sold to M's own customer | Reopen L, then reopen M | 400 `WRONG_DEALER_OR_SOLD`, then 409 `LEAD_CLOSED` |
| ST-18 | T28, T29 | Lead L `WON`; lead M `NEW` | Reopen L to `LOST`; reopen M to `NEW` | 400 `VALIDATION` both, `fieldErrors.stage` on the first |

ST-17b is the most valuable case in the set: it is the only one that exercises G3 *distinguishably*
(see §3.3 item 1), it needs the longest setup, and it is the rule most likely to be lost in a refactor
because it depends on a join across two other tables (`vehicle`, `customer_vehicle`). Its second half
is also the only place where a deleted guard would still produce an error response and therefore still
look healthy to a coarser test.

---

## 4. Deliverable 2 — decision table: in-dealership member role change

**Under test:** `PUT /api/v1/dealer/members/{username}/role` — the owner or a manager of a dealership
sets another member's role (`AUTH-26`, `AUTH-27`).

A dealership has three tiers: `OWNER` (one per dealership, appointed only by the platform admin),
`MANAGER`, `SALES`. Business data access is identical across the three; the tiers differ only in team
administration, audit reads and the payment ledger.

### 4.1 Conditions and actions

| ID | Condition | Values |
| --- | --- | --- |
| C1 | Caller's role in their dealership | `OWNER` / `MANAGER` / `SALES` |
| C2 | Target username is the caller themselves | Y / N |
| C3 | Requested new role is `OWNER` | Y / N |
| C4 | Target is an active member of the caller's dealership | Y / N |
| C5 | Target's current role | `OWNER` / `MANAGER` / `SALES` |

| ID | Action |
| --- | --- |
| A1 | Change the role; audit `MEMBERSHIP` / `UPDATE`; 200 |
| A2 | Reject 403 `FORBIDDEN` — caller is not a team administrator |
| A3 | Reject 403 `FORBIDDEN` — "You cannot change your own role." |
| A4 | Reject 403 `FORBIDDEN` — "Only the platform admin can appoint a dealership owner." |
| A5 | Reject 404 `NOT_FOUND` — target is not an active member here |
| A6 | Reject 403 `FORBIDDEN` — target is the owner |
| A7 | Reject 403 `FORBIDDEN` — a manager may act on sales members only |

The conditions are evaluated in the order C1 → C2 → C3 → C4 → C5, which is why the table below is
written as a sequence of rules with `–` for "not reached".

### 4.2 Decision table

| Rule | C1 caller | C2 self | C3 wants `OWNER` | C4 active member | C5 target role | Action |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | `SALES` | – | – | – | – | **A2** 403 |
| R2 | `OWNER` / `MANAGER` | Y | – | – | – | **A3** 403 |
| R3 | `OWNER` / `MANAGER` | N | Y | – | – | **A4** 403 |
| R4 | `OWNER` / `MANAGER` | N | N | N | – | **A5** 404 |
| R5 | `OWNER` / `MANAGER` | N | N | Y | `OWNER` | **A6** 403 |
| R6 | `MANAGER` | N | N | Y | `MANAGER` | **A7** 403 |
| R7 | `MANAGER` | N | N | Y | `SALES` | **A1** 200 |
| R8 | `OWNER` | N | N | Y | `MANAGER` | **A1** 200 |
| R9 | `OWNER` | N | N | Y | `SALES` | **A1** 200 |

Nine rules cover the full input space. The unreduced space is 3 × 2 × 2 × 2 × 3 = 72 combinations;
sequential short-circuit evaluation collapses it to nine, and R1–R4 absorb 66 of the 72 on their own
(24 + 24 + 12 + 6), leaving the six caller-role × target-role combinations handled by R5–R9.

**Impossible combinations, excluded deliberately.** C2 = Y together with C5 = `SALES` cannot occur for a
caller who passed C1, since a `SALES` caller is already rejected by R1. Likewise C2 = Y with C4 = N
cannot occur: the caller is by definition an active member. Listing these as rules would inflate the
table without adding a testable case.

### 4.3 Rules the prose had left implicit

Building the table surfaced three behaviours that the requirement text does not state:

1. **R3 outranks R5.** A manager who requests `OWNER` for the dealership owner gets A4
   ("only the platform admin can appoint an owner"), not A6 ("target is the owner"), because C3 is
   checked before the target is even loaded. Any test asserting A6 must therefore request `MANAGER` or
   `SALES`, never `OWNER` — an ordering dependency that is invisible in the prose.
2. **R3 outranks R4.** Requesting `OWNER` for a username that does not exist returns 403, not 404.
   This is the better behaviour — it declines to confirm whether a username exists — but it is
   accidental rather than specified.
3. **R7 permits a no-op.** `AUTH-27` describes a manager's power as *promoting a sales member to
   manager*, but the implementation permits a manager to set a sales member to `SALES`. The request
   succeeds and writes an audit row with no change. This is harmless and idempotent, so it is recorded
   here as a documentation gap rather than a defect; see §5.

### 4.4 Test cases derived from the decision table

One case per rule, each independently executable. Fixture: dealership A with `owner_a` (`OWNER`),
two managers `mgr_a` and `mgr_a2` (`MANAGER`), two sales members `sales_a` and `sales_a2` (`SALES`),
plus `owner_b` in dealership B.

| TC | Rule | Caller | Request | Expected |
| --- | --- | --- | --- | --- |
| DT-01 | R1 | `sales_a` | Set `sales_a2` to `MANAGER` | 403 `FORBIDDEN` |
| DT-02 | R2 | `mgr_a` | Set `mgr_a` to `SALES` | 403, "You cannot change your own role." |
| DT-03 | R2 | `owner_a` | Set `owner_a` to `MANAGER` | 403, same message |
| DT-04 | R3 | `owner_a` | Set `sales_a` to `OWNER` | 403, "Only the platform admin can appoint a dealership owner." |
| DT-05 | R3 vs R4 | `owner_a` | Set `no_such_user` to `OWNER` | 403, **not** 404 (ordering) |
| DT-06 | R4 | `owner_a` | Set `owner_b` to `SALES` | 404 `NOT_FOUND` (tenant isolation) |
| DT-07 | R5 | `mgr_a` | Set `owner_a` to `SALES` | 403, "Only the platform admin can change the dealership owner." |
| DT-08 | R6 | `mgr_a` | Set `mgr_a2` to `SALES` | 403, "Only the dealership owner can change a manager's role." |
| DT-09 | R7 | `mgr_a` | Set `sales_a` to `MANAGER` | 200, audit `MEMBERSHIP` / `UPDATE` |
| DT-10 | R8 | `owner_a` | Set `mgr_a` to `SALES` | 200 (demotion by owner) |
| DT-11 | R9 | `owner_a` | Set `sales_a` to `MANAGER` | 200 |
| DT-12 | §4.3 item 3 | `mgr_a` | Set `sales_a` to `SALES` | 200, no effective change (documents current behaviour) |

DT-05 and DT-06 are the cases a table-free reading of the requirement would miss, and DT-06 is the one
that matters most: it is the multi-tenancy boundary, where a wrong answer leaks the existence of
another dealership's staff.

---

## 5. Observation raised by this exercise

`AUTH-27` in `design/21-Feature-Extensions.md` states that a manager *"promotes a sales member to
`MANAGER`"*. The implementation (`MembershipService.SetRoleInOwnDealership`) permits a manager to set a
sales member to either `MANAGER` or `SALES`; only `OWNER` is blocked for in-dealership callers. Rule R7
and case DT-12 record the implemented behaviour.

The behaviour is idempotent and grants no privilege a manager does not already hold, so no code change
is proposed. The requirement wording is the thing that is narrower than the system it describes. This
is the kind of gap a decision table finds and a prose review does not: the omission is not a wrong
statement, it is an unlisted column.

---

## 6. Traceability

| Table | Requirements covered | Existing automated coverage |
| --- | --- | --- |
| State transition table (§3) | `LEAD-01`, `LEAD-02`, `LEAD-03`, `LEAD-04`, `LEAD-07`, `CR L4`, `CR L5` | `playwright/tests/api/leads.spec.ts`, `playwright/tests/ui/leads.spec.ts` |
| Decision table (§4) | `AUTH-26`, `AUTH-27` | `playwright/tests/api/dealer-roles.spec.ts`, `playwright/tests/ui/team-roles.spec.ts` |

The project's acceptance baseline is `design/16-Acceptance-and-Test.md`; the requirements quoted above
are specified in `design/21-Feature-Extensions.md` §3 (leads) and §5 (roles), with the role hierarchy
detailed in `design/15-Data-Auth-and-Gateway.md` §2.5.
