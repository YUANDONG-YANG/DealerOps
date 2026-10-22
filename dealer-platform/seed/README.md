# DealerOps demo seed data

Realistic demo data for local development and classroom demos. Every business table receives at
least 30 rows. The seed is additive: it never touches rows that existed before it ran, and
`scripts/load-seed.sh --reset` removes only the 30 seed dealerships and everything they own.

## Layout

| Path | Owner | Content |
|---|---|---|
| `contract/dealers.json` | generated | 30 dealerships (`D01`–`D30`) and two staff accounts each |
| `contract/kijiji-snapshot.json` + `scripts/fetch_kijiji.py` | fetched | Real Ontario used-vehicle listings from Kijiji (VIN, year, trim, mileage, colour, asking price, listing URL) |
| `contract/vehicles-plan.json` | generated | 120 vehicles taken from the Kijiji snapshot, plus source, condition, status, dates |
| `contract/customers-plan.json` | generated | 120 customers (four per dealership) |
| `scripts/gen_contract.py` | generated | Deterministic generator for the three contract files (vehicles from the Kijiji snapshot); do not hand-edit its output |
| `sql/01_dealers_users.sql` | seed task | `dealer`, `app_user`, `membership` |
| `sql/02_vehicles.sql` | seed task | `vehicle` (costs and sale prices derived from the real Kijiji asking price) |
| `sql/03_customers_links.sql` | seed task | `customer`, `customer_vehicle` |
| `sql/04_listings.sql` + `scripts/gen_listings.py` | generated | `listing`, `compliance_check`; ad copy describes each real Kijiji vehicle, findings follow `OmvicRuleEngine` |
| `sql/05_leads.sql` | seed task | `sales_lead`, `sales_lead_note` |
| `sql/06_work_orders.sql` | seed task | `work_order` |
| `sql/07_join_requests.sql` | seed task | pending `app_user` rows and `notification` |
| `sql/08_audit.sql` | seed task | `audit_event` history for all seeded records |
| `images/` + `scripts/load_photos.py` | seed tasks | Vehicle photos: freely licensed Wikimedia Commons photos of the same make and model. Kijiji listing photos (`images/kijiji/`, git-ignored, `fetch_kijiji.py --photos`) are never loaded, because they carry the advertising dealerships' branding |
| `scripts/load-seed.sh` | integration | Runs the SQL files in order, then the photo loader |

## Natural keys

Seed files never hardcode auto-increment ids. Resolve references with these lookups:

```sql
SET @d01 = (SELECT id FROM dealer WHERE contact_email = 'sales@lakeshoreautosales.ca');
-- vehicle
(SELECT id FROM vehicle WHERE dealer_id = @d01 AND vin = '4S4BSANC7PD155400')
-- customer
(SELECT id FROM customer WHERE dealer_id = @d01 AND email = 'ryangrant52@hotmail.com')
-- listing (one per vehicle)
(SELECT id FROM listing WHERE vehicle_id = (SELECT id FROM vehicle WHERE dealer_id = @d01 AND vin = '...'))
```

## Conventions

- Enum columns store UPPER_SNAKE_CASE: `TRADE_IN`, `AS_IS`, `IN_STOCK`, `SUV`, `IN_PROGRESS`, `RADIO_TV_BILLBOARD`.
- Roles: `Platform.Admin`, `Dealer.User`. Seed staff are `Dealer.User` with `dealer_id` set and an
  active `membership` row (`created_by = 'admin'`).
- All seed accounts share one BCrypt hash; the plain demo password is handed over out of band and
  is never written to the repository.
- Phone numbers use the reserved fictional `555-01xx` range. Customer e-mail addresses are synthetic.
- Dates are relative to 2026-10-16. Timestamps are UTC.
- Every file starts with `SET NAMES utf8mb4;` and is safe to run once against a database created by
  `DealerOps.Core` (run Core once first so its startup schema patches have been applied).
- Business rules from `requirements/analysis/02`–`05` hold for every row: sold vehicles have both
  `sold_on` and `sold_price`; `sold_on >= added_on`; a vehicle links to at most one customer; ads
  and checks reflect the rule engine in `backend/dotnet/DealerOps.Core/Compliance/OmvicRuleEngine.cs`.
- Customer phone, e-mail and address never appear in `audit_event.field_summary` values.

## Loading

```bash
MYSQL_PWD=<local dev password> dealer-platform/seed/scripts/load-seed.sh          # add --reset to reload
SEED_PYTHON=<python with Pillow> MYSQL_PWD=... dealer-platform/seed/scripts/load-seed.sh   # also store enhanced photos
```

A cloud demo uses the same script. `./deploy/deploy.sh --apply --seed` applies Terraform, uploads the apps, then runs this loader against Azure MySQL with TLS and without `--reset`. `terraform apply` by itself does not load the seed. See [deploy/README.md](../../deploy/README.md).

Staff accounts sign in with their username, e-mail, or `+1` phone number from
`contract/dealers.json`. Photos in `images/` (outside `images/kijiji/`) come from Wikimedia Commons under free licences;
see `images/ATTRIBUTION-a.md` and `images/ATTRIBUTION-b.md`. Generator scripts under `scripts/`
are deterministic and regenerate the matching SQL file.
