# Improved test cases

This set replaces `ai-response.md` as the catalog to keep. It is still a written catalog, not an executable suite.

## What changed and why

| Change | Why |
|---|---|
| Dropped `AI-R-09` and `AI-R-13` | Username length 3 (`ab1`) and password length 8 are already R-01. |
| Dropped `AI-R-05` | Same partition as R-04: ten digits, separators removed, stored with `+1`. |
| Kept the other valid edges once | Username 64, password 72, display name 1 and 120, and email 254 are not the values used in R-01. |
| Renumbered the remaining rows | One sequence, no gap where a duplicate was removed. |
| Added R-24 | §1.5 creates an active `Dealer.User` with no dealership. `AUTH-18` and `EXT-05` say a business call then returns **403**. The raw set stopped at **201**. |
| Added R-25 | The Playwright register spec sends `role` and `dealerId` and still expects **201** `Dealer.User`. §1.5 states the created role and the missing dealership. §1.3 says ignore client `dealerId`. The raw set never sent those fields. Labeled `AUTH-18` and §1.5, not `AUTH-15`, because that id is defined two different ways (see `reflection.md`). |
| Left the 11-digit number out | `design/14-Backend-API-Contract.md` §1.5 and `design/15-Data-Auth-and-Gateway.md` §8.3 do not say the same thing. Guessing a status would invent a rule. |
| Did not add the Playwright UI strings or the route guards | Those belong to `UI-01`–`UI-04` and the landing titles. Copying them here would mix browser text with the API contract, and the login spec’s **401** sentence does not match §1.4. |

Ids below are the improved ids. The raw id is noted where the case was kept.

## Registration

Shared valid filler, unless a row replaces a field: `displayName` `Alex Dealer`, `password` `abcdefgh`, and a username, email, and phone that no account already uses.

| ID | Rule | Class | Input | Expected |
|---|---|---|---|---|
| R-01 (was AI-R-01) | AUTH-16, §1.5 | Valid, email only | `username` `ab1`, email set, phone omitted, password of 8 letters | **201**. `role` is `Dealer.User`. `displayName` echoes. No dealership. |
| R-02 (was AI-R-02) | AUTH-16, §1.5 | Valid, phone only | Phone `+14165550123`, email omitted | **201**. Stored phone `+14165550123`. |
| R-03 (was AI-R-03) | AUTH-16, §1.5 | Valid, both | New email and `+14165550124` | **201**. Both stored. |
| R-04 (was AI-R-04) | AUTH-16, §1.5 | Valid, ten-digit phone | Phone `403-555-0100` | **201**. Stored phone `+14035550100`. |
| R-05 (was AI-R-06) | AUTH-16 | Valid character set | `username` `a.b_c-1` | **201**. |
| R-06 (was AI-R-07) | AUTH-16 | Valid, display name not unique | Display name already used; new username, email, and phone | **201**. |
| R-07 (was AI-R-08, AI-R-11) | AUTH-16 | Boundary | Username length 2 with a letter; username length 65 otherwise legal | **400** `VALIDATION`, `fieldErrors.username` |
| R-08 (was AI-R-10) | AUTH-16 | Boundary | Username length 64, one letter, allowed characters only | **201** |
| R-09 (was AI-R-22, AI-R-23) | AUTH-16 | Invalid, no letter | `12345` and `___` | **400** `VALIDATION`, `fieldErrors.username` |
| R-10 (was AI-R-24, AI-R-25) | AUTH-16 | Invalid character | `ab c` and `ab@c` | **400** `VALIDATION`, `fieldErrors.username` |
| R-11 (was AI-R-12, AI-R-15) | §1.5 | Boundary | Password length 7; password length 73 | **400** `VALIDATION`, `fieldErrors.password` |
| R-12 (was AI-R-14) | §1.5 | Boundary | Password length 72 | **201**. Length 8 is already R-01. |
| R-13 (was AI-R-16, AI-R-19) | §1.5 | Boundary | Display name empty; display name length 121 | **400** `VALIDATION`, `fieldErrors.displayName` |
| R-14 (was AI-R-17, AI-R-18) | §1.5 | Boundary | Display name length 1; display name length 120 | **201** for each. R-01 uses a name in between. |
| R-15 (was AI-R-20, AI-R-21) | §1.5 | Boundary | Well-formed email of 254 characters; email of 255 characters | 254 → **201**. 255 → **400** `VALIDATION`, `fieldErrors.email`. |
| R-16 (was AI-R-26) | §1.5 | Invalid email | `not-an-email` | **400** `VALIDATION`, `fieldErrors.email` |
| R-17 (was AI-R-27) | §1.5 | Neither contact | `email` `""` and `phone` `""` | **400** `VALIDATION`, `fieldErrors` contains `email` and `phone` |
| R-18 (was AI-R-28) | AUTH-16, §1.5 | Phone needs a country code | `403555010` (9 digits, no `+`) | **400** `VALIDATION`, `fieldErrors.phone` |
| R-19 (was AI-R-29) | AUTH-16, §1.5 | 409 | Username already used; new email and phone | **409** `USERNAME_TAKEN`, `fieldErrors.username` |
| R-20 (was AI-R-30) | AUTH-16, §1.5 | 409 | Email already used, different case; new username and phone | **409** `EMAIL_TAKEN`, `fieldErrors.email` |
| R-21 (was AI-R-31) | AUTH-16, §1.5 | 409 | Phone already used, written `+1 (403) 555-0100`; new username and email | **409** `PHONE_TAKEN`, `fieldErrors.phone` |
| R-22 (was AI-R-32) | §1.5 | 409 priority | Username, email, and phone all taken | **409** `USERNAME_TAKEN`. `fieldErrors` contains `username`, `email`, and `phone`. |
| R-23 (was AI-R-33) | §1.5 | 409 priority | Email and phone taken; username new | **409** `EMAIL_TAKEN`. `fieldErrors` contains `email` and `phone`. |
| R-24 | AUTH-18, EXT-05, §1.5 | After a valid register | R-01’s token calls a business collection such as `GET /api/v1/vehicles` | **403** `FORBIDDEN`. `GET /api/v1/me` is **200** with no dealership. |
| R-25 | §1.5, §1.3, AUTH-18 | Ignored extra fields | A valid new account plus `role` `Platform.Admin` and a `dealerId` | **201**, `role` `Dealer.User`, no dealership. A later admin URL with that token is **403** `FORBIDDEN`. |

## Login

Account A: username `pat`, email `pat.user@example.com`, phone `+14035550111`, password `abcdefgh`.

Account B: username `other.user`, email `pat@example.com`, no phone, password `abcdefgh`.

Account C: username `phone.user`, no email, phone `+14035550122`, password `abcdefgh`.

Account D: phone already stored as `+4035550199` (`+` and the ten digits, no country digit `1`), password `abcdefgh`. This row is a precondition. Registering `4035550199` today stores `+14035550199`, which is a different value, so D is not built with R-04.

| ID | Rule | Class | Identifier and password | Expected |
|---|---|---|---|---|
| L-01 (was AI-L-01, AI-L-02) | AUTH-17, §1.4 | Email | `pat.user@example.com` and `Pat.User@Example.com`, A’s password | **200**, account A, both times. |
| L-02 (was AI-L-03) | AUTH-17 | `@` before username | `pat@example.com`, B’s password | **200**, account B. Not account A, whose username is `pat`. |
| L-03 (was AI-L-04, AI-L-05) | AUTH-17, §1.4 | Username before phone | `pat` with A’s password; `Pat` with A’s password | `pat` → **200**, account A. `Pat` → **401** `UNAUTHORIZED`, message `Invalid sign-in name or password`. |
| L-04 (was AI-L-06, AI-L-07, AI-L-08) | AUTH-17, §1.4 | Phone after username | `+14035550122`, `(403) 555-0122`, and `4035550122`, C’s password | **200**, account C, all three. The bare ten digits match `+1` plus those digits. |
| L-05 (was AI-L-09) | §1.4 | Legacy phone | `4035550199`, D’s password. No account has phone `+14035550199`. | **200**, account D. The ten-digit identifier matches the older `+` plus ten digits row. |
| L-06 (was AI-L-10, AI-L-11, AI-L-12) | §1.4 | One failure message | A’s email with the wrong password; `nobody@example.com`; an inactive account’s identifier with the right password | **401** `UNAUTHORIZED` and `Invalid sign-in name or password` for each. The unknown value contains `@`, so it stays on the email path. |
| L-07 (was AI-L-13, AI-L-14) | §1.4 | Blank | Blank identifier; blank password | **400** `VALIDATION` for each. |

## Playwright cases this catalog does not absorb

Kept in the specs, not rewritten here:

- All 7 cases in `playwright/tests/auth.spec.ts` (role landings, the browser’s empty-form message, the return-to-page guard, and the two cross-role redirects).
- The 9 landing, VIN, and home-routing cases in `playwright/tests/ui/register-landing.spec.ts`.
- The register form’s client messages and the “no request was sent” assertion.
- The no-access screen on `/crm`, `/profile`, and `/`.

API overlap that already exists in `playwright/tests/ui/register-landing.spec.ts`: the dashed `+1` register test covers R-04 and part of L-04 (dashed and `+1`, not the bare ten digits and not L-05). The §1.5 API test sends password `short` (length 5). That sits in the same invalid partition as R-11’s length-7 input, and it is not the length-7 or length-73 boundary. The same test covers R-17, R-19, R-20, and a two-field version of R-22 (username and email, not the phone as well).
