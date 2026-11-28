#!/usr/bin/env python3
"""Writes sql/10_vehicle_sources.sql: where each seed vehicle came from (DMS-19, DMS-20), plus 60 more vehicles.

Usage: gen_vehicle_sources.py

- Fills source_other for the seed's OTHER vehicles (two stay blank, as records saved before DMS-19),
  and acquired_from_name / acquired_from_address for most seed vehicles. Rows already holding any of
  these values are left alone, so edits made in the app survive a reload.
- Adds two in-stock vehicles per seed dealership from the Kijiji listings that contract/vehicles-plan.json
  does not use, with their VEHICLE CREATE audit rows in the form VehicleService.CreatedVehicleFields writes.

Deterministic: the same contract files always give the same SQL. Names and addresses are fictional.
"""
import json
import pathlib
import random
from datetime import date, datetime, timedelta

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "sql" / "10_vehicle_sources.sql"
rng = random.Random(20261110)

dealers = json.loads((ROOT / "contract" / "dealers.json").read_text(encoding="utf-8"))
plan = json.loads((ROOT / "contract" / "vehicles-plan.json").read_text(encoding="utf-8"))
listings = json.loads((ROOT / "contract" / "kijiji-snapshot.json").read_text(encoding="utf-8"))["listings"]
by_email = {d["contact_email"]: d for d in dealers}
var_of = {d["contact_email"]: "@d%02d" % (i + 1) for i, d in enumerate(dealers)}

# First letters and a few forward sortation areas per city, so addresses look local.
POSTAL = {
    "Toronto": ["M4C", "M6H", "M1B", "M9W"], "Mississauga": ["L5B", "L4T", "L5N"], "Brampton": ["L6S", "L6Y", "L7A"],
    "Hamilton": ["L8M", "L9C", "L8J"], "Ottawa": ["K1K", "K2G", "K1V"], "London": ["N5V", "N6E", "N6G"],
    "Kitchener": ["N2E", "N2M", "N2R"], "Windsor": ["N8T", "N9A", "N8W"], "Barrie": ["L4M", "L4N"],
    "Oshawa": ["L1G", "L1J", "L1K"], "Sudbury": ["P3A", "P3E", "P3B"], "Kingston": ["K7K", "K7M", "K7P"],
    "Guelph": ["N1E", "N1G", "N1H"], "St. Catharines": ["L2M", "L2N", "L2T"], "Peterborough": ["K9H", "K9J", "K9K"],
}
LETTERS = "ABCEGHJKLMNPRSTVWXYZ"
HOME_STREETS = ["Maple Ave", "Elm St", "Birchwood Dr", "Cedar Cres", "Oak Ridge Rd", "Willow Way", "Pinegrove Ct",
                "Lakeview Blvd", "Orchard Ln", "Highland Rd", "Sunnyside Ave", "Brookfield St", "Meadowvale Dr"]
BUSINESS_STREETS = ["Industrial Pkwy", "Commerce Dr", "Enterprise Rd", "Trade Centre Blvd", "Logistics Way",
                    "Service Rd", "Progress Ave", "Venture Ct"]
GIVEN = ["Liam", "Olivia", "Noah", "Emma", "Ethan", "Ava", "Lucas", "Sophia", "Mason", "Chloe", "Arjun", "Priya",
         "Mei", "Daniel", "Fatima", "Omar", "Grace", "Hannah", "Jacob", "Nadia", "Raj", "Sara", "Tyler", "Zoe"]
FAMILY = ["Thompson", "Singh", "Nguyen", "MacDonald", "Tremblay", "Chen", "Patel", "Wilson", "Gagnon", "Ali",
          "Campbell", "Roy", "Kowalski", "Fraser", "Martin", "Leblanc", "Wong", "Brown", "Ahmed", "Sullivan"]
AUCTIONS = ["Lakeridge Auto Auction", "Golden Horseshoe Dealer Auction", "Trillium Vehicle Auction",
            "Northshore Auto Exchange", "Kawartha Dealer Auction", "Ottawa Valley Auto Auction",
            "Southwestern Ontario Auto Auction", "Huronia Vehicle Auction"]
# OTHER sources: the custom source and who it came from. None means a private person's estate.
OTHER_SOURCES = [
    ("Lease return", ["Maple Leasing Corp.", "Northbridge Auto Leasing", "Lakeshore Lease Services"]),
    ("Fleet sale", ["Ontario Courier Group", "Greenline Utilities Inc.", "Metro Plumbing & Heating Ltd."]),
    ("Rental fleet", ["Northstar Car Rental", "Route 401 Rentals"]),
    ("Estate sale", None),
    ("Dealer transfer", "DEALER"),
    ("Bank repossession", ["Huron Credit Union", "Lakeview Auto Finance"]),
    ("Insurance salvage", ["Pinecrest Insurance Recovery"]),
]


def postal(city):
    fsa = rng.choice(POSTAL[city])
    return f"{fsa} {rng.randint(1, 9)}{rng.choice(LETTERS)}{rng.randint(1, 9)}"


def address(city, business):
    street = rng.choice(BUSINESS_STREETS if business else HOME_STREETS)
    return f"{rng.randint(10, 4999)} {street}, {city}, ON {postal(city)}"


def person():
    return f"{rng.choice(GIVEN)} {rng.choice(FAMILY)}"


def acquired_from(source, dealer, custom=None):
    """Returns (source_other, name, address) for one vehicle of a dealership."""
    city = dealer["city"]
    if source == "AUCTION":
        return None, rng.choice(AUCTIONS), address(city, True)
    if source in ("TRADE_IN", "PRIVATE_PURCHASE"):
        return None, person(), address(city, False)
    label, names = custom or rng.choice(OTHER_SOURCES)
    if names is None:
        return label, f"Estate of {person()}", address(city, False)
    if names == "DEALER":
        other = rng.choice([d for d in dealers if d is not dealer])
        return label, other["legal_name"], other["contact_address"]
    return label, rng.choice(names), address(city, True)


def q(value):
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("\\", "\\\\").replace("'", "''") + "'"


def pascal(wire):
    return "".join(part.capitalize() for part in wire.split("_"))


lines = [
    "-- DealerOps demo seed: where the seed vehicles came from (DMS-19, DMS-20), plus 60 more vehicles.",
    "-- Generated by scripts/gen_vehicle_sources.py; do not hand-edit. Names and addresses are fictional.",
    "-- Runs after 09_cloud_additions.sql. Updates only rows whose source_other, acquired_from_name and",
    "-- acquired_from_address are all empty, and inserts are guarded by natural keys, so it is safe to run again.",
    "",
    "SET NAMES utf8mb4;",
    "SET time_zone = '+00:00';",
    "",
]
lines += [f"SET {var_of[d['contact_email']]} = (SELECT id FROM dealer WHERE contact_email = {q(d['contact_email'])});"
          for d in dealers]

# 1. Existing seed vehicles.
lines += ["", "-- 1. Existing seed vehicles: custom source and acquired-from details."]
other_seen = 0
for v in plan:
    dealer = by_email[v["dealer_email"]]
    source_other, name, addr = acquired_from(v["source"], dealer)
    if v["source"] == "OTHER":
        other_seen += 1
        if other_seen in (3, 9):
            # Saved before DMS-19: no custom source, shown as "Other".
            source_other = None
    if rng.random() < 0.15:
        name, addr = None, None
    if source_other is None and name is None:
        continue
    var = var_of[v["dealer_email"]]
    lines.append(
        f"UPDATE vehicle SET source_other = {q(source_other)}, acquired_from_name = {q(name)}, "
        f"acquired_from_address = {q(addr)} WHERE dealer_id = {var} AND vin = {q(v['vin'])} "
        f"AND source = {q(v['source'])} AND source_other IS NULL AND acquired_from_name IS NULL "
        f"AND acquired_from_address IS NULL;")

# 2. Two more vehicles per dealership from unused Kijiji listings.
used = {v["vin"] for v in plan}
spare = sorted((l for l in listings if l.get("vin") and l["vin"] not in used), key=lambda l: l["vin"])
rng.shuffle(spare)
FUEL = {"Gasoline": "GASOLINE", "Diesel": "DIESEL", "Hybrid": "HYBRID", "Electric": "ELECTRIC"}
lines += ["", "-- 2. Two more in-stock vehicles per dealership, each with its VEHICLE CREATE audit row."]
start = date(2026, 9, 15)
for i, dealer in enumerate(dealers):
    var = var_of[dealer["contact_email"]]
    actor = dealer["staff"][0]["username"]
    for slot in range(2):
        listing = spare[i * 2 + slot]
        if slot == 0:
            source = "OTHER"
            custom = OTHER_SOURCES[(i + slot) % len(OTHER_SOURCES)]
        else:
            source = rng.choice(["TRADE_IN", "AUCTION", "PRIVATE_PURCHASE", "OTHER"])
            custom = None
        source_other, name, addr = acquired_from(source, dealer, custom)
        if source != "OTHER" and rng.random() < 0.2:
            name, addr = None, None
        condition = "CERTIFIED" if rng.random() < 0.75 else "AS_IS"
        asking = listing["asking_price"]
        share = rng.uniform(0.72, 0.82) if condition == "CERTIFIED" else rng.uniform(0.60, 0.72)
        cost = round(asking * share / 25) * 25
        repair = round(rng.uniform(400, 2000), 2) if condition == "CERTIFIED" and rng.random() < 0.5 else None
        added = start + timedelta(days=rng.randint(0, 52))
        created = datetime(added.year, added.month, added.day, rng.randint(14, 21), rng.randint(0, 59), rng.randint(0, 59))
        fuel = FUEL.get(listing.get("fuel"))
        colour = listing.get("colour")
        cols = {
            "dealer_id": var, "vin": listing["vin"], "make": listing["make"], "model": listing["model"],
            "model_year": listing["model_year"], "body_type": listing["body_type"], "source": source,
            "source_other": source_other, "acquired_from_name": name, "acquired_from_address": addr,
            "condition_code": condition, "purchase_cost": float(cost), "repair_cost": repair,
            "added_on": added.isoformat(), "mileage_km": listing.get("mileage_km"), "exterior_color": colour,
            "fuel_type": fuel, "list_price": float(asking), "status": "IN_STOCK", "version": 0,
            "created_at": created.strftime("%Y-%m-%d %H:%M:%S"), "updated_at": created.strftime("%Y-%m-%d %H:%M:%S"),
        }
        values = ", ".join(v if k == "dealer_id" else q(v) for k, v in cols.items())
        lines.append(f"INSERT INTO vehicle ({', '.join(cols)})")
        lines.append(f"SELECT {values}")
        lines.append(f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = {var} AND vin = {q(listing['vin'])});")

        # Same keys and formats as VehicleService.CreatedVehicleFields.
        summary = {
            "make": listing["make"], "model": listing["model"], "modelYear": listing["model_year"],
            "vin": listing["vin"], "source": pascal(source), "purchaseCost": float(cost),
            "addedOn": added.isoformat(), "conditionCode": pascal(condition), "bodyType": pascal(listing["body_type"]),
            "status": "IN_STOCK",
        }
        for key, value in (("sourceOther", source_other), ("acquiredFromName", name), ("acquiredFromAddress", addr),
                           ("repairCost", repair), ("mileageKm", listing.get("mileage_km")),
                           ("exteriorColor", colour), ("fuelType", fuel), ("listPrice", float(asking))):
            if value is not None:
                summary[key] = value
        vehicle_id = f"(SELECT id FROM vehicle WHERE dealer_id = {var} AND vin = {q(listing['vin'])})"
        ts = q(cols["created_at"])
        lines.append("INSERT INTO audit_event (dealer_id, actor_username, entity_type, entity_id, action, field_summary, created_at)")
        lines.append(f"SELECT {var}, {q(actor)}, 'VEHICLE', {vehicle_id}, 'CREATE', {q(json.dumps(summary))}, {ts}")
        lines.append(f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM audit_event WHERE entity_type = 'VEHICLE' "
                     f"AND entity_id = {vehicle_id} AND action = 'CREATE' AND created_at = {ts});")

OUT.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
print(f"wrote {OUT}")
