# Option 5 — AI-generated automated tests

Course option: **AI-Generated Automated Tests** in `CPRG-305-B/ai-test/ai-test.md`.

Scope is one clause of `AUTH-16`: the username shape accepted by `POST /api/v1/auth/register`. The
rule is declared in `backend/dotnet/DealerOps.Core/Dealer/Dto/RegisterRequest.cs`.

| Part | File | What it is |
|---|---|---|
| 1 Prompt | [prompt.md](prompt.md) | The prompt sent to the model |
| 2 Raw AI answer | [UsernameValidationTests.cs](UsernameValidationTests.cs) | The generated xUnit file, kept as generated and compiled unchanged |
| 3 Reflection | [reflection.md](reflection.md) | Check against the requirement and the DTO, written before the run |
| 4 Execution results | [execution-results.md](execution-results.md) | Four runs: the raw file, a failed oracle, the corrected oracle, and the live API |
| 5 Corrections | [corrections.md](corrections.md) | What was wrong, why, and the scenarios added |
| — Runner | [runner/](runner/) | The xUnit project used to run the above |

## How to reproduce

```bash
cd CPRG-305-B/ai-test/option-5-ai-generated-automated-tests/runner
dotnet test
```

Expected: `Passed! - Failed: 0, Passed: 106`. Requires the .NET 10 SDK.

The live API table in `execution-results.md` additionally needs the project's private end-to-end
stack, started with `playwright/scripts/e2e-stack.sh start` (gateway `127.0.0.1:18080`, database
`dealer_core_e2e`). The shared development ports 8080, 8081, 8082, and 5174 are not used.

## Relationship to the product

`runner/Option5.Tests.csproj` is coursework. It is **not** a member of
`backend/dotnet/DealerOps.Core.sln`, so `dotnet build` and `dotnet test` on the product solution do
not see it. It holds one `ProjectReference` to `DealerOps.Core` so the tests can read the real DTO's
declared attributes; it adds nothing to that project and changes no product file.

No product source, existing Playwright spec, design document, or configuration file was modified for
this option. The headline finding — that the two validation attributes bind to `RegisterRequest`'s
constructor parameter rather than to its property — is a fact about C# records, not a defect: the
live API rejects every malformed username with **400** `VALIDATION`, which
[execution-results.md](execution-results.md) Run 4 shows.
