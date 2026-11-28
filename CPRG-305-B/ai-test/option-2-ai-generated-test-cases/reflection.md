# Reflection

The generated catalog in `ai-response.md` was checked against the written rules, then against the existing Playwright specs. No product test was run or edited. The improved catalog is `improved-test-cases.md`.

## Sources

Requirement IDs used here are only IDs that already appear in the repo:

- `AUTH-16` and `AUTH-17` in `design/21-Feature-Extensions.md` §5
- Register and login behavior in `design/14-Backend-API-Contract.md` §1.4 and §1.5
- The same sign-in rules in `design/15-Data-Auth-and-Gateway.md` §8.3
- `AUTH-18` in `design/21-Feature-Extensions.md` §5 (unbound account)
- `EXT-05` and `EXT-07` in `design/16-Acceptance-and-Test.md`
- `UI-01` through `UI-04` in `requirements/analysis/06-Pages-and-Acceptance.md`

Oracle files, read only:

- `playwright/tests/auth.spec.ts` — 7 `test()` cases
- `playwright/tests/ui/register-landing.spec.ts` — 19 `test()` cases

Together that is 26 cases. A count of 19 matches the second file alone.

## What the generated set matches

It follows `AUTH-16` and `AUTH-17`, and the §1.4–§1.5 sentences that were in the prompt.

- Valid registration is split into email only, phone only, and both (`AI-R-01`–`AI-R-03`). That is the “at least one of email or phone, both allowed” rule.
- Username length 2 / 3 / 64 / 65, the allowed set `.` `_` `-`, a digit-only name, a symbol-only name, and a disallowed character are all present (`AI-R-06`, `AI-R-08`–`AI-R-11`, `AI-R-22`–`AI-R-25`).
- A ten-digit number with dashes or brackets is stored as `+1` plus the digits (`AI-R-04`, `AI-R-05`). Login accepts the `+1` form, the formatted form, and the bare ten digits (`AI-L-06`–`AI-L-08`).
- The three 409 codes are separate (`AI-R-29`–`AI-R-31`). Email uses a different case. Phone uses a formatted equivalent of the canonical value.
- When several fields are taken, the top-level code is the first of `USERNAME_TAKEN`, `EMAIL_TAKEN`, `PHONE_TAKEN`, and `fieldErrors` lists each taken field (`AI-R-32`, `AI-R-33`).
- Parse order is shown with three accounts: a value that contains `@` selects the email account even when another account’s username is the local part (`AI-L-03`); a value with no `@` selects the exact username (`AI-L-04`); a different case does not (`AI-L-05`); a ten-digit value falls through to phone only after the username lookup (`AI-L-08`).
- The older stored form `+` plus ten digits still logs in (`AI-L-09`).
- Wrong password, unknown identifier, and inactive account share one **401** message (`AI-L-10`–`AI-L-12`). Blank identifier and blank password are **400** (`AI-L-13`, `AI-L-14`).
- Password is length 8–72 only. `AI-R-01` expects **201** for eight letters and does not demand a digit or symbol.
- The shared display name is **201** (`AI-R-07`), which matches “the full name is not unique”.
- The 11-digit number with no `+` is left unspecified. That matches the instruction not to guess. See the disagreement with `design/15` below.

## What it misses

Against `AUTH-16` / `AUTH-17` / §1.4 / §1.5, the holes are small:

- It never checks that a register body which also sends `role` or `dealerId` still creates an unbound `Dealer.User`. §1.5 states that result. §1.3 says the client `dealerId` is ignored. The generated cases only show the happy-path body.
- It records “no dealership” on the **201** body and does not call a business URL. `AUTH-18` and `EXT-05` say that call returns **403**.
- It does not say how a suite would insert account D. Current registration stores ten digits as `+1…`, so `AI-L-09` cannot be arranged through `POST /api/v1/auth/register`.

Against the Playwright specs, most cases are a different layer or a different feature. The generated set does not replace them.

`playwright/tests/auth.spec.ts` (7):

| Spec case | Relation to the generated set |
|---|---|
| Admin signs in and lands on `/admin` | `UI-02` role landing. The generated cases stop at HTTP **200**. |
| Staff signs in and lands on `/dms` | Same. The identifier used is the staff username, which is the class in `AI-L-04`, without the page assertion. |
| Wrong password stays on `/login` | Same condition as `AI-L-10`, different oracle. The spec expects the visible text `Invalid email, sign-in name or password.` §1.4, `design/13-Frontend-Engineering.md`, and `EXT-07` use `Invalid sign-in name or password`. |
| Empty form is rejected in the browser | Client rule. The spec expects `Enter your email, username or phone number and password.` and does not assert HTTP **400**. `AI-L-13` and `AI-L-14` are the API blanks. |
| Anonymous `/dms` returns to sign-in, then back to `/dms` | `UI-04` plus a return path. Not an identifier rule. |
| Staff opening `/admin` is sent to `/dms` | Role guard. Not `AUTH-17`. |
| Admin opening a dealer page is sent to `/admin` | Role guard. Not `AUTH-17`. |

`playwright/tests/ui/register-landing.spec.ts` (19). Nine are the landing page, VIN decode, or signed-in home routing. Their titles are `UI-01`, `UI-02`, `CR-009`, `CR-063`, `CR-064`, and `VIN-04`. None of those titles are `AUTH-16` or `AUTH-17`. The generated catalog correctly has no cases for them.

The ten `register` cases:

| Spec case | Relation to the generated set |
|---|---|
| Titled `AUTH-15` / `UI-03`: sign-up lands on the no-access screen, then username and phone login, `GET /api/v1/me` has no dealership, vehicle list is **403** `FORBIDDEN` | Overlaps `AI-R-01` (**201**, `Dealer.User`) and `AI-L-04` / `AI-L-06` (login by username and phone). The screen copy, `/dms` URL with the no-access heading, and **403** are `AUTH-18` / `UI-03` / `EXT-05`. The generated set does not include them. The title `AUTH-15` is not the id in `design/21`. See the disagreements. |
| Titled `AUTH-15`: body `role` `Platform.Admin` and `dealerId` still returns **201** `Dealer.User` and cannot call the admin dealer list | Missing from the generated set. Behavior agrees with §1.5 and §1.3. |
| `UI-03` on `/crm` and `/profile` until approved | Page rule. Not in the generated set. |
| `UI-02` / `UI-03`: a signed-in unbound user opening `/` sees no-access, not the marketing page | Page rule. Not in the generated set. |
| `UI-04`: anonymous `/profile` redirects to sign-in | Same family as the `/dms` guard in the other file. Not in the generated set. |
| Blank submit shows a message under every required field and sends no request | Browser validation. Messages are `Enter a username.`, `Enter your full name.`, `Enter an email address or a phone number.`, and `Enter a password.` §1.5 does not fix those sentences. `AI-R-16` and `AI-R-27` are API calls, so they are not the same test. |
| Short password, username `12`, phone `12` rejected in the browser | Related to `AI-R-08`, `AI-R-12`, and `AI-R-28`, but the spec asserts UI copy (`Password must be 8–72 characters.`, a username message that starts `Use 3–64 letters`, `Enter a valid phone number.`) and asserts no navigation. It does not assert HTTP status. |
| Duplicate username, then duplicate phone, on the form | `AI-R-29` and `AI-R-31` at the UI. The spec also checks the field that shows the error and that the URL stays on `/register`. It does not cover `EMAIL_TAKEN`. The file says the form leaves email blank because the UI sends email through Firebase. |
| Titled `AUTH-16`: a dashed ten-digit phone is stored as `+1`, and login works with the dashed value and with `+1` | Matches `AI-R-04` plus the formatted and `+1` logins (`AI-L-06`, `AI-L-07`). The spec does not log in with the bare ten digits (`AI-L-08`) and does not cover the legacy `+` plus ten digits row (`AI-L-09`). |
| Titled `AUTH-16` §1.5: `USERNAME_TAKEN`, `EMAIL_TAKEN` for an upper-case address with `fieldErrors.email`, `PHONE_TAKEN`, username plus email together → code `USERNAME_TAKEN` and both keys, password `short` → **400** `password`, both contact keys empty → **400** `email` and `phone` | Matches `AI-R-29`–`AI-R-33`, `AI-R-12`, and `AI-R-27`. The spec’s combined case does not also collide the phone, so `AI-R-32` is stricter than the spec and still inside §1.5. The spec does not walk username length, the character set, display-name length, or email length. |

`EXT-05` asks for a browser sign-up with username, name, email, and phone, then three sign-ins (email, username, phone), a `/no-access` landing, **403** on business APIs, and the three 409 codes. The generated set has the three sign-in classes and the three codes. It does not have the landing or the **403**. `EXT-07` adds neither-contact, digit-only username, malformed email and phone, formatted-phone login, and the **401** message. Those inputs are in the generated set (`AI-R-22`, `AI-R-26`, `AI-R-27`, `AI-R-28`, `AI-L-07`, `AI-L-10`). `EXT-07` does not spell the three codes out one by one; `EXT-05` and §1.5 do.

## Duplication

`AI-R-09` (username `ab1`, length 3) and `AI-R-13` (password length 8) repeat `AI-R-01`. The other valid edges do not: username 64 (`AI-R-10`), password 72 (`AI-R-14`), display name 1 and 120 (`AI-R-17`, `AI-R-18`), and email 254 (`AI-R-20`) are not the values in `AI-R-01`. Those stay, once each.

`AI-R-04` and `AI-R-05` are the same partition (ten digits, separators stripped, `+1` applied). One of them is enough for the rule. The second is confirmation, not a new class.

No two 409 rows expect the same code for the same collision. `AI-R-32` and `AI-R-33` are different priority positions, so they are not duplicates.

## Correctness

No generated expected result contradicts `AUTH-16`, `AUTH-17`, §1.4, or §1.5.

The set does not invent a password character class, a display-name character ban, or a second **401** message. It does not treat a digit-only username as legal, which keeps the login order testable: a ten-digit identifier is not an exact username that registration was allowed to create.

`fieldErrors` message text is correctly left as “English” rather than copied from the browser strings.

## What a marker should score

`CPRG-305-B/ai-test.md` asks for the prompt, the original response, a check of correctness, coverage, and duplication, and an improved set with the reasons for each change.

- The prompt quotes `AUTH-16`, `AUTH-17`, and §1.4–§1.5, and it tells the model not to invent rules.
- The original response covers the valid classes, the username rules, the ten-digit `+1` rule, the three 409 codes, the multi-value priority, and the parse order, including the legacy phone match.
- Those expected results agree with the cited rules. Coverage of that written slice is high. Coverage of the 26 Playwright cases is not, and should not be scored as if this were a UI suite.
- Duplication is `AI-R-09` and `AI-R-13` (the same username and password as `AI-R-01`) plus the second ten-digit separator example (`AI-R-05`).
- The improved file removes that repetition, adds the unbound **403** and the ignored `role` / `dealerId` body from rules the first answer skipped, and records which Playwright cases stay outside this catalog.

Score the option as complete for the AI-test task. Score the raw catalog as a correct API draft for `AUTH-16` and `AUTH-17`, not as a substitute for `playwright/tests/auth.spec.ts` or `playwright/tests/ui/register-landing.spec.ts`. Use `improved-test-cases.md` as the set to keep.

## Where the docs disagree with this brief

The brief’s rules (length 3–64, the character set, at least one letter, email and/or phone, ten digits stored with `+1`, three 409 codes, `@` then username then phone) match `AUTH-16`, `AUTH-17`, and `design/14-Backend-API-Contract.md` §1.4–§1.5. The disagreements are elsewhere.

1. **Case count.** The brief says the two Playwright files hold 19 cases. `playwright/tests/ui/register-landing.spec.ts` has 19. `playwright/tests/auth.spec.ts` has 7 more. The total is 26.

2. **Phone without a country code.** `AUTH-16` and §1.5 say ten digits and no `+` are stored as `+1` plus those digits. `design/15-Data-Auth-and-Gateway.md` §8.3 says “A phone must already include its country code; digits without one are read as if they start with it,” and its example treats `14035550142` (11 digits) as the same number as `+14035550142`. §1.4 / §1.5 do not state that 11-digit case. The generated set follows §1.5 and does not grade the 11-digit input.

3. **Legacy login value.** §1.4 says an account stored as `+` plus the ten digits still matches a ten-digit login. `AUTH-17` and `design/15` §8.3 do not say that. The case is in the generated set because §1.4 says it. Current registration will not create that row.

4. **Failed-login copy.** §1.4, `design/13-Frontend-Engineering.md`, `design/AI-CODING-FRONTEND.md`, and `EXT-07` say `Invalid sign-in name or password`. `playwright/tests/auth.spec.ts` expects `Invalid email, sign-in name or password.` The generated **401** cases use the contract sentence.

5. **`AUTH-15` means two things.** The register spec titles use it for “self-registration creates only an unbound `Dealer.User`.” That text is `requirements/iteration-1/DealerOps-Requirements.md`. `requirements/analysis/01-Roles-and-Tenancy.md` defines `AUTH-15` as the admin viewing and editing one dealership. `design/21-Feature-Extensions.md` does not list `AUTH-15`; the unbound rule there is `AUTH-18`. The improved cases cite `AUTH-18` and §1.5, not `AUTH-15`.

6. **Sign-in names after admin bind.** `design/13-Frontend-Engineering.md` says bind-staff sign-in “uses only the email or phone and password.” `AUTH-17` and §1.4 say the username is a sign-in name too. §3.6 of the contract says a new or existing account can sign in with any of the three. The generated login cases keep the username path.

7. **Social button and anonymous routes, same section as AUTH-16.** `design/21-Feature-Extensions.md` §5 still says `/login` has no social sign-in buttons, and that only login, registration, and public VIN decode are anonymous. `AUTH-23` in that same section, and `design/13-Frontend-Engineering.md`, add a Google button when a client id is set. §1.3 also lists Google, Firebase, and catalog GET as anonymous. Those routes are outside this option. The prompt told the model not to add them, and the generated set does not.

8. **Stack name in the auth design.** `design/15-Data-Auth-and-Gateway.md` §8.3 still names Spring Security `BCryptPasswordEncoder` and `dealer/LoginIdentifiers.java`. The active backend is the .NET solution. The HTTP rules used above do not depend on that class name.

9. **`EXT-05` happy path.** The acceptance script registers with both email and phone. `AUTH-16` also allows either one alone. The generated set keeps both shapes. `EXT-05` is the both-present path plus the landing and **403**, which the raw set did not include.
