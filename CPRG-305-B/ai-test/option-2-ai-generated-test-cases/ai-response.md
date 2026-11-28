# Raw AI answer

Generated test cases for `POST /api/v1/auth/register` and `POST /api/v1/auth/login`. This is the original answer. Later edits are in `improved-test-cases.md`, not here.

Partitions used:

- Username: shorter than 3; 3–64 with a letter and only allowed characters; longer than 64; 3–64 with no letter; 3–64 with a character outside the set.
- Contact: email only; phone only; both; neither (both keys present and empty).
- Phone: ten digits and no `+`; already in `+` country-code form; the same ten digits with spaces, dashes, or brackets; not ten digits and no country code.
- Password: 7 or fewer; 8–72; 73 or more. No character-class split, because none is stated.
- Display name: empty; 1–120; 121 or more. Same display name on two accounts is valid.
- Email: well-formed; not well-formed; same address in another case.
- Login identifier: contains `@`; exact username; otherwise a phone; none of those.
- Login outcome: password matches an active account; password does not match; identifier is unknown; account is inactive; identifier or password is blank.

An 11-digit value with no `+` is not given a pass/fail result. AUTH-16 and §1.5 state the ten-digit rule and say any other number needs a country code. They do not say whether `14035550100` already counts as country code `1`.

## Registration — valid classes

| ID | Rule | Technique | Preconditions | Input | Expected |
|---|---|---|---|---|---|
| AI-R-01 | AUTH-16, §1.5 | Equivalence | No conflicting account | `username` `ab1`, `displayName` `Alex Dealer`, `email` `alex@example.com`, no phone, `password` `abcdefgh` (8 letters) | **201**. Body has `accessToken`, `role` `Dealer.User`, `displayName` `Alex Dealer`. No dealership. |
| AI-R-02 | AUTH-16, §1.5 | Equivalence | No conflicting account | Phone only `+14165550123`, no email, other fields valid | **201**. Stored phone is `+14165550123`. |
| AI-R-03 | AUTH-16, §1.5 | Equivalence | No conflicting account | Both a new email and `+14165550124` | **201**. Both identifiers are stored. |
| AI-R-04 | AUTH-16, §1.5 | Equivalence | No conflicting account | Phone `403-555-0100` (ten digits, no `+`) | **201**. Stored phone is `+14035550100`. |
| AI-R-05 | AUTH-16, §1.5 | Equivalence | No conflicting account | Phone `(403) 555 0101` | **201**. Stored phone is `+14035550101`. |
| AI-R-06 | AUTH-16 | Equivalence | No conflicting account | `username` `a.b_c-1` (letter plus `.`, `_`, `-`) | **201**. |
| AI-R-07 | AUTH-16 | Equivalence | An account already uses display name `Alex Dealer` | A new username, email, and phone, same display name | **201**. The full name is not a conflict. |

## Registration — boundaries

These rows restate the length endpoints. The valid side of each pair is the same class as AI-R-01.

| ID | Rule | Technique | Input | Expected |
|---|---|---|---|---|
| AI-R-08 | AUTH-16 | Boundary | `username` length 2, contains a letter (`ab`) | **400** `VALIDATION`, `fieldErrors.username` |
| AI-R-09 | AUTH-16 | Boundary | `username` length 3, contains a letter, allowed characters only (`ab1`) | **201** |
| AI-R-10 | AUTH-16 | Boundary | `username` length 64, contains a letter, allowed characters only | **201** |
| AI-R-11 | AUTH-16 | Boundary | `username` length 65, otherwise legal | **400** `VALIDATION`, `fieldErrors.username` |
| AI-R-12 | §1.5 | Boundary | `password` length 7 | **400** `VALIDATION`, `fieldErrors.password` |
| AI-R-13 | §1.5 | Boundary | `password` length 8 | **201** |
| AI-R-14 | §1.5 | Boundary | `password` length 72 | **201** |
| AI-R-15 | §1.5 | Boundary | `password` length 73 | **400** `VALIDATION`, `fieldErrors.password` |
| AI-R-16 | §1.5 | Boundary | `displayName` empty | **400** `VALIDATION`, `fieldErrors.displayName` |
| AI-R-17 | §1.5 | Boundary | `displayName` length 1 | **201** |
| AI-R-18 | §1.5 | Boundary | `displayName` length 120 | **201** |
| AI-R-19 | §1.5 | Boundary | `displayName` length 121 | **400** `VALIDATION`, `fieldErrors.displayName` |
| AI-R-20 | §1.5 | Boundary | `email` length 254 and well-formed | **201** |
| AI-R-21 | §1.5 | Boundary | `email` length 255 | **400** `VALIDATION`, `fieldErrors.email` |

## Registration — other invalid classes

| ID | Rule | Technique | Input | Expected |
|---|---|---|---|---|
| AI-R-22 | AUTH-16 | Equivalence | `username` `12345` (digits only) | **400** `VALIDATION`, `fieldErrors.username` |
| AI-R-23 | AUTH-16 | Equivalence | `username` `___` (allowed symbols, no letter) | **400** `VALIDATION`, `fieldErrors.username` |
| AI-R-24 | AUTH-16 | Equivalence | `username` `ab c` (space) | **400** `VALIDATION`, `fieldErrors.username` |
| AI-R-25 | AUTH-16 | Equivalence | `username` `ab@c` (`@` not allowed) | **400** `VALIDATION`, `fieldErrors.username` |
| AI-R-26 | §1.5 | Equivalence | `email` `not-an-email` | **400** `VALIDATION`, `fieldErrors.email` |
| AI-R-27 | §1.5 | Equivalence | `email` `""` and `phone` `""` | **400** `VALIDATION`, `fieldErrors` contains `email` and `phone` |
| AI-R-28 | AUTH-16, §1.5 | Equivalence | `phone` `403555010` (9 digits, no `+`) | **400** `VALIDATION`, `fieldErrors.phone`. Not specified: the English sentence text. |

## Registration — three 409 codes

Preconditions for this group: an active account already has `username` `alex.dealer`, `email` `alex@example.com`, and `phone` `+14035550100`. The new request uses a new password and a new display name unless a row says otherwise.

| ID | Rule | Technique | Input that collides | Expected |
|---|---|---|---|---|
| AI-R-29 | AUTH-16, §1.5 | Equivalence | `username` `alex.dealer`; new email and new phone | **409** `USERNAME_TAKEN`, `fieldErrors.username` |
| AI-R-30 | AUTH-16, §1.5 | Equivalence | `email` `Alex@Example.com`; new username and new phone | **409** `EMAIL_TAKEN`, `fieldErrors.email` |
| AI-R-31 | AUTH-16, §1.5 | Equivalence | `phone` `+1 (403) 555-0100`; new username and new email | **409** `PHONE_TAKEN`, `fieldErrors.phone` |
| AI-R-32 | §1.5 | Equivalence | Same username, same email in another case, and the same phone | **409** `USERNAME_TAKEN`. `fieldErrors` contains `username`, `email`, and `phone`. |
| AI-R-33 | §1.5 | Equivalence | New username; same email; same phone | **409** `EMAIL_TAKEN`. `fieldErrors` contains `email` and `phone`. |

## Login — valid classes and parse order

Account A: `username` `pat`, `email` `pat.user@example.com`, `phone` `+14035550111`, password `abcdefgh`.

Account B: `username` `other.user`, `email` `pat@example.com`, phone unset, password `abcdefgh`.

Account C: `username` `phone.user`, email unset, `phone` `+14035550122`, password `abcdefgh`.

Account D (legacy row, not created by the current register rule): `phone` stored as `+4035550199` (`+` plus ten digits, no `1`), password `abcdefgh`.

| ID | Rule | Technique | Identifier | Expected |
|---|---|---|---|---|
| AI-L-01 | AUTH-17, §1.4 | Equivalence | `pat.user@example.com` and A's password | **200**. Account A. The value contains `@`, so this is an email lookup. |
| AI-L-02 | §1.4 | Equivalence | `Pat.User@Example.com` and A's password | **200**. Account A. Email match is case-insensitive. |
| AI-L-03 | AUTH-17, §1.4 | Equivalence | `pat@example.com` and B's password | **200**. Account B, not account A. The local part `pat` is not used as a username, because the value contains `@`. |
| AI-L-04 | AUTH-17, §1.4 | Equivalence | `pat` and A's password | **200**. Account A. No `@`, so the exact username is used. It is not a phone lookup. |
| AI-L-05 | §1.4 | Equivalence | `Pat` and A's password | **401** `UNAUTHORIZED`, message `Invalid sign-in name or password`. Username match is exact, the value has no `@`, and it is not a phone. |
| AI-L-06 | AUTH-17, §1.4 | Equivalence | `+14035550122` and C's password | **200**. Account C. |
| AI-L-07 | §1.4 | Equivalence | `(403) 555-0122` and C's password | **200**. Account C. Spaces, dashes, and brackets are ignored. |
| AI-L-08 | AUTH-17, §1.4 | Equivalence | `4035550122` and C's password | **200**. Account C. Ten digits and no `+` are read as `+14035550122`. No username equals that string. |
| AI-L-09 | §1.4 | Equivalence | `4035550199` and D's password | **200**. Account D. The stored value is the older `+` plus ten digits form, and the ten-digit identifier still matches. |

## Login — invalid classes

| ID | Rule | Technique | Input | Expected |
|---|---|---|---|---|
| AI-L-10 | §1.4 | Equivalence | A's email, password `wrong-pass` | **401** `UNAUTHORIZED`, message `Invalid sign-in name or password` |
| AI-L-11 | §1.4 | Equivalence | `nobody@example.com`, any password | **401** with the same message. The `@` keeps this on the email path. It is not tried as a username. |
| AI-L-12 | §1.4 | Equivalence | Known identifier of an inactive account, correct password | **401** with the same message |
| AI-L-13 | §1.4 | Equivalence | `identifier` blank, password present | **400** `VALIDATION` |
| AI-L-14 | §1.4 | Equivalence | identifier present, `password` blank | **400** `VALIDATION` |

## Not specified by the rules in the prompt

- The English wording of **400** `fieldErrors` messages, beyond “English”.
- Whether `14035550100` (11 digits, no `+`) is stored as `+14035550100` or rejected.
- Browser copy, redirects, and who can see a dealership page after **201** or **200**.
