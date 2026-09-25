# 02 DMS Vehicle Management

## 1. Source points (PDF §3)

One record per vehicle, tracked from acquisition through sale.

## 2. Field details

| # | Field | Code | Required | Type | Validation | Source |
|---|---|---|---|---|---|---|
| 1 | Make | `make` | ✅ | Text | 1–50 chars, trimmed | PDF |
| 2 | Model | `model` | ✅ | Text | 1–50 chars | PDF |
| 3 | Year | `year` | ✅ | Integer | 1900 ≤ year ≤ current year + 1 | PDF / Derived |
| 4 | VIN | `vin` | ✅ | Text | 17 chars, upper case, no I / O / Q; **unique within a dealer** | PDF / SCOPE |
| 5 | Car source | `source` | ✅ | Enum | `TRADE_IN` / `AUCTION` / `PRIVATE_PURCHASE` / `OTHER` | PDF ("etc." → OTHER) |
| 6 | Purchase cost | `purchaseCost` | ✅ | Money | ≥ 0, two decimals, CAD | PDF |
| 7 | Date added to garage | `addedOn` | ✅ | Date | Not after today | PDF / Derived |
| 8 | Vehicle condition | `condition` | ✅ | Enum | `CERTIFIED` / `AS_IS` / `UNFIT` / `IRREPARABLE` | PDF |
| 9 | Repair cost | `repairCost` | ❌ | Money | ≥ 0 | PDF |
| 10 | Carfax report link | `carfaxUrl` | ❌ | URL | `http(s)://`, ≤ 500 chars | PDF |
| 11 | Date sold | `soldOn` | ❌ | Date | ≥ date added, not after today | PDF / Derived |
| 12 | Sold price | `soldPrice` | ❌ | Money | > 0 | PDF |

System fields (not in the source, needed to build): `id`, `dealerId`, `status` (`IN_STOCK` / `SOLD`), `version` (optimistic lock), `createdAt`, `updatedAt`.

**No extra fields**: mileage, colour, fuel, stock number, list price, images, etc. are not built (SCOPE: specification PDF fields, no additions or removals).

## 3. Vehicle status

```
[new] ──► IN_STOCK ──(enter sold date + sold price)──► SOLD
```

- Only two states; no reconditioning, sale-ready, or archive.
- The server derives status: both sale fields present → `SOLD`, otherwise `IN_STOCK`.
- Undoing a sale is not supported in this release (see 07).

## 4. Requirements

| ID | Requirement | Source | Priority |
|---|---|---|---|
| DMS-01 | A dealer user can add a vehicle; all 8 required fields must be present, with per-field errors when missing | PDF §3 | Must |
| DMS-02 | Repair cost and Carfax link are optional | PDF §3 | Must |
| DMS-03 | VIN is unique within a dealer (`VIN_DUP` on duplicate); different dealers may hold the same VIN | SCOPE | Must |
| DMS-04 | VIN is upper-cased and validated as 17-character format | Derived | Should |
| DMS-05 | Car source and condition are dropdowns limited to the enum values | PDF §3 | Must |
| DMS-06 | Vehicle list: paged (10 per page by default), newest first | SCOPE | Must |
| DMS-07 | The list supports keyword search on VIN / make / model and filters on status and condition | SCOPE | Should |
| DMS-08 | Vehicle detail shows all fields, the linked customer, and audit history | PDF §3, §6 | Must |
| DMS-09 | All fields of an in-stock vehicle can be edited | PDF §7 | Must |
| DMS-10 | Selling: sold date and sold price **must be entered together**; entering only one returns `SOLD_PAIR_REQUIRED` | SCOPE | Must |
| DMS-11 | After sale, acquisition fields are locked (make, model, year, VIN, source, purchase cost, date added, repair cost, Carfax); edits return `SOLD_LOCKED` | SCOPE | Must |
| DMS-12 | A sold vehicle cannot be sold again | SCOPE | Must |
| DMS-13 | Concurrent edits: writes carry `version`; a mismatch returns `VERSION_CONFLICT` and the UI asks the user to refresh | SCOPE | Should |
| DMS-14 | Create, edit, and sell all write audit entries | PDF §6 | Must |
| DMS-15 | Changing ad-relevant fields such as condition turns the vehicle's passed ad check Stale | SCOPE | Must |
| DMS-16 | Derived values such as profit (sold price − purchase cost − repair cost) may be shown on detail, not stored | Derived | Could |
| DMS-17 | Deleting vehicles is not offered in this release (keeps audit and sale records) | Derived | Won't |

## 5. Edge cases

- Year = current year + 1 (early model-year release) is allowed; + 2 is rejected.
- Purchase cost of 0 (e.g. trade-in credit) is allowed.
- Sold price below cost is allowed (selling at a loss is real) and not blocked.
- After a linked vehicle is sold, its customer link cannot be removed (see CRM-08).
- `IRREPARABLE` vehicles can still be entered and sold (sold for parts), but ad compliance must disclose the condition truthfully.
