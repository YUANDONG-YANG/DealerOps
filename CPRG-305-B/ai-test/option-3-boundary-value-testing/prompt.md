# Prompt

Copy the text below as the prompt. It asks only for equivalence classes, boundary values, and one concrete test case per row.

---

You are doing equivalence partitioning and boundary value analysis for four DealerOps fields. Use only the rules in this prompt. Do not invent a numeric limit, a character set, a trim rule, or an HTTP status that is not written here. If a range has only one documented end, say so and do not invent the other end.

For a closed length or numeric range, list the off-by-one points min−1, min, min+1, max−1, max, and max+1. Hold every other input valid so each row has a single cause. For each equivalence class and each boundary point, give one concrete test case with:

- input
- precondition
- expected result: accept or reject, plus the HTTP status written below

Accept means the success status for that operation. Reject means the error status written for that field. "Clamped" is still an accept: the call succeeds and the response echoes the size the server actually used.

## Rules

### 1. Username on self sign-up (AUTH-16)

`POST /api/v1/auth/register` accepts `username` of length 3–64 whose characters are letters, digits, `.`, `_`, and `-`, and which contains at least one letter.

Other register fields are not under test. When they are needed, use a valid `displayName`, a valid `password`, and a valid `email` that is not already registered. A duplicate username is out of scope.

- Accept: **201**
- Reject: **400** `VALIDATION`, and the error names `username` in `fieldErrors` with an English message

Source wording: `design/21-Feature-Extensions.md` (AUTH-16) and `design/14-Backend-API-Contract.md` §1.5.

### 2. Work-order task text (WO-01)

Creating a work order on an `IN_STOCK` vehicle requires `task` of length 1–200. No character set is stated. Assignee and due date are optional and are not under test.

- Operation: `POST /api/v1/vehicles/{vehicleId}/work-orders`
- Accept: **201**
- Reject: **400** `VALIDATION`

Source wording: `design/21-Feature-Extensions.md` (WO-01) and `design/14-Backend-API-Contract.md` §4.7. The column is `VARCHAR(200)` in `design/21-Feature-Extensions.md` §4.

### 3. Completion note and cost when marking a work order DONE (WO-03)

`DONE` requires a completion note of length 1–500 and a cost ≥ 0 in CAD. No maximum cost is stated. No decimal scale is stated for this cost.

`design/14-Backend-API-Contract.md` §4.7 says: `DONE` without a completion note (≤ 500) or a cost ≥ 0 → **400** `VALIDATION`. The stored column is `completion_note VARCHAR(500)` and `cost DECIMAL(12,2) NULL` (`design/21-Feature-Extensions.md` §4). Treat the column types as storage, not as extra API limits, unless a rule above already states the limit.

- Operation: `PATCH /api/v1/work-orders/{id}` with `status` = `DONE` and the current `version`
- Accept: **200**
- Reject: **400** `VALIDATION`

### 4. Lead-list page size (LEAD-05, NFR-01)

This is not a single legal size.

- LEAD-05: the lead list shows 10 per page (NFR-01). The leads screen requests 10 per page.
- NFR-01, as cited there: lists default to 10 per page.
- Pagination in `design/14-Backend-API-Contract.md` §1.1: `page` starts at 0; `size` defaults to 10; the server cap is 100. A `size` ≤ 0 is read as 10. A `size` > 100 is read as 100. The envelope echoes the size actually used. Screens still request 10 per page.

Do not treat a size other than 10 as a reject. Describe what 10 means, and what requesting another size does, using only those sentences.

- Operation: `GET /api/v1/leads?page=0` and the `size` under test (or omit `size`)
- Accept: **200** with envelope `{items, page, size, totalElements}`
- No reject status is stated for `size`

## Output

For each field:

1. Valid equivalence classes and invalid equivalence classes.
2. Boundary values. Use min−1, min, min+1, max−1, max, max+1 where both ends exist.
3. One concrete test case per class and per boundary point: input, precondition, expected accept or reject.

State any point you cannot classify because the rules do not say.
