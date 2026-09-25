# 03 CRM Customer Management

## 1. Source points (PDF §4, DOC)

- One record per customer, with purchases linked back to DMS vehicle records.
- The DOC mentions "lead and customer lifecycle management", but SCOPE rules **leads / follow-up out of scope**; CRM is the four fields plus vehicle links.

## 2. Field details

| # | Field | Code | Required | Validation | Source |
|---|---|---|---|---|---|
| 1 | Name | `name` | ✅ | 1–100 chars | PDF |
| 2 | Email | `email` | ✅ | Email format, ≤ 254 chars, stored lower-case | PDF |
| 3 | Phone | `phone` | ✅ | 7–20 digits, allows `+ - ( ) space` | PDF / Derived |
| 4 | Home address | `homeAddress` | ✅ | 1–300 chars, single text field | PDF |
| 5 | Car(s) purchased | `vehicles` | ❌ | Multi-select link to this dealer's DMS vehicles | PDF (no `*`) |

> "Car(s) purchased" sits under the Required fields heading but has no asterisk. It is treated as **optional**: a new customer may not have bought yet. See 07 Q-03.

## 3. Link rules

- Customer : vehicle = 1 : N (a customer can buy several cars).
- Vehicle : customer = 1 : 0..1 (**a vehicle belongs to at most one customer**).
- Only vehicles of **the same dealer** can be linked.
- Only **in-stock** (`IN_STOCK`), not-yet-linked vehicles can be linked; sold vehicles cannot be newly linked.
- The link of a sold vehicle cannot be removed (sale records cannot be erased).

## 4. Requirements

| ID | Requirement | Source | Priority |
|---|---|---|---|
| CRM-01 | Add a customer; all four fields are required, with per-field errors | PDF §4 | Must |
| CRM-02 | Edit a customer's four fields | PDF §7 | Must |
| CRM-03 | Customer list: 10 per page, search by name / email / phone | SCOPE / Derived | Must |
| CRM-04 | Customer detail: basic info, linked vehicles (year make model, VIN, status), audit history | PDF §4, §6 | Must |
| CRM-05 | From customer detail, pick and link an in-stock, unlinked vehicle of the same dealer | PDF §4 | Must |
| CRM-06 | The link picker lists only linkable vehicles, never other dealers' or already-linked ones | PDF §4 | Must |
| CRM-07 | Linking a vehicle already linked to another customer returns `VEHICLE_ALREADY_LINKED` | SCOPE | Must |
| CRM-08 | In-stock vehicles can be unlinked; unlinking a sold vehicle returns `SOLD_LOCKED` | SCOPE | Must |
| CRM-09 | Linking a sold / not-in-stock vehicle returns `WRONG_DEALER_OR_SOLD`; another dealer's vehicle id is always 404 | SCOPE | Must |
| CRM-10 | Navigate from vehicle detail to its customer and back | Derived | Should |
| CRM-11 | Create, edit, link, and unlink all write audit entries | PDF §6 | Must |
| CRM-12 | Customer phone / email / address are **never** sent to AI prompts, audit summaries, or assistant answers | SCOPE (privacy) | Must |
| CRM-13 | A duplicate email within a dealer shows a **warning** but is not blocked (families share email) | Derived | Could |
| CRM-14 | Deleting customers is not offered in this release | Derived | Won't |
| CRM-15 | Leads, follow-up tasks, sales funnel | DOC | Won't (excluded by SCOPE) |

## 5. Typical flow

```
Salesperson creates customer → "Link vehicle" on customer detail → pick in-stock vehicle → save
                             → in DMS, enter sold date + sold price → vehicle becomes SOLD, link is locked
```

> Linking and selling are two steps. Whether linking should prompt "record the sale now" is open; see 07 Q-04.
