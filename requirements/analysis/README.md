# Dealer Ops Requirements Analysis

This folder breaks the two source documents under `requirements/` into requirement items that can be built and accepted.

2026-09-28: course-demo reconciliation is recorded in ../../review/DealerOps-Requirements-Resolution-2026-09-28.md. Current ad decisions are in 04 and acceptance in 06. Reviews 08–11 retain historical findings; their old proposals do not restore deferred features. Scope errata override original disclosure severity.

最新源码核实：[12-Requirements-Code-Verification-2026-09-28.md](12-Requirements-Code-Verification-2026-09-28.md)。包含当前实现证据、实际测试结果及最小收尾项；不将历史建议恢复为开发范围。

## Sources

| ID | File | Content | Role |
|---|---|---|---|
| SRC-PDF | `../DealerOps-Specification.pdf` (2026-09-21) | Roles, DMS / CRM / ad-compliance fields, cross-cutting rules, page list, known limitations | **Authority for fields and business rules** |
| SRC-DOC | `../Dos Car dealership.docx` | Product vision (DealerOS): DMS core + CRM + AI compliance assistant + optional Image Studio | Vision / selling points; does not define fields |
| SRC-SCOPE | `../../design/SCOPE-BASELINE.md` | Signed scope, errata, Out of Scope | Conflict resolution |

Conflict order follows SCOPE-BASELINE: **PPT hard requirements > specification PDF fields > v6 design > UI 12**. Anything in the DOCX beyond the PDF (lead management, Image Studio) is Out of Scope per SCOPE-BASELINE.

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
| [08-Design-Review.md](08-Design-Review.md) | Review of `design/` against this analysis: gaps, deviations, corrections |
| [09-Verification-Checklist.md](09-Verification-Checklist.md) | Evidence (file:line) for each 08 finding, with a verdict column to fill in |
| [10-Cursor-Change-Review.md](10-Cursor-Change-Review.md) | Review of Cursor's uncommitted changes: A3 not fixed, severity contradiction, scope creep |
| [11-Cursor-Instructions.md](11-Cursor-Instructions.md) | Step-by-step instructions for Cursor: back up its work, re-apply only A2 / A3 / B4 |
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

- **Source**: `PDF §x` / `DOC` / `SCOPE` (not in the source text; added by the signed scope) / `Derived` (a decision needed to build it; listed in 07 for confirmation)
- **Priority**: `Must` (explicit in the source) / `Should` (needed to build, not in the source) / `Could` (optional) / `Won't` (not this release)
