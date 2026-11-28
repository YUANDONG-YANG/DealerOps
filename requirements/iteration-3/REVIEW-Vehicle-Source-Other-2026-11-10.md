# Vehicle source "Other" requirement review

Date: 2026-11-10  
Status: Resolved (Robin, 2026-11-10; see §6)  
Requirement: DMS-19  
Reviewed document: [CR-Vehicle-Source-Other-2026-11-09.md](CR-Vehicle-Source-Other-2026-11-09.md)

## 1. Conclusion

The document describes the current implementation scope, but it is not yet a complete basis for accepting the original client request. The main unresolved issue is whether the client accepted the reduced scope. There is also a direct conflict between acceptance case SRC-02 and the API contract.

This review records findings and proposed decisions only. It does not approve a scope change or modify the requirement, API contract, or implementation.

## 2. Review basis

Static review covered:

- The requirement document linked above.
- [Feature extensions, DMS-19](../../design/21-Feature-Extensions.md).
- [Backend API contract, sections 4.1 and 4.1a](../../design/14-Backend-API-Contract.md).
- [OpenAPI specification](../../dealer-platform/openapi.yaml).
- [Vehicle service](../../backend/dotnet/DealerOps.Core/Vehicle/VehicleService.cs), vehicle request DTOs, and the React DMS form, list, and API client.

No builds, automated tests, or runtime smoke checks were performed. Implementation observations below are based on source inspection.

## 3. Findings

### R1 — High: Client approval of the reduced scope is not recorded

Section 1 asks for the name of the place from which the vehicle was acquired and its address after selecting a source. Section 2 instead delivers one custom source field only for Other, with examples such as "Lease return" and "Fleet sale". Those examples describe acquisition categories, not necessarily a place or seller name.

The document records a team decision, but does not record client acceptance of this change. The absence of a record does not establish that approval was never given; it means the requirement cannot currently demonstrate it.

Proposed action:

- Record whether this is a client-approved replacement or a partial delivery awaiting confirmation.
- Record the approver, date, and supporting feedback reference when available.
- State whether the original name/address request is withdrawn, deferred, or tracked separately, with a reference if one exists.
- Define whether Other source means an acquisition category, an organization/place name, or unrestricted source text.

### R2 — Medium: SRC-02 contradicts the spelling rule in the API contract

SRC-02 adds "Lease return" and "lease return " and expects one option spelled "Lease return". The API contract and OpenAPI instead specify the spelling from the most recently added vehicle. The service orders by creation time before case-insensitive deduplication.

If the vehicles are created in the listed order with distinct creation times, the expected option under the current contract is "lease return" after trimming.

Proposed action: Preserve the existing contract and revise SRC-02 to state creation order and the expected lowercase option. The filter must still return both vehicles. If a different display policy is desired, change the contract and implementation together.

### R3 — Medium: The historical blank-value exception needs precise boundaries

DMS-19.1 says Other source is required. D1 allows an older Other vehicle to remain blank "until someone edits the source," without defining whether this means changing the dropdown, editing the custom text, or saving a different vehicle field.

Current frontend and backend logic allow a blank value when the stored vehicle is already Other and its custom source is blank. The exception is based on stored state, rather than an explicit creation-date cutoff.

Proposed rules for approval:

- An existing Other vehicle with no custom source may retain that blank value when unrelated fields are edited.
- Once a custom source has been saved, it cannot subsequently be cleared while the vehicle remains Other.
- After a change to another source has been saved, a later change back to Other requires a custom source.
- Define whether an unsaved Other-to-Auction-to-Other toggle preserves the legacy exception and the typed value.
- Display historical blank records as "Other", without a colon or null placeholder.
- All other includes historical Other records with blank custom sources.

### R4 — Medium: PATCH omission and clearing semantics are unclear

The contract describes required values and the historical exception, but does not explicitly distinguish omitted sourceOther, null, an empty string, and whitespace for a vehicle that already has a custom source.

The current service passes body.SourceOther directly to validation. For an existing nonblank Other vehicle, omission therefore reaches required-field validation, even when the caller intends to edit another field. This is an API contract ambiguity; it is not established here as a runtime regression.

Proposed action: Explicitly choose and document whether callers must resend the existing custom source or whether omission preserves it. Define null, empty, and whitespace behavior separately, and keep all affected callers consistent with the chosen contract.

### R5 — Medium: Length normalization order is underspecified

The requirement says "at most 100 characters, trimmed" without specifying whether trimming occurs before length validation. React validates the trimmed length, while the request DTOs apply MaxLength(100) to the incoming value. The React API client trims before sending, but direct API callers can supply untrimmed input.

Proposed action: Define the normalization order explicitly. If length is measured after trimming, ensure the API follows that rule as well. Include a case with a 100-character value surrounded by spaces, in addition to ordinary 100/101-character boundaries.

### R6 — Medium: Acceptance coverage does not cover several stated requirements

The five existing acceptance cases omit tenant isolation, legacy compatibility, length boundaries, and several option-list and filtering behaviors. Existing API documentation already defines permissions, exclusion of deleted vehicles, case-insensitive ordering, and selection of the latest-created spelling. These rules can be referenced rather than duplicated, but should have acceptance coverage.

The additional cases below are proposed manual acceptance scenarios, not a request to create or modify test code.

## 4. Proposed additional acceptance scenarios

| Area | Scenario | Expected behavior or decision needed |
|---|---|---|
| Required input | Create Other with empty or whitespace-only text, including through the API | Reject with a sourceOther validation error; do not save |
| Length | Submit 100 and 101 characters, and 100 characters surrounded by spaces | Apply the approved trim/length rule consistently in UI and API |
| Legacy record | Edit unrelated fields on an existing Other record with no custom source | Allow the blank under the approved legacy rule; display "Other" |
| Legacy transition | Fill in the legacy custom source, save, then attempt to clear it | Reject clearing while the source remains Other |
| Source transition | Save Other as Auction, then edit it back to Other | Require a custom source; the earlier value is no longer stored |
| PATCH semantics | Send sourceOther omitted, null, empty, and whitespace on an existing named Other vehicle | Follow the explicitly approved omission/clearing rules |
| Tenant isolation | Use two dealerships with distinct custom source names | Suggestions, options, and filtered results expose only the current dealership's data |
| Option population | Use in-stock, sold, deleted, and historical blank Other records | Include named in-stock and sold records; exclude deleted records and blank option labels |
| Option lifecycle | Change the last vehicle using a custom name to Auction, or delete that vehicle | The name disappears from a freshly fetched option list; define when the UI refreshes it |
| Deduplication | Add differently cased names at distinct creation times | One option uses the latest-created vehicle's spelling; selecting it returns both vehicles |
| All other | Select Other and All other | Return Other vehicles including historical blank records, subject to other active filters |
| Combined filters | Combine a custom source with Status and other list filters | Apply filters with AND; option population remains independent of Status |
| Pagination | Change the source filter while viewing a later results page | Confirm or specify reset to the first page so matching results are visible |
| Suggestions | Enter a new name and select an existing suggestion | Both paths are supported; suggestions do not restrict input to existing names |
| Persistence and audit | Edit a custom name, save, and reopen the vehicle | Show the saved name; audit records the old and new values |
| Sold lock | Attempt to change a sold vehicle's valid custom source | UI prevents editing; API returns 409 SOLD_LOCKED for the prohibited change |
| Permissions | Request source options as an admin or an unbound user | Return 403 as defined by the API contract |

## 5. Review decisions requested

1. Confirm the business scope and whether client approval of the reduced scope exists (R1).
2. Approve aligning SRC-02 with the current latest-created spelling policy (R2).
3. Confirm the exact legacy blank-value and unsaved-toggle rules (R3).
4. Choose PATCH omission semantics and normalization order (R4 and R5).
5. Approve the relevant acceptance additions and any required UI refresh/pagination behavior (R6).

After these decisions, update the existing requirement and relevant canonical design/API documents together where necessary. Keep product changes limited to the approved decisions.

## 6. Resolution (2026-11-10)

Robin reviewed the findings on 2026-11-10 and decided to implement all of them, including the client's original request. Sections 1–5 above are the reviewer's original text and are kept unchanged.

| Finding | Decision | Documented / implemented in |
|---|---|---|
| R1 | Build the client's original request as **DMS-20**: optional `acquiredFromName` (≤ 120) and `acquiredFromAddress` (≤ 255) on every vehicle, for any source, shown as **Acquired from** and **Acquired from address** once a Source is selected; audited and locked on a sold vehicle. `sourceOther` stays the category-style custom source for Other (DMS-19). Client acceptance of the earlier reduced scope is not recorded. | CR §2, §3 DMS-20.1–20.5, D4; `design/21-Feature-Extensions.md` §9 DMS-20; `design/14-Backend-API-Contract.md` §4.1; `dealer-platform/openapi.yaml`; `requirements/analysis/02-DMS-Vehicles.md`; `VehicleService`, vehicle DTOs, `VehicleEntity`, and the Core schema patch in `Program.cs` |
| R2 | Keep the contract: the merged option uses the latest-created spelling. SRC-02 now states the creation order and expects "lease return"; choosing it lists both vehicles. | CR §4 D2, §5 SRC-02 |
| R3 | Approve the proposed legacy rules. The exception depends only on the stored vehicle, so an unsaved Other → Auction → Other toggle still allows blank. Blank records display as "Other" and are included in **All other**. | CR §3 DMS-19.6–19.8, D5, SRC-06–09, SRC-15; `design/14-Backend-API-Contract.md` §4.1; `dealer-platform/openapi.yaml` (VehiclePatch) |
| R4 | Omitted, null, empty and whitespace-only `sourceOther` all mean "no value". PATCH replaces the field, so callers editing a named Other vehicle must resend it; omitting it → 400 `VALIDATION` (except the legacy case). | CR §3 DMS-19.9, D6, SRC-10; `design/14-Backend-API-Contract.md` §4.1; `dealer-platform/openapi.yaml` |
| R5 | Trim first, then check length, for `sourceOther` (100), `acquiredFromName` (120) and `acquiredFromAddress` (255). The request DTOs no longer carry `MaxLength` for these fields; `VehicleService` checks them. | CR §3 DMS-19.10, DMS-20.2, D7, SRC-11, ACQ-03; `design/14-Backend-API-Contract.md` §4.1; `dealer-platform/openapi.yaml`; `VehicleService` |
| R6 | Add the proposed scenarios as acceptance cases and automate them in Playwright (`playwright/tests/api/vehicle-source-other.spec.ts`, `playwright/tests/ui/dms-source-other.spec.ts`). Confirmed behavior: changing the Source filter returns to page 1; options reload after saves and deletes; suggestions do not restrict input; admin or unbound → 403; filters combine with AND and the options do not depend on Status. | CR §3 DMS-19.4–19.5, D8, §5 SRC-01–20 and ACQ-01–06; `design/21-Feature-Extensions.md` §9 DMS-19 |
