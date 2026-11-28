# Part 1 — Prompt

The text below the line is the exact prompt. It asks for automated tests of one rule: the AUTH-16 username shape on self sign-up.

---

Write one self-contained xUnit test file in C# for a single DealerOps validation rule. Return only that source file. Do not create a project, do not edit a solution, and do not test any other field.

## Rule

AUTH-16, username only. Sources: `design/21-Feature-Extensions.md` (row AUTH-16) and `design/14-Backend-API-Contract.md` §1.5.

`POST /api/v1/auth/register` accepts `username` of length 3–64 whose characters are letters, digits, `.`, `_`, and `-`, and which contains at least one letter.

## Implementation to match

`backend/dotnet/DealerOps.Core/Dealer/Dto/RegisterRequest.cs` places these attributes on `Username`:

```csharp
[Required]
[RegularExpression(@"(?=.*[A-Za-z])[A-Za-z0-9._-]{3,64}",
    ErrorMessage = "Use 3-64 letters, digits, dots, dashes or underscores, with at least one letter.")]
```

Reproduce the behavior of those two attributes:

- `[Required]` rejects null, `""`, and whitespace-only input. Use the framework default message `The Username field is required.`
- `RegularExpressionAttribute` treats null and `""` as valid, because `[Required]` already covers them. For every other value it requires the pattern to match the entire string (match index 0 and match length equal to the string length). The pattern literal has no `^` or `$`.
- Every other failure uses the `ErrorMessage` above. That one message covers length, character set, and the missing-letter case.

## Cases

Use arrange / act / expected. Include a concrete input and the expected messages for each case.

- Length 1 and length 2 are rejected. Length 3 and length 64 are accepted. Length 65 is rejected.
- Letters, digits, `.`, `_`, and `-` are accepted, including a value that starts with `.`, `_`, or `-`. Accept the contract example `alex.dealer`.
- A digits-only value and a marks-only value (`.`, `_`, or `-` only) are rejected when the length is otherwise legal.
- Space, a leading or trailing space, tab, newline, `@`, `+`, `/`, `!`, and a non-ASCII letter (the value `José`) are rejected.
- A legal fragment that is not the whole string is rejected: `abc!!!` and `!!!abc`.
- Null and `""` produce only the required message.
- A whitespace-only value of three spaces produces both the required message and the pattern message, required first.

Put a small helper in the same file that copies the pattern and the full-string match. Do not reference `DealerOps.Core`. The file is coursework evidence and is not part of the product solution.
