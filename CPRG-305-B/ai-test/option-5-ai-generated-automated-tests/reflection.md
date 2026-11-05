# Part 3 — Reflection

## Rule checked

The generated file tests one clause of AUTH-16: the username on `POST /api/v1/auth/register`. The design statement is in `design/21-Feature-Extensions.md` (row AUTH-16) and `design/14-Backend-API-Contract.md` §1.5: length 3–64, characters limited to letters, digits, `.`, `_`, and `-`, and at least one letter. The same sentence is repeated in `design/15-Data-Auth-and-Gateway.md` under token issuance, with the reason for the letter: a username must not be readable as a phone number.

The active check is the pair of attributes on `Username` in `backend/dotnet/DealerOps.Core/Dealer/Dto/RegisterRequest.cs`:

- `[Required]`
- `[RegularExpression(@"(?=.*[A-Za-z])[A-Za-z0-9._-]{3,64}", ErrorMessage = "Use 3-64 letters, digits, dots, dashes or underscores, with at least one letter.")]`

`[Required]` rejects null, empty, and whitespace-only strings and formats the default message `The Username field is required.` `RegularExpressionAttribute` skips null and `""`, and for every other string it accepts the value only when the match starts at index 0 and covers the whole string. The pattern literal has no anchors, so a helper that called `Regex.IsMatch` alone would accept `abc!!!` and `!!!abc`. The generated helper applies the full-string check.

## How the assertions line up with the rule

| Design clause | Generated assertion | Result of the comparison |
|---|---|---|
| Length 3–64 | `a` and `ab` rejected; `abc` and a 64-character value accepted; 65 `a` characters rejected | Matches the closed range |
| Letters, digits, `.`, `_`, `-` | `abc`, `ABC`, `ab1`, `a.b`, `a_b`, `a-b`, `.ab`, `_ab`, `-ab`, and `alex.dealer` accepted | Matches the set. A leading `.`, `_`, or `-` is allowed by the class and is not forbidden by the design sentence |
| At least one letter | `123`, `...`, `___`, `---`, `._-`, and 64 digits rejected; 63 digits plus `Z` accepted | Matches. This is what keeps an all-digit username from looking like a phone number |
| The value is the whole username | `abc!!!` and `!!!abc` rejected | Matches the attribute's full-string match |
| Empty username is not acceptable | null and `""` return only the required message | Matches `[Required]`. The pattern attribute itself does not fail these two |
| Characters outside the set | space, padded `abc`, tab, newline, `@`, `+`, `/`, `!` rejected | Matches the class |

The pattern message in the tests is the register message, character for character.

## Gaps

These items are real limits of the generated file. They were identified by reading the design row and the DTO. They were not fixed by adding a product test project.

1. The tests call a copied helper. They do not construct `RegisterRequest` or call `Validator.TryValidateObject`. A later edit to the attribute pattern would leave this file green.
2. The same pattern is also on `CreateMemberRequest.Username` and `UpdatePendingUserRequest.Username`. The member-create message is `Username must be 3-64 characters: letters, digits, dot, underscore or hyphen, with at least one letter.` These tests lock the register wording only.
3. One pattern message covers three failures (length, character set, missing letter). A red test does not say which clause failed. The design row does not require separate messages.
4. The design word is "letters". The class is ASCII `A-Za-z`. `José` is rejected because `é` is outside the class. The tests follow the code.
5. The React register page trims the username before its own anchored regex and before the request (`frontend/react/src/pages/RegisterPage.tsx`). The server attribute does not trim. These tests reject ` abc` and `abc `. A browser user who types those spaces still submits a trimmed value that passes. A client that posts the spaces receives a validation failure.
6. The rest of AUTH-16 is untested: `displayName` length 1–120, password length 8–72, email and/or phone, canonical phone storage, and the 409 codes `USERNAME_TAKEN`, `EMAIL_TAKEN`, and `PHONE_TAKEN` with `fieldErrors`. Uniqueness lives in `NewAccountRules.RequireAvailable`, which needs the database. The username attributes do not check it.
7. The tests stop at the validation messages. They do not assert HTTP **400** `VALIDATION` or the `fieldErrors.username` key described in `design/14-Backend-API-Contract.md` §1.5. That status is produced by the API pipeline after the attributes fail.
8. `AuthService` trims the username only after model validation has succeeded. These tests do not enter `AuthService`.

## Why this file was not added to the product

`UsernameValidationTests.cs` stays in this folder. It was not added under `backend/`, `dealer-platform/`, or `frontend/`.

The active .NET solution, `backend/dotnet/DealerOps.Core.sln`, contains product projects only: `DealerOps.Core`, `DealerOps.Gateway`, `DealerOps.AiService`, and `DealerOps.Logging`. There is no unit-test project to drop an xUnit class into. `frontend/react` has no unit-test script for this rule. `dealer-platform` is the OpenAPI contract, not a test runner.

Course development rules say not to author product tests unless the task is explicitly test work. This option is assignment evidence. The request for option 5 was to write the artifact here, and to leave product source, existing end-to-end tests, design docs, configuration, and git history unchanged.

## What a later run would require

**Superseded.** The run described below was carried out. Results are in
[execution-results.md](execution-results.md) and the changes it forced are in
[corrections.md](corrections.md). Steps 1, 2, and 5 were done as written. Step 3 turned out to be
wrong: `Validator.TryValidateObject` cannot see these attributes at all, because a positional
record binds them to the constructor parameter rather than to the property. That is the main finding
of the run, and the sentence below is kept unedited as the prediction it was.

The original text of this section follows. A later run would need all of the following, and none of
it was done at the time this section was written:

1. A new xUnit project targeting `net10.0`, the framework used by `DealerOps.Core`.
2. A project reference to `backend/dotnet/DealerOps.Core/DealerOps.Core.csproj`, plus the xUnit packages and a test runner. The reference is what lets the tests compile against `RegisterRequest`.
3. Replacement of `RegisterUsernameRule` with `Validator.TryValidateObject` on a `RegisterRequest`. The other constructor arguments have to satisfy their own attributes: a non-blank `displayName` of at most 120 characters, and a `password` of 8–72 characters. Email and phone can be omitted for this check. The "email or phone" rule is enforced later in `NewAccountRules.CanonicalContact`, not by the username attributes.
4. The same accept/reject rows pointed at `CreateMemberRequest` and `UpdatePendingUserRequest` if those copies should stay aligned.
5. `dotnet test` on that project. Adding the project to `DealerOps.Core.sln` is a separate decision. This submission does not add it.

A green run of the copied helper would show that the helper agrees with itself. It would not show that `RegisterRequest` still carries this pattern. Step 3 is the check that closes that gap.
