# Part 4 — Execution results

The course option requires the tests to be run and the results submitted. This file records three
runs, in the order they happened, because the second run is what found the correction in `Part 5`.

Environment: .NET SDK 10.0.401 on macOS (arm64), xUnit 2.9.3, `Microsoft.NET.Test.Sdk` 17.14.1.
Runner project: `runner/Option5.Tests.csproj`. It compiles the raw AI answer from the folder root
unchanged (`<Compile Include="../UsernameValidationTests.cs" />`) and is **not** part of
`backend/dotnet/DealerOps.Core.sln`.

---

## Run 1 — the raw AI answer, exactly as generated

Command, from `runner/`:

```
dotnet test
```

Result:

```
Passed!  - Failed:     0, Passed:    41, Skipped:     0, Total:    41, Duration: 30 ms - Option5.Tests.dll (net10.0)
```

All 41 generated tests pass. This is the result the original reflection predicted and also the result
it warned about: the file asserts against `RegisterUsernameRule`, a helper inside the same file that
hardcodes a copy of the pattern. A green run shows that the copy agrees with itself. It does not
touch `RegisterRequest`, so it cannot fail if the product attribute changes.

## Run 2 — same inputs driven through the real DTO

To close that gap, `runner/RegisterRequestUsernameTests.cs` was added. Its first version validated a
real `RegisterRequest` with `Validator.TryValidateObject`, which is the obvious API for the job and
is the approach the original reflection proposed in its own "what a later run would require" list.

Result:

```
Failed!  - Failed:    38, Passed:    64, Skipped:     0, Total:   102, Duration: 60 ms
```

Every malformed username came back **valid**. A representative failure:

```
Failed Cprg305B.Option5.RegisterRequestUsernameTests.Real_dto_rejects_with_the_register_pattern_message(username: "a@b")
  Error Message:
   Assert.Contains() Failure: Item not found in collection
Collection: []
Not found:  "Use 3-64 letters, digits, dots, dashes or undersco"...
```

`Collection: []` is the finding: `Validator` reported no errors at all for `a@b`, `ab`, `123`, and
`abc!!!`.

### Why

A reflection probe answered it:

```
PROPERTY=[] PARAMETER=[RequiredAttribute|RegularExpressionAttribute]
```

`RegisterRequest` is a positional record. An attribute written on a positional parameter binds to
whichever target its `AttributeUsage` permits, and `ValidationAttribute` permits `Parameter`, so both
attributes bind to the **constructor parameter** and the generated `Username` property carries none.
`Validator.TryValidateObject` walks properties, finds nothing to check, and returns `true`.

This was a defect in the test oracle, not in the product. The proof that the product is unaffected is
in Run 3.

## Run 3 — corrected oracle

`RegisterRequestUsernameTests.cs` was rewritten so the oracle reads the attributes the product
actually declares, off the constructor parameter, and applies them (`ProductRule`). Nothing in the
test file restates the pattern, so a change to the product attribute changes the oracle with it.

Two tests were added to keep the finding from being lost:

- `Attributes_live_on_the_constructor_parameter_not_the_property` asserts the placement directly.
- `Validator_TryValidateObject_does_not_see_the_rule` pins the wrong-oracle behaviour, so the reason
  for the rewrite stays visible instead of living only in this file.

Command and result:

```
dotnet test

Passed!  - Failed:     0, Passed:   106, Skipped:     0, Total:   106, Duration: 56 ms - Option5.Tests.dll (net10.0)
```

106 = the 41 generated tests, unchanged, plus 65 added assertions. The differential test
(`Copied_helper_agrees_with_the_declared_product_attributes`) runs all 44 inputs through both the
copied helper and the product's declared attributes and requires the same verdict and the same
messages. It passes, which is the evidence the generated file's copy is currently faithful — and
unlike Run 1, it would now fail if the product attribute were edited.

A build warning (`MSB3277`) reports an EF Core 9.0.0 / 9.0.7 version conflict pulled in through the
`DealerOps.Core` project reference. It does not affect these tests, which touch only DTO metadata,
and no product file was changed to silence it.

---

## Run 4 — the live API, for comparison

The in-process runs validate attribute metadata. They do not prove that the running service rejects
these usernames, because the request path is JSON deserialization followed by MVC model validation,
not `Validator`. That needed the real endpoint.

Stack: the project's private end-to-end stack (`playwright/scripts/e2e-stack.sh start`), gateway
`http://127.0.0.1:18080`, core `127.0.0.1:18081`, database `dealer_core_e2e`. The shared development
ports 8080, 8081, 8082, and 5174 were not touched.

`POST /api/v1/auth/register`, one request per username, with a valid `displayName`, a fresh unique
`email`, and an 8-character `password`:

| Username | HTTP | `code` | `fieldErrors.username` |
| --- | --- | --- | --- |
| `ab` (len 2) | 400 | `VALIDATION` | Use 3-64 letters, digits, dots, dashes or underscores, with at least one letter. |
| `ab1` (len 3) | 201 | — | — |
| 64 × `a` | 201 | — | — |
| 65 × `a` | 400 | `VALIDATION` | Use 3-64 letters, digits, dots, dashes or underscores, with at least one letter. |
| 64 × `1` | 400 | `VALIDATION` | Use 3-64 letters, digits, dots, dashes or underscores, with at least one letter. |
| 63 × `1` + `Z` | 201 | — | — |
| `a@b` | 400 | `VALIDATION` | Use 3-64 letters, digits, dots, dashes or underscores, with at least one letter. |
| `abc!!!` | 400 | `VALIDATION` | Use 3-64 letters, digits, dots, dashes or underscores, with at least one letter. |
| `José` | 400 | `VALIDATION` | Use 3-64 letters, digits, dots, dashes or underscores, with at least one letter. |
| `.ab` | 201 | — | — |
| `""` | 400 | `VALIDATION` | The Username field is required. |
| `"   "` (3 spaces) | 400 | `VALIDATION` | The Username field is required. |

Each 201 returned `role` `Dealer.User`, matching `AUTH-16` and §1.5.

**ASP.NET Core MVC does read validation attributes from a record's constructor parameters.** Every
accept and reject matches the generated expectations, and the `fieldErrors.username` text is the
attribute's `ErrorMessage` character for character. The Run 2 failures were entirely the oracle's.

This run also supplies what the in-process tests cannot: the HTTP **400** and the `VALIDATION` code
with the `fieldErrors.username` key, which gap 7 of the original reflection listed as untested.
