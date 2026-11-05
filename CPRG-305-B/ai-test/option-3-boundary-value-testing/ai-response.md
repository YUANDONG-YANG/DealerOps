# Raw AI answer

Equivalence classes and boundary values for the four fields in the prompt. Each row changes one input. Accept and reject use the statuses in the prompt.

Length strings are defined as follows.

- `U(n)` is `a` followed by `n − 1` digits `1`. Length `n`. One letter. Allowed characters only.
- `T(n)` is the character `x` repeated `n` times. Length `n`.
- `N(n)` is the character `n` repeated `n` times. Length `n`.

## 1. Username (AUTH-16)

Closed length range 3–64, plus two non-length conditions: allowed characters, and at least one letter.

### Equivalence classes

| Class | Partition | Rule |
|---|---|---|
| U-V1 | Valid | Length 3–64, only letters, digits, `.`, `_`, `-`, and at least one letter |
| U-I1 | Invalid | Length 0–2, otherwise matching U-V1 |
| U-I2 | Invalid | Length 65 or more, otherwise matching U-V1 |
| U-I3 | Invalid | Length 3–64, at least one letter, one or more characters outside the allowed set |
| U-I4 | Invalid | Length 3–64, only digits, `.`, `_`, and `-`, and no letter |

Missing `username` and `""` are the empty end of U-I1. They are the same reject (400 `VALIDATION` naming `username`). Duplicate username (409) is out of scope.

Not classified, because the rules do not say:

- Whether a letter outside A–Z / a–z counts as a letter.
- Whether the server trims spaces before it measures length. A space is a disallowed character, so a padded value fails U-I3 without a trim rule.

### Boundary values (length, single fault)

| Point | Length | Representative | Class |
|---|---|---|---|
| min−1 | 2 | `a.` | U-I1 |
| min | 3 | `a.b` | U-V1 |
| min+1 | 4 | `a.b1` | U-V1 |
| max−1 | 63 | `U(63)` | U-V1 |
| max | 64 | `U(64)` | U-V1 |
| max+1 | 65 | `U(65)` | U-I2 |

Letter count has a lower boundary only: 0 letters is invalid (U-I4) and 1 letter is valid. There is no documented maximum number of letters other than the length maximum.

### Concrete test cases

Precondition for every username row: anonymous `POST /api/v1/auth/register`. `displayName` is `Alex Dealer`. `password` is `temporary-pass-1`. `email` is a new valid address not used by another row. `phone` is omitted. The username is not already registered.

| Case | Input `username` | Class / point | Expected |
|---|---|---|---|
| U-01 | `a.` (length 2) | U-I1, min−1 | Reject. 400 `VALIDATION`. `fieldErrors.username` has an English message |
| U-02 | `a.b` (length 3) | U-V1, min | Accept. 201 |
| U-03 | `a.b1` (length 4) | U-V1, min+1 | Accept. 201 |
| U-04 | `U(63)` | U-V1, max−1 | Accept. 201 |
| U-05 | `U(64)` | U-V1, max | Accept. 201 |
| U-06 | `U(65)` | U-I2, max+1 | Reject. 400 `VALIDATION`. `fieldErrors.username` |
| U-07 | `""` | U-I1, empty | Reject. 400 `VALIDATION`. `fieldErrors.username` |
| U-08 | `123` | U-I4, no letter | Reject. 400 `VALIDATION`. `fieldErrors.username` |
| U-09 | `a b` | U-I3, disallowed character | Reject. 400 `VALIDATION`. `fieldErrors.username` |
| U-10 | `Ab1` | U-V1, uppercase letter | Accept. 201 |

`Ab1` is included because the rule says "letters" and gives no case restriction. `a@b` is the same class as U-09 (U-I3); U-09 is the scored row.

## 2. Work-order task (WO-01)

Closed length range 1–200. No character class is stated, so content is not a separate partition. Any string whose length is inside 1–200 is valid, including a string of spaces. That last reading is only the length rule; the rules never say "non-blank".

### Equivalence classes

| Class | Partition | Rule |
|---|---|---|
| T-V1 | Valid | Length 1–200 |
| T-I1 | Invalid | Length 0, including omitted `task` and `""` |
| T-I2 | Invalid | Length 201 or more |

### Boundary values

| Point | Length | Input | Class |
|---|---|---|---|
| min−1 | 0 | `""` | T-I1 |
| min | 1 | `T(1)` = `x` | T-V1 |
| min+1 | 2 | `T(2)` = `xx` | T-V1 |
| max−1 | 199 | `T(199)` | T-V1 |
| max | 200 | `T(200)` | T-V1 |
| max+1 | 201 | `T(201)` | T-I2 |

### Concrete test cases

Precondition: the caller is a `Dealer.User` with an active membership. `{vehicleId}` is an `IN_STOCK` vehicle of that dealership. The body omits `assigneeUsername` and `dueOn`. No other field is invalid.

| Case | Input `task` | Point | Expected |
|---|---|---|---|
| T-01 | `""` | min−1 | Reject. 400 `VALIDATION` |
| T-02 | `x` | min | Accept. 201 |
| T-03 | `xx` | min+1 | Accept. 201 |
| T-04 | `T(199)` | max−1 | Accept. 201 |
| T-05 | `T(200)` | max | Accept. 201 |
| T-06 | `T(201)` | max+1 | Reject. 400 `VALIDATION` |

Not classified: a trim rule. The rules do not say `task` is trimmed, so leading and trailing spaces count toward length.

## 3. Completion note (WO-03)

Closed length range 1–500. Cost is held at the valid value `0` so the note is the only cause. Omitted note and `""` are "without a completion note".

### Equivalence classes

| Class | Partition | Rule |
|---|---|---|
| N-V1 | Valid | Length 1–500 |
| N-I1 | Invalid | Omitted, null, or length 0 |
| N-I2 | Invalid | Length 501 or more |

### Boundary values

| Point | Length | Input | Class |
|---|---|---|---|
| min−1 | 0 | `""` | N-I1 |
| min | 1 | `N(1)` = `n` | N-V1 |
| min+1 | 2 | `N(2)` = `nn` | N-V1 |
| max−1 | 499 | `N(499)` | N-V1 |
| max | 500 | `N(500)` | N-V1 |
| max+1 | 501 | `N(501)` | N-I2 |

### Concrete test cases

Precondition: the caller is a `Dealer.User` with an active membership. The work order belongs to that dealership, is `OPEN`, and is on an `IN_STOCK` vehicle. `PATCH /api/v1/work-orders/{id}` sends the current `version`, `status` = `DONE`, and `cost` = `0`.

| Case | Input `completionNote` | Point | Expected |
|---|---|---|---|
| N-01 | `""` | min−1 | Reject. 400 `VALIDATION` |
| N-02 | `n` | min | Accept. 200 |
| N-03 | `nn` | min+1 | Accept. 200 |
| N-04 | `N(499)` | max−1 | Accept. 200 |
| N-05 | `N(500)` | max | Accept. 200 |
| N-06 | `N(501)` | max+1 | Reject. 400 `VALIDATION` |
| N-07 | key omitted | N-I1, absent | Reject. 400 `VALIDATION` |

A one-space note has length 1, so under the length rule it is N-V1. The rules do not add a "non-blank" condition. No separate expected result is assigned to "meaningful text".

## 4. Cost (WO-03)

Numeric range with one documented end: cost ≥ 0. The note is held at `Done` (length 4, inside 1–500).

There is no documented maximum, so max−1, max, and max+1 are not listed. `DECIMAL(12,2)` is storage only, as the prompt says, and is not turned into an API ceiling. No rule states that a third decimal is rejected for this field.

The step below and above 0 is not stated. Two negative values are the same invalid class. `0` is the on-point. `0.01` and `1` are both inside the valid class; `0.01` is used as min+1 only as the smallest positive hundredth, and that step is not written in WO-03.

### Equivalence classes

| Class | Partition | Rule |
|---|---|---|
| C-V1 | Valid | cost ≥ 0, present as a JSON number |
| C-I1 | Invalid | cost &lt; 0 |
| C-I2 | Invalid | cost omitted or null when status is `DONE` |

### Boundary values

| Point | Value | Class |
|---|---|---|
| min−1 | `-0.01` (same class as `-1`) | C-I1 |
| min | `0` | C-V1 |
| min+1 | `0.01` | C-V1 |
| max−1, max, max+1 | not applicable | no documented maximum |

### Concrete test cases

Precondition: same caller, work order, and vehicle as the note cases. `status` = `DONE`, current `version`, `completionNote` = `Done`.

| Case | Input `cost` | Point | Expected |
|---|---|---|---|
| C-01 | `-0.01` | min−1 | Reject. 400 `VALIDATION` |
| C-02 | `-1` | C-I1, same invalid class, not a second boundary | Reject. 400 `VALIDATION` |
| C-03 | `0` | min | Accept. 200 |
| C-04 | `0.01` | min+1 at a hundredth | Accept. 200 |
| C-05 | `1` | C-V1 interior | Accept. 200 |
| C-06 | `null` | C-I2 | Reject. 400 `VALIDATION` |

Not classified: a cost above `9999999999.99`, a third decimal such as `1.001`, and a numeric string such as `"0"`. The rules used here do not say what the API does with them.

## 5. Lead-list page size (LEAD-05, NFR-01)

`10` is the default and the size the leads screen requests. It is not the only size the server accepts.

From the pagination sentences:

- Omitted `size` is used as 10.
- `size` ≤ 0 is used as 10.
- `size` from 1 through 100 is used as requested.
- `size` > 100 is used as 100.
- The call stays successful. The envelope's `size` is the value actually used.
- No sentence states a 400 for `size`.

### Equivalence classes

| Class | Partition | Requested `size` | Effective `size` | Result |
|---|---|---|---|---|
| P-V1 | Valid, default | omitted | 10 | Accept |
| P-V2 | Valid, clamped up to the default | ≤ 0 | 10 | Accept |
| P-V3 | Valid, used as requested | 1 through 100 | the requested size | Accept |
| P-V4 | Valid, clamped down to the cap | > 100 | 100 | Accept |

There is no invalid class and no reject row. A size other than 10 is still an accept.

What 10 means:

- It is the value used when the client omits `size` (NFR-01, "lists default to 10 per page").
- It is the value the leads screen requests (LEAD-05, "10 per page").
- It is one ordinary point inside 1–100, not a pass/fail boundary.

### Boundary values

Unclamped interval 1–100:

| Point | Requested `size` | Effective `size` | Class |
|---|---|---|---|
| min−1 | `0` | 10 | P-V2 |
| min | `1` | 1 | P-V3 |
| min+1 | `2` | 2 | P-V3 |
| max−1 | `99` | 99 | P-V3 |
| max | `100` | 100 | P-V3 |
| max+1 | `101` | 100 | P-V4 |

Points around the nominal 10, all inside P-V3 except the omitted default:

| Point | Requested `size` | Effective `size` | Class |
|---|---|---|---|
| default | omitted | 10 | P-V1 |
| below nominal | `9` | 9 | P-V3 |
| nominal | `10` | 10 | P-V3 |
| above nominal | `11` | 11 | P-V3 |
| below the ≤ 0 clamp | `-1` | 10 | P-V2 |

### Concrete test cases

Precondition: the caller is a `Dealer.User` with an active membership. `GET /api/v1/leads?page=0` with no other filters. The observable is HTTP status and the echoed `size`. `items.length` is `min(effective size, totalElements)`. An empty dealership still echoes `size`; it does not turn the call into a reject.

| Case | Input | Point | Expected |
|---|---|---|---|
| P-01 | `size` omitted | default 10 | Accept. 200. `page` is 0. `size` is 10 |
| P-02 | `size=10` | nominal 10 | Accept. 200. `size` is 10 |
| P-03 | `size=9` | below nominal | Accept. 200. `size` is 9 |
| P-04 | `size=11` | above nominal | Accept. 200. `size` is 11 |
| P-05 | `size=0` | min−1 of 1–100 | Accept. 200. `size` is 10 |
| P-06 | `size=-1` | ≤ 0, same class as 0 | Accept. 200. `size` is 10 |
| P-07 | `size=1` | min of 1–100 | Accept. 200. `size` is 1 |
| P-08 | `size=2` | min+1 | Accept. 200. `size` is 2 |
| P-09 | `size=99` | max−1 | Accept. 200. `size` is 99 |
| P-10 | `size=100` | max | Accept. 200. `size` is 100 |
| P-11 | `size=101` | max+1 | Accept. 200. `size` is 100 |

Not classified: a non-numeric `size`, a fractional `size`, and which status would be returned for those. The rules do not say.
