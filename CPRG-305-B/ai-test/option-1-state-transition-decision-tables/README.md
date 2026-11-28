# Option 1 — State Transition and Decision Tables

Course option: **State Transition and Decision Tables** in `CPRG-305-B/ai-test/ai-test.md`.

Scope is two DealerOps features, one per technique: the sales-lead stage machine (`LEAD-01`…`LEAD-08`)
and in-dealership member role administration (`AUTH-26`, `AUTH-27`). This folder is the course
write-up only. It contains no executable tests and changes no product code.

| Part | File | What it is |
|---|---|---|
| Deliverable | [tables.md](tables.md) | The state transition table, the decision table, and the test cases derived from each |
| Alternative pass | [option-1-state-transition-decision-tables.md](option-1-state-transition-decision-tables.md) | A separate, parallel attempt at the same option — see the note at the end |

## Why there is no prompt, AI answer, or reflection

`ai-test.md` requires prompts, original AI responses, and a reflection **for AI-related tasks**. This
option is not one: it asks for two specification artifacts, with no AI tool in the loop. The three
files that options 2 to 5 carry therefore do not apply here, and none is included rather than being
padded out. The other four folders in this directory keep that structure because their options do
involve an AI tool.

## How the tables were verified

Both tables were written against the **implementation**, not only the requirement text, and each cell
traces to a specific guard in the source. Files read:

- `backend/dotnet/DealerOps.Core/Lead/LeadService.cs`, `Lead/LeadStage.cs`
- `backend/dotnet/DealerOps.Core/Dealer/MembershipService.cs`, `Dealer/DealerRole.cs`
- `backend/dotnet/DealerOps.Core/Common/Tenant/TenantGuard.cs`
- `backend/dotnet/DealerOps.Core/Common/Exceptions/ErrorCode.cs`

Requirement wording comes from `design/21-Feature-Extensions.md` §3 (leads) and §5 (roles), with the
role hierarchy in `design/15-Data-Auth-and-Gateway.md` §2.5. Where the code and the requirement
document disagree, the tables record the code's behaviour and §5 of `tables.md` lists the
discrepancy. The Playwright specs `playwright/tests/api/leads.spec.ts` and
`playwright/tests/api/dealer-roles.spec.ts` were read as oracles only and were not edited.

## Note on a second option 1 document

`option-1-state-transition-decision-tables.md`, beside this file, is a separate pass at this same
option produced in parallel. It covers the same two features but derives its tables from
`design/14-Backend-API-Contract.md` rather than from the source files. The two were not merged; each
stands on its own.

Where they disagree, that document is the one to trust on the reopen of a won lead whose vehicle was
sold to a different customer: it records **400** `WRONG_DEALER_OR_SOLD`, which is correct, because
the sold-vehicle guard is reached before the stock guard. `tables.md` §3.3 explains the three-way
split in full (T25, T26, T26b).

Only one option may be submitted, so the two option 1 documents are alternatives, not two parts of
one submission.
