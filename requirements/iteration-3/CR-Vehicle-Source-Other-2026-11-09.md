# Vehicle source "Other" — custom source name and filter (2026-11-09)

Requirement IDs: **DMS-19** and **DMS-20** (canonical text in `design/21-Feature-Extensions.md` §9; API in `design/14-Backend-API-Contract.md` §4.1, §4.1a). Review: [REVIEW-Vehicle-Source-Other-2026-11-10.md](REVIEW-Vehicle-Source-Other-2026-11-10.md).

## 1. Client feedback

On the Add vehicle and Edit vehicle forms, the client said that after a source is selected, two writable boxes should appear: one for the name of the place the vehicle was acquired from and one for its address.

## 2. Interpretation

The **Source** dropdown has four fixed values: Trade in, Auction, Private purchase and Other. The feedback covers two gaps:

- When a vehicle comes from anywhere that is not one of the first three, the record only says "Other" and loses the kind of source. **DMS-19** adds a category-style custom source for Other (for example "Lease return" or "Fleet sale"), and the DMS list can filter by it.
- The client's literal request is the seller: who the vehicle was acquired from and where. **DMS-20** adds two optional boxes, **Acquired from** (person or business name) and **Acquired from address**, shown for every source once a source is selected.

The first delivery (2026-11-09) built DMS-19 only. After the review on 2026-11-10, Robin decided to build the client's original request as DMS-20 as well. No client acceptance of the earlier reduced scope is recorded.

## 3. Requirements

| ID | Requirement |
|---|---|
| DMS-19.1 | With source **Other**, the form shows a required **Other source** box. It suggests the custom sources already used in the dealership; suggestions do not restrict input. |
| DMS-19.2 | With any other source, the box is hidden and no custom source is stored. Switching away from Other clears it on save. |
| DMS-19.3 | The custom source is audited like other vehicle fields and is locked once the vehicle is sold (`SOLD_LOCKED`). |
| DMS-19.4 | The DMS list has a **Source** filter. Choosing **Other** shows a second dropdown: **All other**, then the dealership's custom sources. Changing the first filter clears the second and returns to page 1. Filters combine with AND. |
| DMS-19.5 | The second dropdown lists the custom sources of the dealership's Other vehicles, in stock and sold, not deleted, and never blank. Values that differ only in case are one entry, spelled as on the most recently created vehicle. It never shows another dealership's values and does not depend on the Status filter. The options reload after a vehicle is saved or deleted. |
| DMS-19.6 | The list's Source column shows `Other: <custom source>`, or `Other` (no colon) for a legacy blank record. |
| DMS-19.7 | Legacy blank: an Other vehicle stored without a custom source (saved before DMS-19) may keep it blank while other fields are edited. The exception depends only on the stored vehicle, so toggling Other → Auction → Other in an unsaved form still allows blank. **All other** includes these vehicles. |
| DMS-19.8 | Once a custom source is saved, it cannot be cleared while the source stays Other. After a change to another source is saved, changing back to Other requires a custom source. |
| DMS-19.9 | API: omitted, `null`, empty and whitespace-only `sourceOther` all mean "no value". PATCH replaces the field, so a caller editing a named Other vehicle must resend it; omitting it → 400 `VALIDATION` "Enter the source when Other is selected." (except DMS-19.7). |
| DMS-19.10 | `sourceOther` is trimmed first, then checked: at most 100 characters, else 400 `VALIDATION` "At most 100 characters.". Surrounding spaces do not count. |
| DMS-20.1 | Every vehicle, for any source, has optional `acquiredFromName` (≤ 120) and `acquiredFromAddress` (≤ 255). Once a Source is selected, the add and edit forms show **Acquired from** and **Acquired from address**. |
| DMS-20.2 | Both are trimmed first and length-checked after trimming; blank is stored as `null`. Too long → 400 `VALIDATION` with `fieldErrors.<field>` = "At most 120 characters." / "At most 255 characters.". |
| DMS-20.3 | Optional on create. PATCH replaces them like the other optional fields: omitted, `null`, empty or whitespace-only clears the stored value. |
| DMS-20.4 | Both are audited on create and patch, and locked on a sold vehicle (409 `SOLD_LOCKED`) like source. |
| DMS-20.5 | Storage: `vehicle.acquired_from_name VARCHAR(120) NULL` and `vehicle.acquired_from_address VARCHAR(255) NULL`, added by the Core startup schema patch. |

## 4. Decisions

| # | Question | Decision |
|---|---|---|
| D1 | Is the custom source required when Other is selected? | Yes, with the legacy exception in DMS-19.7 and DMS-19.8. |
| D2 | How are spelling variants kept apart? | Values are trimmed on save, and the filter treats them case-insensitively. The merged option uses the spelling of the most recently created vehicle (design/14 §4.1a). The form suggests existing values so users reuse them. |
| D3 | Does the second dropdown include sold vehicles? | Yes. It is not tied to the Status filter. |
| D4 | Name and address boxes for every source? | Built as DMS-20 (Robin, 2026-11-10). `sourceOther` stays the category-style source for Other. |
| D5 | Where does the legacy blank exception end? (review R3) | DMS-19.7 and DMS-19.8; it is based on the stored vehicle, not on a creation date or on unsaved form state (Robin, 2026-11-10). |
| D6 | Does PATCH omission preserve `sourceOther`? (review R4) | No. PATCH replaces the field; omitted, null, empty and blank are all "no value" (Robin, 2026-11-10). |
| D7 | Is length checked before or after trimming? (review R5) | After trimming, for `sourceOther`, `acquiredFromName` and `acquiredFromAddress`. `VehicleService` checks the limits; the request DTOs carry no `MaxLength` for these fields (Robin, 2026-11-10). |
| D8 | How is acceptance covered? (review R6) | Automated in Playwright: `playwright/tests/api/vehicle-source-other.spec.ts` and `playwright/tests/ui/dms-source-other.spec.ts`. |

## 5. Acceptance

| Case | Steps | Expected |
|---|---|---|
| SRC-01 | Add a vehicle with source Other and an empty or whitespace-only Other source, in the UI and through the API | "Enter the source when Other is selected" under the box; API 400 `VALIDATION` on `sourceOther`; nothing saved |
| SRC-02 | Add an Other vehicle with source "Lease return", then a second one with "lease return " | Both are saved. The second dropdown shows a single "lease return" option (latest-created spelling), and choosing it lists both vehicles |
| SRC-03 | Edit an Other vehicle, change its source to Auction and save | The box disappears and the list shows "Auction". The audit shows `source` and `sourceOther` changes |
| SRC-04 | Filter Source = Other, then switch to Trade in | The second dropdown disappears and its value is cleared |
| SRC-05 | Try to change the Other source of a sold vehicle through the API | 409 `SOLD_LOCKED` |
| SRC-06 | Legacy: edit an unrelated field on an Other vehicle stored without a custom source | Saved with the blank kept; the list shows "Other" (no colon) |
| SRC-07 | Legacy: in the edit form toggle Other → Auction → Other without saving, leave the box blank, save | Saved; blank still allowed |
| SRC-08 | Legacy: fill in the custom source, save, then try to clear it | Saved first; clearing → 400 `VALIDATION` on `sourceOther` |
| SRC-09 | Change an Other vehicle to Auction and save, then change it back to Other with a blank box | 400 `VALIDATION` on `sourceOther`; the earlier value is no longer stored |
| SRC-10 | PATCH a named Other vehicle with `sourceOther` omitted, `null`, `""` and `"   "` | Each → 400 `VALIDATION` "Enter the source when Other is selected."; the stored value is unchanged |
| SRC-11 | Save `sourceOther` of 100 characters, of 100 characters wrapped in spaces, and of 101 characters | 100 accepted; wrapped value accepted and stored as 100 characters; 101 → 400 "At most 100 characters." |
| SRC-12 | Two dealerships save different custom sources | Each dealership's options, suggestions and filtered results show only its own values |
| SRC-13 | Options with in-stock, sold, deleted and legacy blank Other vehicles | In-stock and sold names listed; deleted vehicles and blank values left out |
| SRC-14 | Change the last vehicle using a name to Auction, or delete it | The name disappears from the options after the save or delete, without reloading the page |
| SRC-15 | Filter Source = Other with **All other** | All Other vehicles, including legacy blank records |
| SRC-16 | Combine a custom source with Status = Sold and a keyword | Only vehicles matching all filters; the options are the same whatever the Status |
| SRC-17 | On page 2 of the list, change the Source filter | The list returns to page 1 |
| SRC-18 | Type a new name, and pick an existing suggestion | Both are saved; suggestions do not restrict input |
| SRC-19 | Edit a custom source, save, reopen the vehicle | The new name shows; the audit records the old and new values |
| SRC-20 | Request the options as an admin and as an unbound user | 403 |
| ACQ-01 | Add a vehicle with source Auction, Acquired from "Metro Auto Auction" and an address | Both saved, shown on reopen, and in the create audit |
| ACQ-02 | Add a vehicle with neither box filled, or with whitespace only | Saved; both fields `null` |
| ACQ-03 | Save a name of 120 and 121 characters and an address of 255 and 256 characters (also wrapped in spaces) | 120 and 255 accepted (wrapped values stored trimmed); 121 → 400 "At most 120 characters." on `acquiredFromName`; 256 → 400 "At most 255 characters." on `acquiredFromAddress` |
| ACQ-04 | PATCH a vehicle with stored name and address, omitting them, then with `null`, `""` or `"  "` | The stored values are cleared; the audit shows the change |
| ACQ-05 | Change the name or address of a sold vehicle through the API | 409 `SOLD_LOCKED` |
| ACQ-06 | Open the add form, select each source in turn | The two boxes appear once a source is selected, for every source; Other also shows the Other source box |
