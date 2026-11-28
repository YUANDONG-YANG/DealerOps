# Option 2 — AI-generated test cases

Course option: **AI-Generated Test Cases** in `CPRG-305-B/ai-test.md`.

Scope is DealerOps self-service registration and password login (`AUTH-16`, `AUTH-17`). This folder is the course write-up only. It does not contain executable tests, and it does not change product code.

| Part | File | What it is |
|---|---|---|
| Prompt | [prompt.md](prompt.md) | The prompt sent to the model |
| Raw AI answer | [ai-response.md](ai-response.md) | The generated cases, kept as generated |
| Reflection | [reflection.md](reflection.md) | Check against the requirement IDs and the Playwright specs |
| Improved cases | [improved-test-cases.md](improved-test-cases.md) | Deduplicated set, with the gaps the comparison found |
| Verification run | [verification-run.md](verification-run.md) | Login cases executed against the running API; one expected result was wrong |

Rules were taken from `design/21-Feature-Extensions.md` (AUTH-16, AUTH-17), `design/14-Backend-API-Contract.md` §1.4–§1.5, and `design/15-Data-Auth-and-Gateway.md` §8. The comparison uses `playwright/tests/auth.spec.ts` and `playwright/tests/ui/register-landing.spec.ts`. Those specs were not edited.
