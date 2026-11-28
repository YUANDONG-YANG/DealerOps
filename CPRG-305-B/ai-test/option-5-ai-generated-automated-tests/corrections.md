# Part 5 — Corrections and added scenarios

The course option asks for the final tests, the execution results, and an explanation of the
corrections. The runs are in [execution-results.md](execution-results.md). This file is the
explanation.

Nothing in the raw AI answer (`UsernameValidationTests.cs`) was edited. It is Part 2 evidence and is
compiled unchanged. Every correction below is an addition in `runner/`.

---

## Correction 1 — the generated tests could not fail

**What the AI produced.** 41 tests, all asserting against `RegisterUsernameRule`, a helper declared
in the same file that hardcodes a copy of the product's regular expression and both message strings.

**What the run showed.** All 41 passed (Run 1). That is a true statement about the helper and tells
us nothing about `RegisterRequest`. Deleting the attributes from the product DTO would leave this
file green, which makes it a tautology rather than a regression test.

**The correction.** `runner/RegisterRequestUsernameTests.cs` adds a differential test. For 44 inputs
it compares the copied helper against the attributes the product actually declares, read by
reflection off the constructor parameter, and requires the same verdict and the same message text.
The test file now holds no copy of the pattern, so if the product rule changes, the oracle changes
and the comparison fails.

This is the correction that matters. The rest follow from making it.

## Correction 2 — the obvious oracle was the wrong oracle

**What was tried.** The original reflection's own plan, step 3: build a real `RegisterRequest` and
validate it with `Validator.TryValidateObject`.

**What the run showed.** 38 failures, every one of the form `Collection: []` — `Validator` reported
*no errors* for `ab`, `123`, `a@b`, and `abc!!!` (Run 2).

**Why.** A reflection probe returned:

```
PROPERTY=[] PARAMETER=[RequiredAttribute|RegularExpressionAttribute]
```

`RegisterRequest` is a positional record. `ValidationAttribute` allows `AttributeTargets.Parameter`,
so an attribute written on a positional parameter binds to the parameter and the generated property
carries none. `Validator` walks properties. It had nothing to validate.

**The correction.** The oracle reads the attributes from the constructor parameter and applies them
itself (`ProductRule` in `runner/RegisterRequestUsernameTests.cs`). Two tests keep the finding from
being lost: `Attributes_live_on_the_constructor_parameter_not_the_property` asserts the placement,
and `Validator_TryValidateObject_does_not_see_the_rule` pins the wrong-oracle behaviour so a future
reader does not repeat the mistake.

**This was not a product defect**, and it would have been easy to report as one. Run 4 is the
disproof: the live endpoint rejects every one of those usernames with **400** `VALIDATION`. MVC's
model metadata does read record constructor parameters; `Validator` is simply a different code path.
Verifying before reporting is the point of this correction.

## Correction 3 — one real disagreement between the AI's answer and the running service

**What the AI produced.** The prompt and the generated file both state that a whitespace-only
username produces *two* messages, the required message and the pattern message, required first.

**What the run showed.** At the attribute level the AI is right: Run 3's differential test confirms
both the copied helper and the product's declared attributes return two messages for `"   "`.

At the API level it is wrong. Run 4:

```
"   "  ->  400 VALIDATION  fieldErrors.username = "The Username field is required."
```

One message, not two. The response envelope keeps a single message per field, so the second one is
never visible to a client.

**The correction.** Recorded rather than "fixed", because both observations are correct at their own
level. The lesson is about the boundary a test chooses: an assertion written against attribute
metadata cannot predict what `fieldErrors` contains, and a test written against `fieldErrors` cannot
see that a second attribute also failed. The original reflection's gap 7 named this boundary; Run 4
is what made the consequence concrete.

## Scenarios added

Beyond the differential test, these inputs are in the added file and were absent from the AI's set:

| Input | Why it was added |
| --- | --- |
| `ÄBC` | The AI tested `José`, a non-ASCII letter in the middle. A non-ASCII letter as the *only* letter is the sharper case: it decides whether "contains at least one letter" means ASCII. It rejects. |
| `a b` (non-breaking space) | `[Required]` uses `IsNullOrWhiteSpace`, which treats U+00A0 as whitespace, while the character class does not. The two attributes disagree about what whitespace is. |
| `a​b` (zero-width space) | Invisible character inside an otherwise legal username. Rejects, but for a reason no reviewer would see by reading. |
| `ab\r` | The AI tested `\t` and `\n` but not a bare carriage return. |
| 63 × `1` + `Z` | The AI's set proved 64 digits reject. This is the adjacent accept: the same length with exactly one letter. Together they isolate the letter clause from the length clause. |
| 200 × `a` | Far past the maximum, to show the pattern fails on length alone rather than at some internal regex limit. |
| `CreateMemberRequest.Username` | Gap 2 of the original reflection: the same shape rule, different wording. `Register_and_member_create_share_the_shape_but_not_the_message` asserts both reject `a@b` and that the two messages differ, so neither copy can drift unnoticed. |
| 12 live HTTP requests | Gap 7: the **400** status, the `VALIDATION` code, and the `fieldErrors.username` key, none of which in-process attribute tests can reach. |

## What is still not covered

The gaps the original reflection listed under items 2, 4, 5, 6, and 8 are unchanged, except where a
row above names them. In particular, uniqueness (`USERNAME_TAKEN`) still needs the database, and
`AuthService` trimming still happens after model validation and is not entered by these tests. The
`MSB3277` EF Core version-conflict warning from the `DealerOps.Core` project reference is unresolved
and was deliberately not silenced, because doing so would mean editing product files for coursework.
