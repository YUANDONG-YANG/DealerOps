# Vehicle source "Other" — custom source name and filter (2026-11-09)

Requirement ID: **DMS-19** (canonical text in `design/21-Feature-Extensions.md` §9; API in `design/14-Backend-API-Contract.md` §4.1, §4.1a).

## 1. Client feedback

On the Add vehicle and Edit vehicle forms, the client said that after a source is selected, two writable boxes should appear: one for the name of the place the vehicle was acquired from and one for its address.

## 2. Interpretation

The **Source** dropdown has four fixed values: Trade in, Auction, Private purchase and Other. When a vehicle comes from anywhere that is not one of the first three, the record only says "Other" and loses the actual source.

The team decided to deliver the smallest change that closes that gap:

- Choosing **Other** shows one box, **Other source**, where the user types their own source (for example "Lease return" or "Fleet sale").
- The other three sources show no extra box.
- The DMS list can filter by source. Choosing **Other** shows a second dropdown, filled from the custom sources the dealership has already entered.

The name and address boxes for every source were **not** built. If the client still needs the seller's name and address, that is a separate request.

## 3. Requirements

| ID | Requirement |
|---|---|
| DMS-19.1 | With source **Other**, the form shows a required **Other source** box (at most 100 characters, trimmed). It suggests the custom sources already used in the dealership. |
| DMS-19.2 | With any other source, the box is hidden and no custom source is stored. Switching away from Other clears it on save. |
| DMS-19.3 | The custom source is audited like other vehicle fields and is locked once the vehicle is sold (`SOLD_LOCKED`). |
| DMS-19.4 | The DMS list has a **Source** filter. Choosing **Other** shows a second dropdown: **All other**, then the dealership's custom sources. Changing the first filter clears the second. |
| DMS-19.5 | The second dropdown lists the custom sources of the dealership's Other vehicles, both in stock and sold. Values that differ only in case are one entry. It never shows another dealership's values. |
| DMS-19.6 | The list's Source column shows `Other: <custom source>`. |

## 4. Decisions

| # | Question | Decision |
|---|---|---|
| D1 | Is the custom source required when Other is selected? | Yes. An Other vehicle saved before this change may keep it blank until someone edits the source. |
| D2 | How are spelling variants kept apart? | Values are trimmed on save, and the filter treats them case-insensitively. The form suggests existing values so users reuse them. |
| D3 | Does the second dropdown include sold vehicles? | Yes. It is not tied to the Status filter. |
| D4 | Name and address boxes for every source? | Not built (see §2). |

## 5. Acceptance

| Case | Steps | Expected |
|---|---|---|
| SRC-01 | Add a vehicle with source Other and an empty Other source | "Enter the source when Other is selected" under the box; nothing saved |
| SRC-02 | Add vehicles with Other sources "Lease return" and "lease return " | Both are saved. The filter's second dropdown shows a single "Lease return" option, and choosing it lists both vehicles |
| SRC-03 | Edit an Other vehicle, change its source to Auction and save | The box disappears and the list shows "Auction". The audit shows `source` and `sourceOther` changes |
| SRC-04 | Filter Source = Other, then switch to Trade in | The second dropdown disappears and its value is cleared |
| SRC-05 | Try to change the Other source of a sold vehicle through the API | 409 `SOLD_LOCKED` |
