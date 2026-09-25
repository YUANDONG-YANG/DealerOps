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

Open issues to hand to the developer (verified against code on 2026-09-25):

| ID | Where | Issue | Smallest fix |
|---|---|---|---|
| A2 | `dealer-core/.../compliance/OmvicRuleEngine.java` (the `if (listing.getAdKind() == AdKind.FINANCE)` block) | A CASH ad showing "$299 per month" or an APR skips all finance rules and can reach PASSED. Spec §5: finance rules apply "if the ad shows a rate or payment". | Also enter the finance block when a CASH ad matches `APR` or a payment pattern. Add one unit case. Update PROTOCOL C.1 and 15 §6. |
| A3 | `dealer-core/.../customer/CustomerService.java` `link()` (the `IN_STOCK` check) and `dealer-web/src/views/CrmView.vue` `loadLinkOptions()` (`status: 'IN_STOCK'`) | A vehicle sold before being linked can never be linked to its buyer. Spec §4 "Car(s) purchased". | Drop the `IN_STOCK` check; the unique key still enforces one vehicle, one customer. Drop the status filter in the picker. Update 12 / 13 / 14 / 15 / 16 BE-05 and `CustomerVehicleLinkIT.soldCannotBeNewlyLinked`. |
| B4 | `design/SCOPE-BASELINE.md` errata | PROTOCOL §C.0a makes several "must disclose" items soft, but it isn't a signed erratum. | Add erratum 4: some OMVIC disclosures are review hints, not blockers (see PROTOCOL §C.0a). |

Not planned: A1, A4–A10, B5.

No code or `design/` files are changed by this analysis. A fix commit was made and reverted, because this analysis only records issues.
