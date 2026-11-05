# Improved test cases — verified against the running service

`reflection.md` checked the raw AI answer by reading the design documents. That check could not
settle the cases the answer left unclassified, and it could not catch an expected result that reads
correctly but is wrong in practice. This file is the result of **executing** all 40 generated cases
against the running API.

Two of the AI's expected results were wrong. Both are the same mistake, and neither is visible in
the requirement text. Four cases the AI deliberately left unclassified now have answers.

## How the cases were run

Private end-to-end stack, started with `playwright/scripts/e2e-stack.sh start`: gateway
`http://127.0.0.1:18080`, core `127.0.0.1:18081`, database `dealer_core_e2e`. Seeded with
`npx playwright test --project=setup`. The shared development ports 8080, 8081, 8082, and 5174 were
not used, and no shared data was written.

Caller for the authenticated groups: `e2e.staff`, the owner of dealership `E2E Motors`. Work-order
cases ran against a vehicle created for this purpose (`VIN ZZZABCDEFL1234567`, `IN_STOCK`). Each
accept case that changes state used a fresh work order, because a successful `PATCH` moves the
`version` and the next call would fail on `VERSION_CONFLICT` instead of the condition under test.

## Summary

| Group | Cases | Confirmed as generated | Corrected |
| --- | --- | --- | --- |
| Username (`AUTH-16`) | U-01 – U-10 | 10 | 0 |
| Work-order task (`WO-01`) | T-01 – T-06 | 6 | 0, but see C-1 below |
| Completion note (`WO-03`) | N-01 – N-07 | 7 | 0, but see C-2 below |
| Cost (`WO-03`) | C-01 – C-06 | 6 | 0 |
| Page size (`LEAD-05`, `NFR-01`) | P-01 – P-11 | 11 | 0 |

Every numbered case passed as the AI predicted. The two corrections are on rows the AI described in
prose next to the tables rather than numbering, which is exactly where an unexecuted review stops
looking.

---

## Correction 1 — a one-space task is rejected, not accepted

**What the AI wrote.** Under the task table: *"Any string whose length is inside 1–200 is valid,
including a string of spaces. That last reading is only the length rule; the rules never say
non-blank."* `reflection.md` endorsed it: *"A one-space task … is not a fail. A grader who requires
meaningful text is adding a rule."*

**What the service does.**

```
POST /api/v1/vehicles/1/work-orders   {"task":" "}
-> 400 VALIDATION   fieldErrors.task = "The Task field is required."
```

**Why.** `CreateWorkOrderRequest.Task` carries `[Required]`, and `RequiredAttribute` rejects
whitespace-only strings: with `AllowEmptyStrings` left at its default, it tests
`!string.IsNullOrWhiteSpace(value)`. A single space never reaches the `MaxLength(200)` check at all.

**The reasoning that failed.** Both the AI and the review treated "length 1–200" as the whole rule
and concluded that blankness was an invented extra condition. The length range is real, but it is not
the only attribute on the field. The requirement text does not mention `[Required]`; only the DTO
does, and only a run makes the consequence visible.

**Corrected row.**

| Case | Input `task` | Class | Expected |
| --- | --- | --- | --- |
| T-07 (new) | `" "` (one space) | T-I1, not T-V1 | Reject. 400 `VALIDATION`, `fieldErrors.task` = `The Task field is required.` |

T-I1 is therefore "omitted, `null`, `""`, **or whitespace only**", not "length 0".

## Correction 2 — a one-space completion note is rejected, for a different reason

**What the AI wrote.** *"A one-space note has length 1, so under the length rule it is N-V1."*

**What the service does.**

```
PATCH /api/v1/work-orders/{id}   {"status":"DONE","task":"x","version":0,"cost":0,"completionNote":" "}
-> 400 VALIDATION   (no fieldErrors)
```

**Why, and why it is not the same mechanism as Correction 1.** `PatchWorkOrderRequest.CompletionNote`
has only `[MaxLength(500)]` — no `[Required]`, because a note is required only when the status is
`DONE`. That conditional rule lives in the service:
`backend/dotnet/DealerOps.Core/WorkOrder/WorkOrderService.cs:172` applies `TrimToNull(body.CompletionNote)`
and the next line rejects the request when the result is `null`. A single space is trimmed to
nothing, so it is "without a completion note" in the sense `WO-03` means.

The missing `fieldErrors` object is the tell: this 400 is thrown by the service, not produced by
model validation, so no field is named. An assertion written only on `fieldErrors.completionNote`
would fail here even though the status and code are right.

**Corrected row.**

| Case | Input `completionNote` | Class | Expected |
| --- | --- | --- | --- |
| N-08 (new) | `" "` (one space) | N-I1, not N-V1 | Reject. 400 `VALIDATION`, **no** `fieldErrors` key |

N-I1 becomes "omitted, `null`, length 0, or whitespace only".

### What the two corrections have in common

The AI was asked not to invent rules, and it obeyed — correctly, since inventing a non-blank rule
from the requirement text alone would have been a guess. The requirement text simply is not the whole
specification: `[Required]` and a service-level trim both narrow the valid partition, and neither is
written in `design/21-Feature-Extensions.md`. A boundary analysis derived from requirements is a
hypothesis, and these two rows are where the hypothesis was wrong.

---

## Newly classified cases

The AI refused to assign expected results to these, which was the right call from the sources it was
given. The run answers them.

| Case | Input | Result | Note |
| --- | --- | --- | --- |
| P-12 (new) | `size=abc` | 400 `VALIDATION`, `fieldErrors.size` = `The value 'abc' is not valid.` | A non-numeric `size` **is** a reject, the only reject in the page-size group. Model binding fails before the clamp in §1.1 is reached, so the clamp sentences do not apply. |
| P-13 (new) | `size=2.5` | 400 `VALIDATION` | Same mechanism: `size` binds to an integer. |
| C-07 (new) | `cost=1.001` | 200, response echoes `cost` `1.001` | A third decimal is **accepted** for work-order cost. `DECIMAL(12,2)` is storage, and the API does not reject the extra digit, which is what the AI declined to assume either way. Vehicle costs in §4.2 do refuse a third decimal; work-order cost does not share that rule. |
| C-08 (new) | `cost="0"` (JSON string) | 200, stored as `0` | The string is coerced to a number rather than rejected. |
| U-11 (new) | `username=José` | 400 `VALIDATION`, pattern message | Settles the AI's open question about non-ASCII letters: `é` is outside `[A-Za-z0-9._-]`, so a non-ASCII letter does not count as a letter. |

`C-07` deserves one comment. It is an accept, so a suite that treats "money has two decimals" as a
universal rule would score it as a defect. It is not one: nothing in `WO-03` or §4.7 states a scale
for this field. The row records the behaviour, not an endorsement of it.

---

## The page-size disagreement, now settled by execution

`reflection.md` argued against reading `LEAD-05` "10 per page" as "the server rejects every other
size", on the grounds that `design/14-Backend-API-Contract.md` §1.1 describes a clamp and `NFR-01`
says *default*. The run confirms the argument completely.

`GET /api/v1/leads?page=0&size=…`, reading the echoed `size` from the envelope:

| Case | Requested | HTTP | Echoed `size` | Matches prediction |
| --- | --- | --- | --- | --- |
| P-01 | omitted | 200 | 10 | yes |
| P-02 | 10 | 200 | 10 | yes |
| P-03 | 9 | 200 | 9 | yes |
| P-04 | 11 | 200 | 11 | yes |
| P-05 | 0 | 200 | 10 | yes |
| P-06 | −1 | 200 | 10 | yes |
| P-07 | 1 | 200 | 1 | yes |
| P-08 | 2 | 200 | 2 | yes |
| P-09 | 99 | 200 | 99 | yes |
| P-10 | 100 | 200 | 100 | yes |
| P-11 | 101 | 200 | 100 | yes |

P-03 and P-04 are the rows the assignment brief's "fixed at 10" wording would have scored as
failures. They return 200 and echo 9 and 11. Had the brief been followed over the design documents,
two passing behaviours would have been reported as defects.

---

## Final verified case list

Groups unchanged from `ai-response.md` except as marked. All rows below were executed.

### Username (`AUTH-16`) — `POST /api/v1/auth/register`

| Case | Input `username` | Point | Expected | Observed |
| --- | --- | --- | --- | --- |
| U-01 | `a.` (len 2) | min−1 | 400 `VALIDATION`, `fieldErrors.username` | 400, pattern message |
| U-02 | `a.b` (len 3) | min | 201 | 201, `role` `Dealer.User` |
| U-03 | `a.b1` (len 4) | min+1 | 201 | 201 |
| U-04 | `a` + 62 × `1` (len 63) | max−1 | 201 | 201 |
| U-05 | `a` + 63 × `1` (len 64) | max | 201 | 201 |
| U-06 | `a` + 64 × `1` (len 65) | max+1 | 400 `VALIDATION` | 400, pattern message |
| U-07 | `""` | empty | 400 `VALIDATION` | 400, `The Username field is required.` |
| U-08 | `123` | no letter | 400 `VALIDATION` | 400, pattern message |
| U-09 | `a b` | disallowed character | 400 `VALIDATION` | 400, pattern message |
| U-10 | uppercase, e.g. `Bq7` | uppercase letter | 201 | 201 |
| U-11 (new) | `José` | non-ASCII letter | — (was unclassified) | 400, pattern message |

The pattern message is `Use 3-64 letters, digits, dots, dashes or underscores, with at least one
letter.` in every rejection above, character for character.

U-10 needs one note on arranging it. Running it a second time with the same value returns **409**
`USERNAME_TAKEN`, not 201, and a case-different value collides too: username uniqueness is
case-insensitive, because the column collation is `utf8mb4_0900_ai_ci`. Each run of U-10 needs a
username no earlier run used, in any case. This is a precondition the AI's "the username is not
already registered" line covers in spirit but which is easy to break in practice.

### Work-order task (`WO-01`) — `POST /api/v1/vehicles/{vehicleId}/work-orders`

| Case | Input `task` | Point | Expected | Observed |
| --- | --- | --- | --- | --- |
| T-01 | `""` | min−1 | 400 `VALIDATION` | 400, `The Task field is required.` |
| T-02 | 1 × `x` | min | 201 | 201, status `OPEN` |
| T-03 | 2 × `x` | min+1 | 201 | 201 |
| T-04 | 199 × `x` | max−1 | 201 | 201 |
| T-05 | 200 × `x` | max | 201 | 201 |
| T-06 | 201 × `x` | max+1 | 400 `VALIDATION` | 400, `The field Task must be a string or array type with a maximum length of '200'.` |
| T-07 (corrected) | `" "` | whitespace only | **400**, was "accept" | 400, `The Task field is required.` |

### Completion note (`WO-03`) — `PATCH /api/v1/work-orders/{id}` with `status` `DONE`

| Case | Input `completionNote` | Point | Expected | Observed |
| --- | --- | --- | --- | --- |
| N-01 | `""` | min−1 | 400 `VALIDATION` | 400, no `fieldErrors` |
| N-02 | 1 × `n` | min | 200 | 200, status `DONE` |
| N-03 | 2 × `n` | min+1 | 200 | 200 |
| N-04 | 499 × `n` | max−1 | 200 | 200 |
| N-05 | 500 × `n` | max | 200 | 200 |
| N-06 | 501 × `n` | max+1 | 400 `VALIDATION` | 400, `The field CompletionNote must be a string or array type with a maximum length of '500'.` |
| N-07 | key omitted | absent | 400 `VALIDATION` | 400, no `fieldErrors` |
| N-08 (corrected) | `" "` | whitespace only | **400**, was "accept" | 400, no `fieldErrors` |

Note the split: N-06 names the field because `MaxLength` is a model attribute, while N-01, N-07, and
N-08 do not because the service raises them. An assertion on `fieldErrors.completionNote` holds for
N-06 only.

### Cost (`WO-03`) — same request

| Case | Input `cost` | Point | Expected | Observed |
| --- | --- | --- | --- | --- |
| C-01 | `-0.01` | min−1 | 400 `VALIDATION` | 400, `The field Cost must be between 0 and 1.7976931348623157E+308.` |
| C-02 | `-1` | same invalid class | 400 `VALIDATION` | 400, same message |
| C-03 | `0` | min | 200 | 200 |
| C-04 | `0.01` | min+1 at a hundredth | 200 | 200, echoed `0.01` |
| C-05 | `1` | interior | 200 | 200, echoed `1` |
| C-06 | `null` | absent with `DONE` | 400 `VALIDATION` | 400, no `fieldErrors` |
| C-07 (new) | `1.001` | third decimal | — (was unclassified) | 200, echoed `1.001` |
| C-08 (new) | `"0"` | numeric string | — (was unclassified) | 200, stored `0` |

The C-01 and C-02 message is worth one line of comment: `[Range(0, double.MaxValue)]` renders
`1.7976931348623157E+308` into a message shown to an API client. The requirement states only
"cost ≥ 0" and no maximum, so this is not a wrong expected result — but any test asserting the exact
message text is pinned to a floating-point constant rather than to a business rule.

### Page size (`LEAD-05`, `NFR-01`) — `GET /api/v1/leads`

P-01 to P-11 as tabled above, plus the two new rejects P-12 (`size=abc`) and P-13 (`size=2.5`).

---

## What is still not covered

- `AUTH-16` uniqueness (**409** `USERNAME_TAKEN`, `EMAIL_TAKEN`, `PHONE_TAKEN`) stays out of scope
  as the prompt set it, although U-10's arrangement note shows it interfering with a boundary run.
- Work-order status transitions (`WO-02`) and the sell interaction (`WO-05`) are other requirements
  and still have no rows here.
- A cost above `9999999999.99`, where the `DECIMAL(12,2)` column would overflow, is untested. The
  API accepts a third decimal (C-07), so the column's own limit is a separate question and inventing
  an HTTP status for it would repeat the mistake this file corrects.
