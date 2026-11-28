import json, random, string, sys
from datetime import datetime, date, time, timezone
from zoneinfo import ZoneInfo

plan = json.load(open(sys.argv[1]))
out = sys.argv[2]
rng = random.Random(20261016)
TOR = ZoneInfo("America/Toronto")

def retail(v):
    # The real Kijiji asking price is the retail anchor for cost and sale price.
    return v["asking_price"]

def r25(x): return round(x / 25) * 25
def ask(x):
    x = round(x / 100) * 100
    return x - 5 if rng.random() < .6 else x

def ts(d, lo=9, hi=18):
    local = datetime.combine(date.fromisoformat(d), time(rng.randint(lo, hi - 1), rng.randint(0, 59), rng.randint(0, 59)), TOR)
    return local.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

def money(x): return "NULL" if x is None else f"{x:.2f}"
def s(x): return "NULL" if x is None else "'" + x.replace("'", "''") + "'"

TOK = string.ascii_letters + string.digits
rows = []
stats = []
for v in plan:
    rp = retail(v); c = v["condition_code"]
    if c == "CERTIFIED":
        cost = r25(rp * rng.uniform(.72, .82)); rep = None if rng.random() < .15 else round(rng.uniform(350, 2600), 2)
        sold = ask(rp * rng.uniform(.97, 1.03))
    elif c == "AS_IS":
        cost = r25(rp * rng.uniform(.60, .72)); rep = None if rng.random() < .35 else (0.0 if rng.random() < .3 else round(rng.uniform(150, 900), 2))
        sold = ask(rp * rng.uniform(.85, .93))
    elif c == "UNFIT":
        cost = r25(rp * rng.uniform(.30, .42)); rep = round(rng.uniform(2600, 4500), 2)
        sold = ask(rp * rng.uniform(.62, .74))
    else:  # IRREPARABLE: bought for parts value
        cost = r25(min(3000, max(500, rp * rng.uniform(.06, .12))))
        rep = None if rng.random() < .6 else 0.0
        sold = round(cost * rng.uniform(.65, 1.40) / 50) * 50
    if v["status"] != "SOLD": sold = None
    carfax = f"https://vhr.carfax.ca/?id={''.join(rng.choice(TOK) for _ in range(32))}" if rng.random() < .7 else None
    created = ts(v["added_on"])
    if v["status"] == "SOLD":
        updated = ts(v["sold_on"])
        if updated < created: updated = created
        ver = 1
    else:
        updated = created; ver = 0
    rows.append((v, cost, rep, carfax, sold, ver, created, updated))

L = []
L.append("""-- DealerOps demo seed: vehicle inventory (120 vehicles across 30 dealerships).
-- Source, condition, status and dates come from contract/vehicles-plan.json.
-- Identity, model year, trim, mileage and asking price are real Ontario Kijiji listings
-- (contract/kijiji-snapshot.json, kijiji_url in contract/vehicles-plan.json). Derived values:
--   purchase_cost = wholesale acquisition (about 72-82% of the asking price for CERTIFIED, 60-72% for
--   AS_IS, 30-42% for UNFIT, parts value $500-$3,000 for IRREPARABLE);
--   sold_price = within a few percent of the asking price for the condition at the time of sale.
-- Carfax links use the CARFAX Canada report-link format (https://vhr.carfax.ca/?id=...);
-- the tokens are synthetic and do not resolve to real reports.
-- Timestamps are UTC (dealer-local business hours, America/Toronto).

SET NAMES utf8mb4;
""")
emails = []
for v in plan:
    if v["dealer_email"] not in [e for _, e in emails]:
        emails.append((v["dealer_code"], v["dealer_email"]))
for code, e in sorted(emails):
    L.append(f"SET @{code.lower()} = (SELECT id FROM dealer WHERE contact_email = '{e}');")
L.append("")
cols = "dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at"
for v, cost, rep, carfax, sold, ver, created, updated in rows:
    d = "@" + v["dealer_code"].lower()
    vals = ", ".join([d, s(v["vin"]), s(v["make"]), s(v["model"]), str(v["model_year"]), s(v["body_type"]), s(v["source"]),
        s(v["condition_code"]), money(cost), money(rep), s(carfax), s(v["added_on"]), s(v["status"]), s(v["sold_on"]),
        money(sold), str(ver), s(created), s(updated)])
    L.append(f"INSERT INTO vehicle ({cols})\nSELECT {vals}\nFROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = {d} AND vin = {s(v['vin'])});")
open(out, "w").write("\n".join(L) + "\n")
