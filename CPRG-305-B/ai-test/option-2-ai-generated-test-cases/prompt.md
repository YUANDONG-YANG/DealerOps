# Prompt

The text below is the prompt that was sent. Nothing was added after the model answered.

---

You are writing black-box API test cases for one product, DealerOps. Cover only self-service registration and password login. Use only the rules in this prompt. Do not invent password character-class rules, social login, rate limits, or requirement IDs. When a case implements a rule below, name that rule (`AUTH-16` or `AUTH-17`, or the contract section). Do not write executable code.

## AUTH-16 — register

Source: `design/21-Feature-Extensions.md`.

`POST /api/v1/auth/register` accepts:

- `username`: 3–64 characters from letters, digits, `.`, `_`, `-`, and at least one letter
- `displayName`
- `password`
- at least one of a valid `email` or a phone number (both are allowed)

Ten digits without `+` are a local North American number and are stored as `+1` plus those digits. Any other number needs its country code. A duplicate username, email, or phone returns **409** `USERNAME_TAKEN`, `EMAIL_TAKEN`, or `PHONE_TAKEN`. The full name is not unique. Every error names its field in `fieldErrors` with an English message.

## Register contract detail

Source: `design/14-Backend-API-Contract.md` §1.5.

- `displayName` is 1–120 characters. `email` is at most 254 characters. `password` is 8–72 characters. No richer password rule is stated.
- The phone is stored as `+` and its digits.
- Success is **201** with the same login body: `accessToken`, `role`, `displayName`. The account is an active `Dealer.User` with no dealership.
- Missing or malformed field, invalid email, phone without a valid country code, or neither email nor phone (both keys set) → **400** `VALIDATION`.
- Email uniqueness uses the canonical lower-case address. Phone uniqueness uses the canonical `+` digits form.
- When several values are taken, `code` is the first of `USERNAME_TAKEN`, then `EMAIL_TAKEN`, then `PHONE_TAKEN`, and `fieldErrors` lists every taken field.

## AUTH-17 — login

Source: `design/21-Feature-Extensions.md`.

`POST /api/v1/auth/login` accepts `identifier` (email, username, or phone) and `password`.

Resolution order:

1. If the value contains `@`, treat it as an email.
2. Otherwise look up an exact username.
3. Otherwise treat it as a phone.

## Login contract detail

Source: `design/14-Backend-API-Contract.md` §1.4.

- Body: `{ "identifier", "password" }`. Success is **200** with `accessToken`, `role`, `displayName`.
- Email match is case-insensitive. Username match is exact. Phone match ignores spaces, dashes, and brackets.
- Ten digits without `+` are read as `+1` plus those digits.
- An account already stored as `+` plus those ten digits (the form used before the `+1` rule) still matches that ten-digit identifier.
- Blank identifier or blank password → **400** `VALIDATION`.
- Unknown identifier, inactive account, or wrong password → **401** `UNAUTHORIZED` with one message: `Invalid sign-in name or password`.

## What to produce

Write test cases for registration and login. For each case give: id, rule, technique (equivalence partition or boundary), preconditions, input, and expected status, `code` when it is an error, and the observable result (stored phone, which account is selected, `fieldErrors` keys).

Cover:

- valid classes for registration and login
- the username length, character set, and “at least one letter” rule
- email and/or phone, including the ten-digit `+1` normalization
- the three distinct 409 codes, including more than one value taken on the same request
- identifier parse order, including the older `+` plus ten digits login match

Where the rules above do not state a result, say the result is not specified. Do not fill that gap with a guess.
