# Option 1 — State Transition and Decision Tables

**Course:** CPRG-305-B, Software Testing and Deployment
**Student:** Yuandong Yang
**Project:** DealerOps capstone (dealership operations platform)
**Date:** 2026-11-05
**Option:** State Transition and Decision Tables — develop a complete state transition table and a decision table for relevant features of the Capstone Project.

This option is a specification exercise. It contains no prompt, no model transcript, and no reflection. It contains no executable tests. Each table row is a manual test specification: precondition, input, and expected result.

Two features are specified, one for each technique:

| Technique | Feature | Requirement | Contract |
| --- | --- | --- | --- |
| State transition table | Sales-lead stage | LEAD-03 | `design/21-Feature-Extensions.md` §3; `design/14-Backend-API-Contract.md` §5.5 |
| Decision table | Owner / Manager / Sales permissions | AUTH-27 | `design/21-Feature-Extensions.md` §5; `design/15-Data-Auth-and-Gateway.md` §2.5; `design/14-Backend-API-Contract.md` §5.6–§5.8 and the payment ledger in §4 |

Work-order status (WO-02, WO-05) is a second state machine and is outside this submission. Lead stage already has five states, closed states, and guarded reopen.

Where `design/21-Feature-Extensions.md` states a rule in one sentence and `design/14-Backend-API-Contract.md` states the same rule with its error codes, the table uses the contract. Section 4 records the two places those sentences do not say the same thing.

---

## 1. State-transition table — lead stage (LEAD-03)

### 1.1 Requirement

LEAD-03 (`design/21-Feature-Extensions.md` §3):

> Stages `NEW`, `CONTACTED`, `QUALIFIED`, `WON`, `LOST`; while open, any stage may be chosen (usual path `NEW → CONTACTED → QUALIFIED → WON`). `WON` and `LOST` are closed and change only through `POST /api/v1/leads/{id}/reopen` (CR L4: lost always, won only while its vehicle was not sold to the lead's customer); `LOST` requires a reason. One open lead per customer and vehicle, else **409** `LEAD_DUPLICATE` (CR L5).

`design/14-Backend-API-Contract.md` §5.5 is the API reading of that rule, including the reopen guards and the sale event:

> Stages `NEW`, `CONTACTED`, `QUALIFIED`, `WON`, `LOST`; any stage may be chosen while the lead is open; `WON` and `LOST` are closed and change only through reopen (CR L4, decision D7): a `LOST` lead can always be reopened, a `WON` lead only while its vehicle is not `SOLD` and linked to the lead's customer. Reopening also requires what a create requires: a lead that has a vehicle reopens only while that vehicle is still `IN_STOCK` in this dealership, so no open lead can point at a sold car; a lead with no vehicle always reopens. Only one open lead may exist per customer and vehicle (CR L5); a lead without a vehicle is never a duplicate. `WON` does not sell the vehicle or link it — those stay §4.5 and §6. Selling a vehicle (§4.5) closes its open leads: the buyer's as `WON`, others as `LOST` ("Vehicle sold").

The usual path `NEW → CONTACTED → QUALIFIED → WON` is a convention. While a lead is open, every stage is a legal target, including a move backward and a skip. `WON` does not sell the vehicle.

Notes do not change stage. `POST /api/v1/leads/{id}/notes` returns 201 on an open lead and on a closed lead (`design/21-Feature-Extensions.md` §3, LEAD-07). Notes are omitted from the transition matrix.

### 1.2 States

| State | Kind | Meaning |
| --- | --- | --- |
| *(no row)* | start | Create has not run. |
| `NEW` | open | Created. The only stage create produces. |
| `CONTACTED` | open | Staff have reached the customer. |
| `QUALIFIED` | open | The customer is a prospect. |
| `WON` | closed | The opportunity succeeded. Stage changes only through reopen. |
| `LOST` | closed | The opportunity failed. A reason is stored. Stage changes only through reopen. |

Open means `NEW`, `CONTACTED`, or `QUALIFIED`. Closed means `WON` or `LOST`.

### 1.3 Events

| Event | Request | What it tries to do |
| --- | --- | --- |
| Create | `POST /api/v1/leads` | Insert a lead in `NEW`. |
| Patch to *T* | `PATCH /api/v1/leads/{id}` with `stage = T` | Move an open lead to any of the five stages. |
| Reopen to *T* | `POST /api/v1/leads/{id}/reopen` with `stage = T` | Move a closed lead to an open stage. Legal targets are `NEW`, `CONTACTED`, `QUALIFIED`. |
| Sell the vehicle | `POST /api/v1/vehicles/{id}/sell` | System event. Closes every open lead on that vehicle (CR L6, `design/14-Backend-API-Contract.md` §4.5 and §5.5). |

Every Patch and Reopen carries the lead's current `version`. A stale version is rejected before any stage rule runs.

### 1.4 Guards

Guards are listed in the order the contract applies them. A request that fails an earlier guard never reports a later one. A test for a later code has to satisfy every earlier guard.

| Guard | Applies to | Pass condition | Failure |
| --- | --- | --- | --- |
| G0 | Patch, Reopen | Body `version` equals the stored version | 409 `VERSION_CONFLICT` |
| G1 | Patch | Current stage is open | 409 `LEAD_CLOSED`. Message: "Won and lost leads cannot be changed." |
| G2 | Reopen | Current stage is closed | 400 `VALIDATION`. Message: "Only won and lost leads can be reopened." |
| G3 | Reopen | Target *T* is `NEW`, `CONTACTED`, or `QUALIFIED` | 400 `VALIDATION`, `fieldErrors.stage`. Message: "Reopen the lead as New, Contacted or Qualified." |
| G4 | Reopen of a `WON` lead | The lead's vehicle is not both `SOLD` and linked to this lead's customer | 409 `LEAD_CLOSED`. Message: "This lead's vehicle was sold to this customer, so the won lead cannot be reopened." |
| G5 | Reopen, when `vehicleId` is set | That vehicle is `IN_STOCK` in this dealership | 400 `WRONG_DEALER_OR_SOLD`. Message: "This lead's vehicle is no longer in stock, so the lead cannot be reopened." |
| G6 | Reopen, when `vehicleId` is set | No other open lead exists for this customer and vehicle | 409 `LEAD_DUPLICATE`. Message: "This customer already has an open lead for this vehicle." |
| G7 | Patch to `LOST` | `lostReason` is non-blank | 400 `VALIDATION`. Message: "A lost lead needs a reason." |

G4 is the D7 rule. It is evaluated only for `WON`, and it is evaluated before G5. A won lead whose vehicle is `SOLD` and linked to that customer therefore returns 409 `LEAD_CLOSED`, even though the vehicle is also not `IN_STOCK`.

G5 and G6 are skipped when `vehicleId` is null. A lead with no vehicle reopens once G0, G2, and G3 pass, and `lostReason` is cleared.

On a successful reopen the next state is the requested open stage and `lostReason` is cleared (`design/14-Backend-API-Contract.md` §5.5).

Patch has two further guards that are not stage-to-stage edges. They are included because they reject an otherwise legal open-lead transition:

| Guard | When it runs | Failure |
| --- | --- | --- |
| G8 | Patch changes `vehicleId` | Vehicle is not `IN_STOCK` in this dealership → 400 `WRONG_DEALER_OR_SOLD` |
| G9 | Patch changes `vehicleId` and the target stage is still open | Another open lead already exists for this customer and that vehicle → 409 `LEAD_DUPLICATE` |

G9 is skipped when the patch closes the lead. Closing releases the customer-and-vehicle pair (LEAD-03 / CR L5). A patch that only changes owner, date, or reason, and does not change `vehicleId`, does not run G8 or G9.

Create uses the same vehicle and duplicate rules (LEAD-02, CR L5): a vehicle that is not `IN_STOCK` in this dealership → 400 `WRONG_DEALER_OR_SOLD`; a second open lead for the same customer and vehicle → 409 `LEAD_DUPLICATE`; a lead with no vehicle is never a duplicate. An owner who is not an active member of this dealership → 400 `VALIDATION` (LEAD-04).

### 1.5 Complete transition table — Patch

Rows are the current state. Columns are the requested stage. G0 passes and no other field changes, except the `LOST` columns, which differ only by whether a reason is present. A cell is the next state, or the rejection.

| Current \ Patch to | `NEW` | `CONTACTED` | `QUALIFIED` | `WON` | `LOST` with a reason | `LOST` with a blank or omitted reason |
| --- | --- | --- | --- | --- | --- | --- |
| `NEW` | `NEW` | `CONTACTED` | `QUALIFIED` | `WON` | `LOST` | 400 `VALIDATION` (G7); stays `NEW` |
| `CONTACTED` | `NEW` | `CONTACTED` | `QUALIFIED` | `WON` | `LOST` | 400 `VALIDATION` (G7); stays `CONTACTED` |
| `QUALIFIED` | `NEW` | `CONTACTED` | `QUALIFIED` | `WON` | `LOST` | 400 `VALIDATION` (G7); stays `QUALIFIED` |
| `WON` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` |
| `LOST` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` | 409 `LEAD_CLOSED` |

Same-stage patches of an open lead are successful no-ops (200, stage unchanged). `QUALIFIED → NEW` is legal. `NEW → WON` is legal. The closed rows are uniform: G1 rejects every target, including a patch that names the stage the lead already has. G7 is not reached on a closed lead, because G1 runs first. Requirement: LEAD-03. Contract: `design/14-Backend-API-Contract.md` §5.5.

A patch of any existing lead with a stale `version` returns 409 `VERSION_CONFLICT` and does not change the stage (G0). That cell replaces every cell in the row above when the version does not match.

### 1.6 Complete transition table — Reopen

Rows are the current state. Columns are the requested reopen stage. G0 passes. For the three open targets, a `WON` or `LOST` cell is the next state when G4–G6 pass, and names the first failing guard otherwise.

| Current \ Reopen to | `NEW` | `CONTACTED` | `QUALIFIED` | `WON` | `LOST` |
| --- | --- | --- | --- | --- | --- |
| `NEW` | 400 `VALIDATION` (G2) | 400 `VALIDATION` (G2) | 400 `VALIDATION` (G2) | 400 `VALIDATION` (G2) | 400 `VALIDATION` (G2) |
| `CONTACTED` | 400 `VALIDATION` (G2) | 400 `VALIDATION` (G2) | 400 `VALIDATION` (G2) | 400 `VALIDATION` (G2) | 400 `VALIDATION` (G2) |
| `QUALIFIED` | 400 `VALIDATION` (G2) | 400 `VALIDATION` (G2) | 400 `VALIDATION` (G2) | 400 `VALIDATION` (G2) | 400 `VALIDATION` (G2) |
| `WON` | `NEW` if G4, G5, and G6 pass; else the first failure in that order | `CONTACTED`, same guards | `QUALIFIED`, same guards | 400 `VALIDATION` (G3), `fieldErrors.stage` | 400 `VALIDATION` (G3), `fieldErrors.stage` |
| `LOST` | `NEW` if G5 and G6 pass (G4 does not apply); `lostReason` cleared | `CONTACTED`, same guards; reason cleared | `QUALIFIED`, same guards; reason cleared | 400 `VALIDATION` (G3), `fieldErrors.stage` | 400 `VALIDATION` (G3), `fieldErrors.stage` |

G2 is the same message for every open-lead cell, including a reopen whose target is itself closed. G3 is reached only after the lead is known to be closed.

Guard outcomes inside the three `WON` open-target cells, in order:

| Situation on a `WON` lead | First guard | Result | Next state |
| --- | --- | --- | --- |
| No vehicle | G4, G5, G6 skipped | 200 | requested open stage |
| Vehicle still `IN_STOCK`, no other open lead for this customer and vehicle | all pass | 200 | requested open stage |
| Vehicle is `SOLD` and linked to this lead's customer | G4 | 409 `LEAD_CLOSED` | `WON` |
| Vehicle is not `IN_STOCK`, and it is not the G4 case | G5 | 400 `WRONG_DEALER_OR_SOLD` | `WON` |
| Vehicle is `IN_STOCK`, and another open lead exists for this customer and vehicle | G6 | 409 `LEAD_DUPLICATE` | `WON` |

Guard outcomes inside the three `LOST` open-target cells, in order:

| Situation on a `LOST` lead | First guard | Result | Next state |
| --- | --- | --- | --- |
| No vehicle | G5 and G6 skipped | 200, reason cleared | requested open stage |
| Vehicle still `IN_STOCK`, no other open lead for this customer and vehicle | G5 and G6 pass | 200, reason cleared | requested open stage |
| Vehicle is not `IN_STOCK` | G5 | 400 `WRONG_DEALER_OR_SOLD` | `LOST`, reason kept |
| Vehicle is `IN_STOCK`, and another open lead exists for this customer and vehicle | G6 | 409 `LEAD_DUPLICATE` | `LOST`, reason kept |

A `LOST` lead is not subject to G4. A lost lead whose vehicle was sold still fails G5, because a reopened lead must not point at a car that is no longer in stock. "Lost can always be reopened" in LEAD-03 holds for a lost lead with no vehicle, and for a lost lead whose vehicle is still `IN_STOCK`, provided G6 also passes. It does not hold for a lost lead whose vehicle has left stock. That qualification is the next sentence of `design/14-Backend-API-Contract.md` §5.5. Section 4 records it.

A stale `version` on Reopen returns 409 `VERSION_CONFLICT` before G2 (G0).

### 1.7 Create, and close-on-sale

Create is the transition out of *(no row)*. The next state is always `NEW` when the request is accepted (201).

| Precondition | Result |
| --- | --- |
| Existing customer of this dealership; vehicle omitted or `IN_STOCK` here; no open lead already on that pair | 201, stage `NEW` |
| New customer payload instead of `customerId`, same vehicle rules | 201, stage `NEW`; customer and lead persist together (LEAD-01) |
| Both `customerId` and `newCustomer`, or neither | 400 `VALIDATION`; no row |
| Customer belongs to another dealership | 404 `NOT_FOUND`; no row |
| Vehicle is not `IN_STOCK` in this dealership | 400 `WRONG_DEALER_OR_SOLD`; no row (LEAD-02) |
| Owner username is not an active member here | 400 `VALIDATION`; no row (LEAD-04) |
| An open lead already exists for this customer and vehicle | 409 `LEAD_DUPLICATE`; no row (CR L5) |

Sell is an event on the vehicle that moves lead stage (`design/14-Backend-API-Contract.md` §4.5, CR L6). It selects open leads whose `vehicleId` is the sold vehicle. Closed leads are left as they are. A lead with no vehicle is left as it is.

| Current stage | Buyer on the sale | Next stage | `lostReason` |
| --- | --- | --- | --- |
| `NEW`, `CONTACTED`, or `QUALIFIED` | This lead's customer | `WON` | cleared |
| `NEW`, `CONTACTED`, or `QUALIFIED` | A different customer, or a typed name with no customer | `LOST` | `Vehicle sold` |
| `WON` or `LOST` | any | unchanged | unchanged |
| any stage, lead has no vehicle | any | unchanged | unchanged |

After a sale to this lead's customer, the vehicle is `SOLD` and linked to that customer. A later reopen of that `WON` lead fails G4 (409 `LEAD_CLOSED`). A later reopen of a sibling lead that the sale set to `LOST` fails G5 (400 `WRONG_DEALER_OR_SOLD`), because the vehicle is no longer `IN_STOCK`.

### 1.8 Invalid transitions

These are the cells a tester has to assert as rejections. Valid cells are in §1.5–§1.7.

| Id | Current state | Event | Expected rejection | State after |
| --- | --- | --- | --- | --- |
| I-01 | any existing lead | Patch or Reopen with a stale `version` | 409 `VERSION_CONFLICT` | unchanged |
| I-02 | `WON` | Patch to `NEW`, `CONTACTED`, `QUALIFIED`, `WON`, or `LOST` | 409 `LEAD_CLOSED` | `WON` |
| I-03 | `LOST` | Patch to any of the five stages, with or without a reason | 409 `LEAD_CLOSED` | `LOST` |
| I-04 | `NEW`, `CONTACTED`, or `QUALIFIED` | Patch to `LOST` with a blank or omitted reason | 400 `VALIDATION` | unchanged |
| I-05 | any open stage | Patch that points `vehicleId` at a vehicle that is not `IN_STOCK` here | 400 `WRONG_DEALER_OR_SOLD` | unchanged |
| I-06 | any open stage | Patch that points `vehicleId` at a vehicle which already has an open lead for this customer, while the target stage stays open | 409 `LEAD_DUPLICATE` | unchanged |
| I-07 | `NEW`, `CONTACTED`, or `QUALIFIED` | Reopen to any stage, open or closed | 400 `VALIDATION`, "Only won and lost leads can be reopened." | unchanged |
| I-08 | `WON` or `LOST` | Reopen to `WON` or `LOST` | 400 `VALIDATION`, `fieldErrors.stage` | unchanged |
| I-09 | `WON` | Reopen to an open stage when the vehicle is `SOLD` and linked to this lead's customer | 409 `LEAD_CLOSED` | `WON` |
| I-10 | `WON` | Reopen to an open stage when the vehicle is not `IN_STOCK` and G4 does not apply (sold to someone else, or otherwise not linked to this customer) | 400 `WRONG_DEALER_OR_SOLD` | `WON` |
| I-11 | `LOST` | Reopen to an open stage when the vehicle is not `IN_STOCK` | 400 `WRONG_DEALER_OR_SOLD` | `LOST` |
| I-12 | `WON` or `LOST`, vehicle still `IN_STOCK` | Reopen to an open stage when another open lead exists for this customer and vehicle | 409 `LEAD_DUPLICATE` | unchanged |
| I-13 | *(no row)* | Create on a vehicle that is not `IN_STOCK` in this dealership | 400 `WRONG_DEALER_OR_SOLD` | no row |
| I-14 | *(no row)* | Create when an open lead already exists for this customer and vehicle | 409 `LEAD_DUPLICATE` | no new row |

I-06 and the matching valid case are a pair: the same vehicle change with target `WON` or `LOST` is accepted, because G9 applies only while the lead stays open.

I-09 and I-10 are a pair: both vehicles are `SOLD`. The linked-to-this-customer case is 409 `LEAD_CLOSED`. Every other not-in-stock case is 400 `WRONG_DEALER_OR_SOLD`.

### 1.9 Test cases

Callers are signed-in dealer users of dealership A. Customer C belongs to A. Vehicle V belongs to A unless a case says otherwise. Each case states the precondition, the input, and the expected result. No case is program code.

| Case | Covers | Precondition | Input | Expected result |
| --- | --- | --- | --- | --- |
| ST-01 | create, LEAD-03 | C exists. V is `IN_STOCK`. No open lead for C and V. | `POST /api/v1/leads` with `customerId` of C and `vehicleId` of V | 201. Stage is `NEW`. |
| ST-02 | LEAD-01 | No customer id supplied. | `POST /api/v1/leads` with `newCustomer` name, email, phone, and home address, and no vehicle | 201. Stage is `NEW`. The customer exists in this dealership. |
| ST-03 | I-13, LEAD-02 | V is `SOLD`. | `POST /api/v1/leads` for C on V | 400 `WRONG_DEALER_OR_SOLD`. No lead row. |
| ST-04 | I-14, CR L5 | An open lead already exists for C and V. | `POST /api/v1/leads` for C on V again | 409 `LEAD_DUPLICATE`. Still one open lead. |
| ST-05 | §1.5 backward edge | Lead L is `QUALIFIED`, version *n*. | `PATCH /api/v1/leads/{L}` stage `NEW`, version *n* | 200. Stage is `NEW`. |
| ST-06 | §1.5 skip | Lead L is `NEW`, version *n*. | Patch stage `WON`, version *n* | 200. Stage is `WON`. The vehicle is still `IN_STOCK`. |
| ST-07 | I-04 then valid `LOST` | Lead L is `CONTACTED`, version *n*. | Patch stage `LOST` with no reason. Then patch stage `LOST` with reason "Budget", using the same version *n* (the first call did not save). | First response 400 `VALIDATION`, stage still `CONTACTED`. Second response 200, stage `LOST`, `lostReason` "Budget". |
| ST-08 | I-01 | Lead L is open at version *n*. | Patch stage `QUALIFIED` with version *n − 1* | 409 `VERSION_CONFLICT`. Stage unchanged. |
| ST-09 | I-02, I-03 | Lead L is `WON`. Lead M is `LOST` with a reason. Both versions current. | Patch each to `CONTACTED`. | Both 409 `LEAD_CLOSED`. L stays `WON`. M stays `LOST` with its reason. |
| ST-10 | I-06 and the closing exception | Open lead L1 for C on V. Open lead L2 for C with no vehicle, stage `CONTACTED`, version *n*. | Patch L2 to vehicle V, stage still `CONTACTED`. Then patch L2 to vehicle V, stage `WON`, version *n*. | First response 409 `LEAD_DUPLICATE`, L2 unchanged. Second response 200, L2 is `WON` on V. |
| ST-11 | §1.6 lost reopen | Lead L is `LOST`, reason "Budget", vehicle V `IN_STOCK`, no other open lead for C and V, version *n*. | `POST /api/v1/leads/{L}/reopen` stage `CONTACTED`, version *n* | 200. Stage is `CONTACTED`. `lostReason` is null. |
| ST-12 | §1.6 no vehicle | Lead L is `LOST` and has no vehicle. | Reopen to `NEW` with the current version | 200. Stage is `NEW`. Reason cleared. |
| ST-13 | I-11 | Lead L is `LOST` on V. V is now `SOLD`. | Reopen to `QUALIFIED` with the current version | 400 `WRONG_DEALER_OR_SOLD`. Stage stays `LOST`. Reason kept. |
| ST-14 | I-09 | Lead L is `WON` on V. V is `SOLD` and linked to C, L's customer. | Reopen to `CONTACTED` with the current version | 409 `LEAD_CLOSED`. Message states the vehicle was sold to this customer. Stage stays `WON`. |
| ST-15 | I-10 | Lead L is `WON` on V. V is `SOLD` and is not linked to C. | Reopen to `CONTACTED` with the current version | 400 `WRONG_DEALER_OR_SOLD`. Stage stays `WON`. This is not 409 `LEAD_CLOSED`: G4 requires the link as well as `SOLD`, and G5 then rejects the stock. |
| ST-16 | I-12 | Lead L is `LOST` on V, V still `IN_STOCK`. A different open lead already exists for C and V. | Reopen L to `NEW` | 409 `LEAD_DUPLICATE`. L stays `LOST`. |
| ST-17 | I-07, I-08 | Lead L is `NEW`. Lead M is `WON`. | Reopen L to `CONTACTED`. Reopen M to `LOST`. | Both 400 `VALIDATION`. L's message is "Only won and lost leads can be reopened." M's body has `fieldErrors.stage`. Neither stage changes. |
| ST-18 | §1.7 CR L6, then I-09 and I-11 | Open lead Lb for buyer C on V. Open lead Lo for a different customer on V. V is `IN_STOCK`. | Sell V to C. Then reopen Lb. Then reopen Lo. | Sale succeeds. Lb is `WON` with no lost reason. Lo is `LOST` with reason "Vehicle sold". Reopen Lb returns 409 `LEAD_CLOSED`. Reopen Lo returns 400 `WRONG_DEALER_OR_SOLD`. |
| ST-19 | notes are not a transition, LEAD-07 | Lead L is `LOST`. | `POST /api/v1/leads/{L}/notes` with a non-empty body | 201. Stage stays `LOST`. |

---

## 2. Decision table — dealership role (AUTH-27)

### 2.1 Requirement

AUTH-27 (`design/21-Feature-Extensions.md` §5):

> A dealership has three tiers, Owner, Manager and Sales (`design/15-Data-Auth-and-Gateway.md` §2.5). The owner and its managers see `/team` and the inbox; a sales member does not. **Owner only:** the dealership profile (`GET`/`PATCH /api/v1/dealer/profile`), approving or rejecting join requests, setting a manager back to `SALES`, and editing or removing a manager. **Owner or manager:** the member list actions within scope — an owner acts on any member below owner, a manager on sales members only (promote a sales member to `MANAGER`, edit that member's full name and phone with `PATCH /api/v1/dealer/members/{username}`, remove them with `DELETE /api/v1/dealer/members/{username}`) — plus audit data (`GET /api/v1/audit` and `GET /api/v1/dealer/audit`, AUD-17) and reading or correcting a sold vehicle's payment ledger (`GET` and `DELETE …/payments`, PAY-05). Nobody inside the dealership sets `OWNER` or changes their own role; only the platform admin appoints or replaces an owner. A sales member calling any of these → **403**.

The scored matrix is the permission table in `design/15-Data-Auth-and-Gateway.md` §2.5. Wire values are `OWNER`, `MANAGER`, and `SALES`. All three carry JWT role `Dealer.User`. `Platform.Admin` is outside the dealership and is rule R4, not a fourth tier.

`design/15-Data-Auth-and-Gateway.md` §2.5 also states two facts the grid below keeps as their own actions, because folding them into a neighbouring row would hide a 403:

- A sales member may record a payment (`POST /api/v1/vehicles/{id}/payments`) and may not read or delete the ledger (PAY-05, `design/14-Backend-API-Contract.md` §4).
- `GET /api/v1/members` stays open to every bound member. An owner or a manager receives the full record. A sales member receives `username` and `displayName` only (`design/14-Backend-API-Contract.md` §5.6).

The header inbox is split from `/team` for the same reason. Section 4 states that split.

A denied action returns 403 `FORBIDDEN`. The message depends on which check fails:

| Caller who is refused | Message |
| --- | --- |
| `Platform.Admin`, or a `Dealer.User` with no dealership | "Forbidden" |
| `SALES` on an owner-or-manager route | "Only a dealership owner or manager can do this." |
| `MANAGER` or `SALES` on an owner-only route | "Only the dealership owner can do this." |

### 2.2 Conditions, actions, and rules

This is an extended-entry decision table. One condition, four rules. An **X** means the call is allowed. A blank means 403 `FORBIDDEN` and the action does not run.

**Condition C1 — who is calling**

| | R1 | R2 | R3 | R4 |
| --- | --- | --- | --- | --- |
| C1. Caller | Bound `OWNER` | Bound `MANAGER` | Bound `SALES` | `Platform.Admin`, or a user with no active membership |

**Actions**

| Action | Route | R1 Owner | R2 Manager | R3 Sales | R4 Other |
| --- | --- | --- | --- | --- | --- |
| A1. Use DMS, CRM, leads, ads, reports, work orders, and sell a vehicle | business routes under `/api/v1` for those areas | X | X | X | |
| A2. Open the Team page | `/team` | X | X | | |
| A3. Read buyer-inquiry notifications | `GET /api/v1/dealer/notifications` | X, including `JOIN_REQUEST` rows | X, `JOIN_REQUEST` rows omitted | X, `JOIN_REQUEST` rows omitted | |
| A4. List, approve, or reject join requests | `GET/POST /api/v1/dealer/join-requests/**` | X | | | |
| A5. Read or edit the dealership profile | `GET` and `PATCH /api/v1/dealer/profile` | X | | | |
| A6. Read a record's audit history and the dealership audit log | `GET /api/v1/audit`, `GET /api/v1/dealer/audit` | X | X | | |
| A7. Read the payment ledger or delete a payment | `GET /api/v1/vehicles/{id}/payments`, `DELETE …/payments/{paymentId}` | X | X | | |
| A8. Record a payment on a sold vehicle | `POST /api/v1/vehicles/{id}/payments` | X, response is the ledger | X, response is the ledger | X, response is the one payment item | |
| A9. List members | `GET /api/v1/members` | X, full record | X, full record | X, picker fields only | |
| A10. Set another member's role, edit a member, or remove a member | `PUT/PATCH/DELETE /api/v1/dealer/members/{username}…` | see §2.3 | see §2.3 | | |

A10 is not a single yes. Owner and manager may call the route, and the outcome then depends on the target. That is the second decision table. Sales and R4 are refused before any target is loaded: sales with "Only a dealership owner or manager can do this.", R4 with "Forbidden".

Allowed business behaviour (A1) is the same for the three tiers. Sales is a role name. The sales report still counts every member who sold a vehicle (AUTH-27).

### 2.3 Member-action decision table

This table is the scope inside A10. It is limited-entry. Rules are tried from M1 downward; a dash means that condition is not evaluated. The operation is part of the condition so one table covers role, edit, and remove.

**Conditions**

| Id | Condition | Values |
| --- | --- | --- |
| C1 | Caller is a bound `OWNER` or `MANAGER` (A10's route check already passed) | Y / N |
| C2 | Operation | `SET_ROLE`, `EDIT`, `REMOVE` |
| C3 | On `SET_ROLE`, the caller is changing their own username | Y / N |
| C4 | On `SET_ROLE`, the requested role is `OWNER` | Y / N |
| C5 | Target is an active member of the caller's dealership | Y / N |
| C6 | Target's current role | `OWNER`, `MANAGER`, `SALES` |
| C7 | On `SET_ROLE`, the requested role equals the target's current role | Y / N |

**Actions**

| Id | Action |
| --- | --- |
| P1 | 204. Role changed. Audit `MEMBERSHIP` / `UPDATE` with the previous role. |
| P2 | 204. Same role again: no change and no audit row (`design/14-Backend-API-Contract.md` §5.8, "Same role again is a no-op."). |
| P3 | 204. Name or phone updated. Audit `APP_USER` / `UPDATE`. If nothing changed, 204 and no audit row. |
| P4 | 204. Membership unbound. |
| D1 | 403 `FORBIDDEN`. Sales, or anyone who failed the route check. |
| D2 | 403 `FORBIDDEN`. "You cannot change your own role." |
| D3 | 403 `FORBIDDEN`. "Only the platform admin can appoint a dealership owner." |
| D4 | 404 `NOT_FOUND`. No active member of that username in this dealership. |
| D5 | 403 `FORBIDDEN`. Target is the owner. The message is "Only the platform admin can change the dealership owner." (set role), "The dealership owner's own details are edited in Profile." (edit), or "Only the platform admin can remove the dealership owner." (remove). |
| D6 | 403 `FORBIDDEN`. A manager targeted a manager. The message is "Only the dealership owner can change a manager's role.", "Only the dealership owner can edit a manager's details.", or "Only the dealership owner can remove a manager." |

**Rules**

| Rule | C1 team caller | C2 operation | C3 self | C4 asks `OWNER` | C5 member here | C6 target role | C7 same role | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M1 | N | any | — | — | — | — | — | D1 |
| M2 | Y | `SET_ROLE` | Y | — | — | — | — | D2 |
| M3 | Y | `SET_ROLE` | N | Y | — | — | — | D3 |
| M4 | Y | any | N on set-role | N on set-role | N | — | — | D4 |
| M5 | Y | any | N on set-role | N on set-role | Y | `OWNER` | — | D5 |
| M6 | Y | any | N on set-role | N on set-role | Y | `MANAGER`, caller is `MANAGER` | — | D6 |
| M7 | Y | `SET_ROLE` | N | N | Y | `SALES`, caller is `MANAGER`, requested `MANAGER` | N | P1 |
| M8 | Y | `SET_ROLE` | N | N | Y | `SALES`, caller is `MANAGER`, requested `SALES` | Y | P2 |
| M9 | Y | `SET_ROLE` | N | N | Y | `MANAGER` or `SALES`, caller is `OWNER` | N | P1 |
| M10 | Y | `SET_ROLE` | N | N | Y | `MANAGER` or `SALES`, caller is `OWNER` | Y | P2 |
| M11 | Y | `EDIT` | — | — | Y | `SALES`, or `MANAGER` when the caller is `OWNER` | — | P3 |
| M12 | Y | `REMOVE` | — | — | Y | `SALES`, or `MANAGER` when the caller is `OWNER` | — | P4 |

M3 is evaluated before the target is loaded. Asking for `OWNER`, including for a username that does not exist, returns 403 (D3), not 404 (D4). A test for D4 has to request `MANAGER` or `SALES`.

M2 is evaluated before M3. The owner asking to set their own role to `OWNER` returns D2, not D3.

A manager never reaches M9 or M10. The manager's only successful role change is M7, promoting a sales member to `MANAGER`. M8 is the specified no-op, not a promotion and not a 403.

Nobody in this table can change the owner, demote a manager except the owner (M9 with requested `SALES`), or set `OWNER`. Appointing an owner is `PUT /api/v1/admin/dealers/{id}/members/{username}/role`, which R4's platform admin calls. That route is outside AUTH-27's three tiers (`design/15-Data-Auth-and-Gateway.md` §2.5).

Edit and remove have no self check separate from M5 and M6. The owner is the only owner, so the owner editing or removing their own membership hits M5. A manager editing or removing their own membership hits M6, because their role is `MANAGER`.

### 2.4 Test cases

Dealership A has `owner_a` (`OWNER`), `mgr_a` and `mgr_b` (`MANAGER`), and `sales_a` and `sales_b` (`SALES`). Dealership B has `owner_b` (`OWNER`). `admin` is `Platform.Admin`. Each case is one rule, or one action cell.

| Case | Rule | Caller | Input | Expected result |
| --- | --- | --- | --- | --- |
| DT-01 | R1 A1 | `sales_a` | Open the leads list, `GET /api/v1/leads` | 200. Sales uses business data. |
| DT-02 | R3 A2 | `sales_a` | Open `/team` | Redirected away from Team. The page is owner and manager only. |
| DT-03 | R1 A5, R2 A5 | `mgr_a` | `GET /api/v1/dealer/profile` | 403 `FORBIDDEN`, "Only the dealership owner can do this." |
| DT-04 | R1 A5 | `owner_a` | `GET /api/v1/dealer/profile` | 200. Body is dealership A's profile. |
| DT-05 | R1 A4, R2 A4 | `mgr_a` | `POST /api/v1/dealer/join-requests/{username}/approve` for a pending applicant | 403 `FORBIDDEN`, "Only the dealership owner can do this." |
| DT-06 | R1 A4 | `owner_a` | Approve that same applicant | 204. The new membership is `SALES`. |
| DT-07 | R2 A6, R3 A6 | `sales_a` | `GET /api/v1/dealer/audit` | 403 `FORBIDDEN`, "Only a dealership owner or manager can do this." |
| DT-08 | R2 A6 | `mgr_a` | `GET /api/v1/dealer/audit` | 200. |
| DT-09 | R3 A7, R3 A8 | `sales_a`, sold vehicle in A | `GET /api/v1/vehicles/{id}/payments`, then `POST` a valid payment, then `DELETE` that payment | GET 403. POST 201 with that payment item only, not the ledger. DELETE 403. The payment remains. |
| DT-10 | R1 A7, R1 A8 | `owner_a`, same sold vehicle | `POST` a valid payment, then `DELETE` it | POST 201 with the ledger. DELETE 200 with the ledger, and the payment has left the totals. |
| DT-11 | R3 A9, R1 A9 | `sales_a`, then `owner_a` | `GET /api/v1/members` | Both 200. `sales_a` receives `username` and `displayName` only. `owner_a` also receives `dealerRole`, and `source`, `phone`, and `joinedAt` where they are set. |
| DT-12 | R3 A3, R1 A3 | `sales_a` and `owner_a`, with one unresolved `JOIN_REQUEST` and one `BUYER_INQUIRY` | `GET /api/v1/dealer/notifications` | Both 200. `sales_a` receives the buyer inquiry and does not receive the join request. `owner_a` receives both. |
| DT-13 | R4 | `admin` | `GET /api/v1/dealer/profile` | 403 `FORBIDDEN`, message "Forbidden". |
| DT-14 | M1 | `sales_a` | `PUT /api/v1/dealer/members/sales_b/role` with `dealerRole` `MANAGER` | 403, "Only a dealership owner or manager can do this." `sales_b` stays `SALES`. |
| DT-15 | M2 | `owner_a` | `PUT …/members/owner_a/role` with `MANAGER` | 403, "You cannot change your own role." |
| DT-16 | M3 | `owner_a` | `PUT …/members/sales_a/role` with `OWNER` | 403, "Only the platform admin can appoint a dealership owner." |
| DT-17 | M3 before M4 | `owner_a` | `PUT …/members/no_such_user/role` with `OWNER` | 403 with the appoint-owner message. Not 404. |
| DT-18 | M4 | `owner_a` | `PUT …/members/owner_b/role` with `SALES` | 404 `NOT_FOUND`. `owner_b` is not a member of A. |
| DT-19 | M5 | `mgr_a` | `PUT …/members/owner_a/role` with `SALES` | 403, "Only the platform admin can change the dealership owner." |
| DT-20 | M6 | `mgr_a` | `PUT …/members/mgr_b/role` with `SALES` | 403, "Only the dealership owner can change a manager's role." |
| DT-21 | M7 | `mgr_a` | `PUT …/members/sales_a/role` with `MANAGER` | 204. `sales_a` is `MANAGER`. Audit `MEMBERSHIP` / `UPDATE`. |
| DT-22 | M8 | `mgr_a` | `PUT …/members/sales_b/role` with `SALES` | 204. `sales_b` stays `SALES`. No audit row. |
| DT-23 | M9 | `owner_a` | `PUT …/members/mgr_a/role` with `SALES` | 204. `mgr_a` is `SALES`. Audit `MEMBERSHIP` / `UPDATE`. |
| DT-24 | M10 | `owner_a` | `PUT …/members/sales_b/role` with `SALES`, after DT-22 left `sales_b` as `SALES` | 204. Role unchanged. No audit row. |
| DT-25 | M5 on edit | `owner_a` | `PATCH /api/v1/dealer/members/owner_a` with a new display name | 403, "The dealership owner's own details are edited in Profile." |
| DT-26 | M11 | `mgr_b` | `PATCH /api/v1/dealer/members/sales_b` with a new display name | 204. The name is stored. |
| DT-27 | M6 on edit | `mgr_b` | `PATCH /api/v1/dealer/members/mgr_a` | 403, "Only the dealership owner can edit a manager's details." Requires DT-23 not to have demoted `mgr_a` first; run against a manager who is still `MANAGER`. |
| DT-28 | M12 | `owner_a` | `DELETE /api/v1/dealer/members/sales_a` | 204. `sales_a` is no longer an active member of A. |
| DT-29 | M6 on remove | `mgr_b` | `DELETE /api/v1/dealer/members/mgr_a` while `mgr_a` is `MANAGER` | 403, "Only the dealership owner can remove a manager." |
| DT-30 | M5 on remove | `owner_a` | `DELETE /api/v1/dealer/members/owner_a` | 403, "Only the platform admin can remove the dealership owner." |

DT-21 changes `sales_a` to `MANAGER`. DT-23 changes `mgr_a` to `SALES`. DT-27 and DT-29 need a manager target who is still `MANAGER`, so they use the member the earlier case did not demote, or they are run on a fresh fixture. DT-26 edits `sales_b`, who is still `SALES` after DT-22.

---

## 3. Traceability

| Table or case group | Requirement | Design |
| --- | --- | --- |
| §1.5 every open-to-any-stage cell, including backward and skip | LEAD-03 | `design/21-Feature-Extensions.md` §3; `design/14-Backend-API-Contract.md` §5.5 |
| §1.5 closed rows, I-02, I-03, ST-09 | LEAD-03 | `design/14-Backend-API-Contract.md` §5.5 (`409 LEAD_CLOSED`) |
| §1.5 `LOST` without a reason, I-04, ST-07 | LEAD-03 | `design/14-Backend-API-Contract.md` §5.5 |
| §1.6 reopen targets and G4, I-09, ST-14 | LEAD-03, CR L4, decision D7 | `design/21-Feature-Extensions.md` §3; `design/14-Backend-API-Contract.md` §5.5 |
| §1.6 G5, I-10, I-11, ST-13, ST-15 | LEAD-03 together with the reopen stock rule | `design/14-Backend-API-Contract.md` §5.5 |
| §1.6 G6, I-12, I-14, ST-04, ST-16 | LEAD-03, CR L5 | `design/21-Feature-Extensions.md` §3; `design/14-Backend-API-Contract.md` §5.5 |
| §1.7 create | LEAD-01, LEAD-02, LEAD-04 | `design/21-Feature-Extensions.md` §3; `design/14-Backend-API-Contract.md` §5.5 |
| §1.7 sell, ST-18 | CR L6 | `design/14-Backend-API-Contract.md` §4.5 and §5.5 |
| I-01, ST-08 | optimistic lock on lead writes | `design/14-Backend-API-Contract.md` §5.5 (`409 VERSION_CONFLICT`) |
| ST-19 | LEAD-07 | `design/21-Feature-Extensions.md` §3 |
| §2.2 R1–R3 | AUTH-27 | `design/21-Feature-Extensions.md` §5; `design/15-Data-Auth-and-Gateway.md` §2.5 |
| §2.2 R4, DT-13 | platform admin has no dealership business routes | `design/15-Data-Auth-and-Gateway.md` §2.4; `design/14-Backend-API-Contract.md` §5.8 |
| A4, A5 | AUTH-27 owner only; AUTH-25 for the approve effect | `design/14-Backend-API-Contract.md` §5.7 and §5.8 |
| A6 | AUTH-27, AUD-17 | `design/15-Data-Auth-and-Gateway.md` §2.5 |
| A7, A8 | AUTH-27, PAY-05 | `design/14-Backend-API-Contract.md` §4; `design/15-Data-Auth-and-Gateway.md` §2.5 |
| A9 | AUTH-27 member list | `design/14-Backend-API-Contract.md` §5.6 |
| §2.3 M1–M12 | AUTH-27, AUTH-26 | `design/14-Backend-API-Contract.md` §5.8; `design/15-Data-Auth-and-Gateway.md` §2.5 |

---

## 4. How overlapping sentences were read

Two sentences in the lead rule look broader than the transition table. The table follows the contract paragraph that gives the error codes.

1. LEAD-03 says a lost lead can always be reopened, and a won lead can be reopened while its vehicle was not sold to that customer. `design/14-Backend-API-Contract.md` §5.5 then requires every reopen of a lead that has a vehicle to find that vehicle still `IN_STOCK`, and requires no second open lead for the pair. G5 and G6 are those two checks. A lost lead with no vehicle, or with a vehicle still in stock and no duplicate, does reopen. A lost lead whose vehicle has been sold does not: the result is 400 `WRONG_DEALER_OR_SOLD` (I-11, ST-13). A won lead whose vehicle was sold to that customer is 409 `LEAD_CLOSED` (I-09, ST-14). A won lead whose vehicle was sold to someone else is 400 `WRONG_DEALER_OR_SOLD` (I-10, ST-15), because G4 does not match and G5 does.

2. AUTH-27 and the §2.5 grid say the owner and its managers see `/team` and the inbox, and a sales member does not. The Team page is that rule (A2, DT-02). The notification feed is specified separately in `design/14-Backend-API-Contract.md` §5.7: any member may call `GET /api/v1/dealer/notifications`, and only the owner receives `JOIN_REQUEST` rows. A3 and DT-12 follow §5.7. Join-request approve and reject stay owner-only (A4).
