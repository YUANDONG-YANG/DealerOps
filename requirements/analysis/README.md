# Dealer Ops Requirements Analysis

This folder breaks the source documents under `requirements/` into requirement items that can be built and accepted.

> **Scope currency (2026-10-21).** The customer’s original PDF and both DOCX files define requested
> product functionality. For this academic graduation demonstration, implement every requested
> feature that can reasonably be delivered in the active .NET/React stack. A production account or
> third-party authorization limit calls for a clearly labeled simulation where feasible, not an
> automatic Won’t decision. Current delivery rules are in `design/SCOPE-BASELINE.md`; see the
> current reconciliation at [14-Delivery-Scope-Reconciliation-2026-10-21.md](14-Delivery-Scope-Reconciliation-2026-10-21.md).
> Older analysis and review documents may preserve historical decisions and must not be treated as
> the current backlog without checking the baseline.

2026-09-28: course-demo reconciliation is recorded in [DealerOps-Requirements-Resolution-2026-09-28.md](../../review/DealerOps-Requirements-Resolution-2026-09-28.md). Current ad decisions are in 04 and acceptance in 06. Reviews 08–11 retain historical findings; the customer sources remain the implementation authority. The source audit is [13-Customer-Requirements-Audit-2026-10-16.html](13-Customer-Requirements-Audit-2026-10-16.html). The assistant also supports deterministic counts, as recorded in 05 and 06.

Source verification as of 2026-09-28: [12-Requirements-Code-Verification-2026-09-28.md](12-Requirements-Code-Verification-2026-09-28.md). **Historical only** — it was written against the retired Java / Vue stacks, so its file:line evidence and its V-01–V-04 findings no longer apply to the .NET 10 / React implementation. Do not reopen them as current defects.

## Sources

| ID | File | Content | Role |
|---|---|---|---|
| SRC-PDF | `../DealerOps-Specification.pdf` (2026-09-21) | Roles, DMS / CRM / ad-compliance fields, cross-cutting rules, page list, known limitations | **Authority for fields and business rules** |
| SRC-DOC | `../Dos Car dealership.docx` | Product vision (DealerOS): DMS core + CRM + AI compliance assistant + optional Image Studio | Vision / selling points; does not define fields |
| SRC-DOC2 | `../Dos Car dealership2.docx` | The same vision plus the client notes: questions put to the client, C# as the preferred language, the NHTSA vPIC VIN-decode flow and its returned fields, landing-page contents, a React UI, and a Firebase auth stack | **Authority for the errata 6–9 extensions.** Firebase **Auth** was adopted on 2026-10-16 (erratum 9); the Firebase **database** was not — MySQL stays the only application database |
| SRC-SCOPE | `../../design/SCOPE-BASELINE.md` | Academic demonstration delivery baseline and technical boundaries | Current implementation scope and conflict resolution |

Related reports outside this folder: `../DealerOps-Requirements.md` (English superset report; it defines `NFR-08`), `../DealerOps-Requirements-zh.html` (historical translation; it may not reflect later scope updates) and `../DealerOps-Development-Progress-en.html`.

Conflict order follows SCOPE-BASELINE: **PPT hard requirements > specification PDF fields > v6 design > UI 12**. Items the DOCX files raise beyond the PDF are resolved by SCOPE-BASELINE errata 6–9, not by this folder.

> `Dos Car dealership2.docx` embeds Firebase project configuration. Firebase Auth is now used for
> email/password sign-in; Firebase's database is not used. Keep service-account credentials out
> of source control and do not quote credential values in reports or command output.

## Files

| File | Content |
|---|---|
| [01-Roles-and-Tenancy.md](01-Roles-and-Tenancy.md) | Roles, permission matrix, tenant isolation, account management |
| [02-DMS-Vehicles.md](02-DMS-Vehicles.md) | Vehicle fields, validation, lifecycle (in stock → sold) |
| [03-CRM-Customers.md](03-CRM-Customers.md) | Customer fields, validation, vehicle links |
| [04-Ad-Compliance.md](04-Ad-Compliance.md) | OMVIC rule breakdown, decision matrix, check states, export |
| [05-Cross-Cutting.md](05-Cross-Cutting.md) | Audit, architecture, security, AI, non-functional |
| [06-Pages-and-Acceptance.md](06-Pages-and-Acceptance.md) | Page list, page-level requirements, acceptance cases |
| [07-Open-Questions-and-Assumptions.md](07-Open-Questions-and-Assumptions.md) | Source ambiguities, assumptions taken, questions for the client |
| [08-Design-Review.md](08-Design-Review.md) | Historical review of an earlier design snapshot; not the current implementation audit |
| [09-Verification-Checklist.md](09-Verification-Checklist.md) | Historical evidence checklist for 08; references retired Java/Vue files and is not current code evidence |
| [10-Cursor-Change-Review.md](10-Cursor-Change-Review.md) | Historical review of a specific Cursor worktree snapshot |
| [11-Cursor-Instructions.md](11-Cursor-Instructions.md) | Historical instructions for a specific Cursor branch; do not execute as current task instructions |
| [12-Requirements-Code-Verification-2026-09-28.md](12-Requirements-Code-Verification-2026-09-28.md) | Historical source verification against the retired Java/Vue stacks; not current code evidence |
| [13-Customer-Requirements-Audit-2026-10-16.html](13-Customer-Requirements-Audit-2026-10-16.html) | HTML audit of customer sources, implementation coverage and remaining verification |
| [Traceability-Matrix.md](Traceability-Matrix.md) | Requirement ID → source → design doc → acceptance case |

## Requirement ID scheme

`<MODULE>-<number>`, with these prefixes:

| Prefix | Module |
|---|---|
| AUTH | Roles, sign-in, tenancy |
| DMS | Vehicle management |
| CRM | Customer management |
| AD | Ad compliance |
| AUD | Audit |
| ARC | Architecture |
| SEC | Security |
| AI | AI capabilities |
| NFR | Non-functional |
| UI | Pages |

Each requirement is tagged with:

- **Source**: `PDF §x` / `DOC` / `SCOPE` (a delivery decision in the team-maintained academic demo baseline) / `Derived` (a decision needed to build it; listed in 07 for confirmation)
- **Priority**: Customer-source functionality that is reasonably implementable for the academic demonstration is `Must`. `Should` / `Could` identify supporting or optional derived behavior. `Won’t` is reserved for a documented technical or project constraint, with a reason and an alternative where feasible; it must not be used just because a feature is more typical of a commercial product.
