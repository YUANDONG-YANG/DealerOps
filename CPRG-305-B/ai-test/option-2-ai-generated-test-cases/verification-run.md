# Verification run — one expected result is wrong

`reflection.md` and `improved-test-cases.md` were produced by reading: the generated cases were
compared with `AUTH-16`, `AUTH-17`, the §1.4–§1.5 contract sentences, and the two Playwright specs.
That comparison caught several gaps, but it could not catch an expected result that follows correctly
from the source code and is still wrong at runtime.

A subset of the login cases was afterwards executed against the running API. One expected result
failed, and the improved catalog had carried the same error forward.

## How it was run

Private end-to-end stack (`playwright/scripts/e2e-stack.sh start`): gateway
`http://127.0.0.1:18080`, core `127.0.0.1:18081`, database `dealer_core_e2e`, seeded with
`npx playwright test --project=setup`. The shared development ports were not used.

## The failure

`AI-L-05` in `ai-response.md` expects:

> `Pat` and A's password → **401** `UNAUTHORIZED`, message `Invalid sign-in name or password`.
> Username match is exact, the value has no `@`, and it is not a phone.

`improved-test-cases.md` row `L-03 (was AI-L-04, AI-L-05)` repeats it: *"`Pat` → **401**
`UNAUTHORIZED`"*.

Observed, registering one account and then signing in with three spellings of its username:

| Request | Observed |
| --- | --- |
| `POST /auth/register` `username` `CaseProbeX` | **201**, `role` `Dealer.User` |
| `POST /auth/register` `username` `caseprobex` | **409** `USERNAME_TAKEN`, `That username is already taken.` |
| `POST /auth/login` `identifier` `CaseProbeX` | **200**, `role` `Dealer.User` |
| `POST /auth/login` `identifier` `caseprobex` | **200**, `role` `Dealer.User` |
| `POST /auth/login` `identifier` `CASEPROBEX` | **200**, `role` `Dealer.User` |

Username sign-in is **case-insensitive**, and so is username uniqueness. The expected **401** is
wrong, and `AI-L-05` is not a distinct equivalence class from `AI-L-04` at all — both select the same
account.

A second observation came from the same mechanism while running the boundary cases for option 3:
registering `Ab1` returned **409** `USERNAME_TAKEN` because an earlier case had registered `ab1`.

## Why both the AI and the review got it wrong

`AuthService` resolves a username with an ordinary equality comparison:

```csharp
var byUsername = _db.AppUsers.FirstOrDefault(u => u.Username == identifier);
```

Read as C#, `==` on `string` is case-sensitive, which is exactly what "username match is exact"
describes. But this expression is not executed in C#. LINQ translates it into SQL, and the comparison
is performed by MySQL under the column's collation:

```
mysql> SELECT COLUMN_NAME, COLLATION_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA='dealer_core_e2e' AND TABLE_NAME='app_user';

username   utf8mb4_0900_ai_ci
email      utf8mb4_0900_ai_ci
```

`_ci` is case-insensitive (and `_ai` accent-insensitive). The comparison therefore ignores case, and
the emails stored lower-case by `LoginIdentifiers` are being normalised into a column that would have
matched case-insensitively anyway.

This is the whole lesson of the run. The behaviour is not stated in `AUTH-17`, not stated in §1.4,
and contradicted by a plain reading of the only line of code that implements it. No amount of
re-reading the sources would have found it, because the sources do not contain it: it lives in the
schema. Two reviewers reading carefully both concluded 401.

## Corrected rows

| Case | Was | Is | Requirement |
| --- | --- | --- | --- |
| `L-03` / `AI-L-05` | `Pat` → **401** `UNAUTHORIZED`, "username match is exact" | `Pat` → **200**, account A. Username resolution ignores case. | `AUTH-17`, §1.4 |
| `L-03` partition note | `Pat` is a separate invalid class | Not a separate class. Any case variant of A's username is the same valid class as `AI-L-04`. | `AUTH-17` |
| new `R-34` | — | Registering a username that differs from an existing one only by case → **409** `USERNAME_TAKEN`, `fieldErrors.username`. | `AUTH-16` |
| new `L-15` | — | Sign in with the username upper-cased throughout → **200**, the same account. | `AUTH-17` |

`R-34` is the more valuable of the two additions: it is a uniqueness rule no document states, and a
suite that generates usernames by changing case would produce intermittent 409s that look like test
pollution rather than correct behaviour.

## What this does not change

The rest of the generated catalog held up. In particular the parse-order cases (`AI-L-03`, `AI-L-04`,
`AI-L-08`), the three 409 codes with their precedence, the password length partitions, and the shared
display-name case were all consistent with the contract, and nothing in this run contradicted them.
Only the subset of login cases above was executed; the registration boundary rows were executed
separately as part of option 3 and are tabled in
`option-3-boundary-value-testing/improved-test-cases.md`.

The accent-insensitive half of the collation (`_ai`) was **not** tested. It would matter for email
uniqueness rather than usernames, since the username character class is ASCII-only. Whether two
addresses differing only by an accent collide is therefore an open question, not a finding.
