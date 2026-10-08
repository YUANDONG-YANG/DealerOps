# Dealer Ops business (minimum)

Version v6.0 · 2026-09-21

Scope comes only from [DealerOps-Specification.pdf](../requirements/DealerOps-Specification.pdf). See 07/08/09/11 for technical design.

The specification requires three modules to write data for the same dealership: DMS, CRM, and Ad Compliance. This version meets that with one `dealer_core` database; it is not three disconnected systems. Login uses an email, username, or phone plus password; passwords are stored only as BCrypt hashes. The username also keys membership, audit, and JWT relationships, and new accounts must be bound to a dealership by an administrator.

**Authoritative dealer-auth design:** [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) §8 (email, username, or phone + password; two JWT roles; bind/unbind; landings; env). Classroom demos: [16-Acceptance-and-Test.md](16-Acceptance-and-Test.md) **CL-1** / **CL-2**. Coding entry still [IMPLEMENTATION-BRIEF.md](IMPLEMENTATION-BRIEF.md).

## Screens and roles

| Screen | Who uses it | What they do |
|---|---|---|
| Login | Everyone | Email, username, or phone + password sign-in (`/login` only) |
| Admin | Platform.Admin | Open dealerships; bind/unbind staff. Cannot see any vehicles, customers, or ads. Lands on `/admin` |
| DMS | Dealer.User | Create, update, and view this dealership’s vehicles; record a sale. Lands on `/dms` when bound |
| CRM | Dealer.User | Create, update, and view this dealership’s customers; associate this dealership’s vehicles |
| Ad compliance | Dealer.User | Select a vehicle, write an ad, run the OMVIC checklist + GitHub AI component, export text after a pass |
| Assistant | Dealer.User | In-store Q&A; calls the same GitHub component; cannot change data |
| No access | Signed in, unbound | Empty shell with Sign out; no business pages (`/`) |

Several staff at one dealership see the same data. Dealership A cannot see dealership B. After opening a dealership, an administrator still cannot see business data.

## Fields (per the specification; do not add or remove)

DMS required: Make, Model, Year, VIN, Car source (TRADE_IN / AUCTION / PRIVATE_PURCHASE / OTHER), Purchase cost, Date added, Condition (CERTIFIED / AS_IS / UNFIT / IRREPARABLE).  
Optional: Repair cost, Carfax URL, Sold date, Sold price.  
VIN is unique within a dealership. After a sale, purchase information cannot be changed. Sold date and sold price must be entered together.

CRM required: Name, Email, Phone, Home address. Purchases are selected from this dealership’s DMS; a vehicle can be attached to only one customer.

Ads: title, body, type CASH / FINANCE / LEASE, medium ONLINE or RADIO_TV_BILLBOARD.  
Always check: dealership name and contact details, previous use (when applicable), new/used and year, extended warranty (if any), price, condition.  
FINANCE additionally checks APR, term, and cash price. RADIO_TV_BILLBOARD is exempt from “shown alongside the interest rate.”  
LEASE additionally checks the lease statement, lease term, payment, APR, and down payment; if the annual allowance is below 20000 km, excess-kilometre charges are required.

After a vehicle price/condition change or an ad-body change, the old check is void. An AI failure must not be shown as a pass. Export to TXT is allowed only after a pass. There is no integration with external listing sites.

Every DMS/CRM change records: who, what, and when.

## Acceptance (classroom demonstration is sufficient)

1. An administrator opens two dealerships and binds one person to each.
2. Dealership A records a vehicle, records a customer, and attaches the vehicle to the customer; dealership B cannot see them.
3. An administrator calling the vehicle API is rejected.
4. A missing price, or a finance ad missing APR, is blocked.
5. Real ad text is sent through a real AI call once and missing items can be identified.
6. After a price change, an old check cannot be used to export.

Out of scope: work orders, leads, analytics dashboards, CSV import, buyer site. The assistant only reuses the GitHub component; no separate model layer is written.
