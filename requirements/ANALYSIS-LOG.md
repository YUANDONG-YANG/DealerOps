# Requirements Analysis Log

Record of work on the requirement sources in this folder. Newest entry first.

## 2026-09-25 · Requirements breakdown and design review

### Inputs

- `DealerOps-Specification.pdf` (2026-09-21): roles, DMS / CRM / ad-compliance fields, cross-cutting rules, pages, known limitations
- `Dos Car dealership.docx`: product vision (DealerOS)
- `../design/SCOPE-BASELINE.md`: signed scope and errata, used to resolve conflicts

### Output

New folder [analysis/](analysis/README.md):

| File | Content |
|---|---|
| 01–06 | Requirement items by module: AUTH, DMS, CRM, AD (rules AD-R01–R25), AUD / ARC / SEC / AI / NFR, UI + 23 acceptance cases (AT-01–AT-23) |
| 07 | Differences between the two sources, 15 assumptions (Q-01–Q-15), questions for the client, risks |
| 08 | Review of `design/` against the analysis |
| 09 | Verification checklist: evidence per finding, verdict column for manual review |
| Traceability-Matrix | Source → requirement ID → design doc → acceptance case |

Each requirement carries a source (`PDF §x` / `DOC` / `SCOPE` / `Derived`) and a priority (Must / Should / Could / Won't).

### Design review result (details in analysis/08)

The design matches the source on roles, tenant isolation, DMS / CRM fields, sale pair, sold lock, one vehicle one customer, audit, five check states, Ready + TXT, Gateway, and the assistant.

Open items:

| ID | Severity | Summary |
|---|---|---|
| A1 | High | No salesperson checklist; "if applicable" disclosures (previous use, warranty) are only checked when the copy mentions them |
| A2 | High | Finance rules trigger on `adKind` only; a CASH ad showing a rate or payment skips them |
| A3 | High | A vehicle sold before being linked can never be linked to its buyer in CRM |
| A4 | Medium | AI success always gives PASSED; soft findings and AI notes are not required to show |
| A5 | Medium | Editing vehicle year / make / model / VIN or dealer info does not make a passed check Stale |
| A6 | Medium | No field format rules (VIN, year, email, phone, dates) in the API contract |
| A7–A10 | Low | Hard-coded rules, no legal disclaimer, backup undocumented, acceptance gaps |
| B4 | Sign-off | PROTOCOL §C.0a makes several spec "must disclose" items soft; not recorded in SCOPE-BASELINE errata |
| B5 | Sign-off | Broadcast exemption: design waives proximity only; the spec wording may waive APR / term / cash price entirely |

### Pending

Scope rule: meet the spec at its minimum. This is a graduation project, not a commercial product (see "Minimum-spec triage" in analysis/08).

0. Manually verify A2, A3, and B4 in analysis/09. The other findings are not planned.
1. A2: run finance rules when the copy shows a rate or payment, not only for `adKind=FINANCE`.
2. A3: allow linking a SOLD vehicle that has no customer yet.
3. B4: add one erratum line to SCOPE-BASELINE.

Not planned: A1, A4–A10, B5.

No files under `design/` were changed in this round.
