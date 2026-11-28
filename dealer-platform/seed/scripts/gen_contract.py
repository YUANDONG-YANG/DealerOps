"""Generate the deterministic seed backbone (dealers, staff, vehicle plan, customer plan).

Vehicle identity (VIN, year, trim, mileage, colour, asking price) comes from real Ontario Kijiji
listings in contract/kijiji-snapshot.json (written by fetch_kijiji.py); nothing is invented.

Every seed SQL file references rows through the natural keys written here:
dealer -> contact_email, user -> username, vehicle -> (dealer, vin), customer -> (dealer, email).
Phone numbers use the reserved fictional 555-01xx range.
"""
import json
import re
import unicodedata
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(20261016)
OUT = Path(__file__).resolve().parent.parent / "contract"

CITIES = [
    ("Toronto", "M", "416", ["Queen St E", "Dundas St W", "Danforth Ave", "Eglinton Ave E", "Kingston Rd", "Lake Shore Blvd W", "Bathurst St", "Sheppard Ave E"]),
    ("Mississauga", "L5", "905", ["Dundas St E", "Hurontario St", "Eglinton Ave W", "Lakeshore Rd W", "Burnhamthorpe Rd"]),
    ("Brampton", "L6", "905", ["Queen St E", "Steeles Ave E", "Bovaird Dr W", "Main St N"]),
    ("Hamilton", "L8", "905", ["Upper James St", "Barton St E", "King St E", "Main St W"]),
    ("Ottawa", "K1", "613", ["Bank St", "Merivale Rd", "Carling Ave", "St. Laurent Blvd", "Montreal Rd"]),
    ("London", "N6", "519", ["Wellington Rd", "Dundas St", "Oxford St W", "Highbury Ave N"]),
    ("Kitchener", "N2", "519", ["Victoria St N", "Weber St E", "King St E", "Fairway Rd S"]),
    ("Windsor", "N8", "519", ["Tecumseh Rd E", "Walker Rd", "Huron Church Rd", "Dougall Ave"]),
    ("Barrie", "L4", "705", ["Bayfield St", "Essa Rd", "Duckworth St", "Mapleview Dr E"]),
    ("Oshawa", "L1", "905", ["King St W", "Simcoe St N", "Bond St E", "Taunton Rd W"]),
    ("Sudbury", "P3", "705", ["Lasalle Blvd", "Kingsway", "Regent St", "Notre Dame Ave"]),
    ("Kingston", "K7", "613", ["Princess St", "Bath Rd", "Division St", "Gardiners Rd"]),
    ("Guelph", "N1", "519", ["Woodlawn Rd W", "Gordon St", "Stone Rd W", "Eramosa Rd"]),
    ("St. Catharines", "L2", "905", ["Ontario St", "Welland Ave", "Lake St", "Glendale Ave"]),
    ("Peterborough", "K9", "705", ["Lansdowne St W", "Chemong Rd", "George St N", "Water St"]),
]

DEALER_STEMS = [
    "Lakeshore Auto Sales", "Northgate Motors", "Maple Leaf Pre-Owned", "Trillium Car Centre",
    "Huron Valley Auto", "Carling Avenue Motors", "Riverside Auto Group", "Bay Street Autos",
    "Kingsway Car Company", "Limestone City Motors", "Golden Horseshoe Auto", "Royal Oak Auto Sales",
    "Escarpment Motors", "Pinecrest Auto Sales", "Thames Valley Motors", "Grand River Auto",
    "Ambassador Auto Sales", "Simcoe County Motors", "Lakeview Pre-Owned", "Canal Street Auto",
    "Northern Lights Motors", "Rideau Auto Centre", "Crossroads Car Sales", "Eastgate Auto Mart",
    "Westside Motor Co.", "Highland Auto Sales", "Brock Street Motors", "Heritage Auto Sales",
    "Summit Auto Group", "Parkway Motors",
]
SUFFIX = ["Ltd.", "Inc.", "Ltd.", "Inc.", "Corp."]

FIRST = ["Liam", "Olivia", "Noah", "Emma", "Ethan", "Ava", "Lucas", "Sophia", "Benjamin", "Charlotte",
         "Mohammed", "Aaliyah", "Arjun", "Priya", "Wei", "Mei", "Mateo", "Isabella", "Jean-Luc", "Chloé",
         "Owen", "Hannah", "Daniel", "Grace", "Hassan", "Fatima", "Raj", "Simran", "Kevin", "Jasmine",
         "Ryan", "Emily", "Tyler", "Megan", "Marcus", "Aisha", "Diego", "Lucia", "Connor", "Natalie",
         "Hiroshi", "Yuki", "Andrei", "Elena", "Kwame", "Abena", "Tomasz", "Zofia", "Patrick", "Siobhan",
         "Gurpreet", "Harleen", "Minh", "Linh", "Omar", "Leila", "Samuel", "Rachel", "Nathan", "Victoria"]
LAST = ["Smith", "Tremblay", "Brown", "Wilson", "MacDonald", "Campbell", "Anderson", "Martin", "Roy", "Gagnon",
        "Patel", "Singh", "Chen", "Wang", "Nguyen", "Kim", "Li", "Khan", "Ahmed", "Ali",
        "Rodriguez", "Garcia", "Silva", "Kowalski", "Novak", "Ivanov", "O'Brien", "Murphy", "Kelly", "Fraser",
        "Thompson", "Leblanc", "Bouchard", "Morrison", "Stewart", "Grant", "Mensah", "Osei", "Tanaka", "Sato",
        "Gill", "Sandhu", "Dhillon", "Pham", "Tran", "Haddad", "Rahman", "Cohen", "Friedman", "Baker"]
MAIL = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.ca", "icloud.com", "rogers.com", "bell.net", "sympatico.ca"]

def phone(area, used):
    while True:
        p = f"({area}) 555-01{random.randint(0, 99):02d}"
        if p not in used:
            used.add(p)
            return p


def canonical(display_phone):
    """Login form of a phone number, matching LoginIdentifiers.Phone in DealerOps.Core."""
    return "+1" + re.sub(r"\D", "", display_phone)


def slug(text):
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return "".join(ch for ch in ascii_text.lower() if ch.isalnum())


def main():
    used_phones, used_users, used_display = set(), set(), set()
    dealers = []
    for i, stem in enumerate(DEALER_STEMS):
        city, fsa, area, streets = CITIES[i % len(CITIES)]
        domain = slug(stem.replace("Pre-Owned", "preowned")) + ".ca"
        num = random.randint(100, 4999)
        postal = f"{fsa}{random.randint(1, 9) if len(fsa) == 1 else ''}{random.choice('ABCEGHJKLMNPRSTVWXYZ')} {random.randint(1,9)}{random.choice('ABCEGHJKLMNPRSTVWXYZ')}{random.randint(0,9)}"
        if len(fsa) == 1:
            postal = f"{fsa}{random.randint(1, 9)}{random.choice('ABCEGHJKLMNPRSTVWXYZ')} {random.randint(1,9)}{random.choice('ABCEGHJKLMNPRSTVWXYZ')}{random.randint(0,9)}"
        else:
            postal = f"{fsa}{random.choice('ABCEGHJKLMNPRSTVWXYZ')} {random.randint(1,9)}{random.choice('ABCEGHJKLMNPRSTVWXYZ')}{random.randint(0,9)}"
        code = f"D{i + 1:02d}"
        staff = []
        for role_title in ("Sales Manager", "Sales Consultant"):
            while True:
                fn, ln = random.choice(FIRST), random.choice(LAST)
                username = slug(fn) + "." + slug(ln)
                display = f"{fn} {ln}"
                if username not in used_users and display not in used_display:
                    used_users.add(username)
                    used_display.add(display)
                    break
            staff.append({
                "username": username, "display_name": display, "given_name": fn, "family_name": ln,
                "email": f"{slug(fn)}.{slug(ln)}@{domain}", "phone": canonical(phone(area, used_phones)),
                "title": role_title,
            })
        dealers.append({
            "code": code, "legal_name": f"{stem} {SUFFIX[i % len(SUFFIX)]}", "city": city,
            "contact_email": f"sales@{domain}", "contact_phone": phone(area, used_phones),
            "contact_address": f"{num} {random.choice(streets)}, {city}, ON {postal}",
            "domain": domain, "staff": staff,
        })

    today = date(2026, 10, 16)
    vehicles, customers = [], []
    sources = ["TRADE_IN", "AUCTION", "PRIVATE_PURCHASE", "OTHER"]
    src_w = [40, 35, 18, 7]
    conds = ["CERTIFIED", "AS_IS", "UNFIT", "IRREPARABLE"]
    cond_w = [55, 33, 8, 4]
    snapshot = json.loads((OUT / "kijiji-snapshot.json").read_text())["listings"]
    pool = {}
    for listing in snapshot:
        pool.setdefault((listing["make"], listing["model"]), []).append(listing)
    for d in dealers:
        models = random.sample(sorted(m for m, items in pool.items() if items), 4)
        for k, model_key in enumerate(models, start=1):
            listing = pool[model_key].pop(random.randrange(len(pool[model_key])))
            cond = random.choices(conds, cond_w)[0]
            if cond in ("UNFIT", "IRREPARABLE") and listing["mileage_km"] < 80000:
                cond = "AS_IS"  # a low-mileage retail listing is not plausibly unfit or written off
            added = today - timedelta(days=random.randint(12, 330))
            sold = cond != "IRREPARABLE" and random.random() < 0.4 or (cond == "IRREPARABLE" and random.random() < 0.5)
            sold_on = None
            if sold:
                sold_on = added + timedelta(days=random.randint(6, max(7, (today - added).days - 1)))
                if sold_on > today - timedelta(days=1):
                    sold_on = today - timedelta(days=1)
            vehicles.append({
                "dealer_code": d["code"], "dealer_email": d["contact_email"], "idx": k,
                "vin": listing["vin"], "make": listing["make"], "model": listing["model"],
                "model_year": listing["model_year"], "body_type": listing["body_type"],
                "trim": listing["trim"], "mileage_km": listing["mileage_km"], "colour": listing["colour"],
                "drivetrain": listing["drivetrain"], "asking_price": listing["asking_price"],
                "kijiji_url": listing["url"], "source": random.choices(sources, src_w)[0], "condition_code": cond,
                "added_on": added.isoformat(), "status": "SOLD" if sold else "IN_STOCK",
                "sold_on": sold_on.isoformat() if sold_on else None,
            })
        if all(v["status"] == "SOLD" for v in vehicles[-4:]):
            vehicles[-1].update(status="IN_STOCK", sold_on=None)  # every lot keeps some stock
        city, fsa, area, streets = next(c for c in CITIES if c[0] == d["city"])
        for k in range(1, 5):
            fn, ln = random.choice(FIRST), random.choice(LAST)
            sep = random.choice([".", "_", ""])
            email = f"{slug(fn)}{sep}{slug(ln)}{random.choice(['', str(random.randint(1, 99))])}@{random.choice(MAIL)}"
            unit = random.choice(["", "", "", f"Unit {random.randint(101, 1907)}, "])
            customers.append({
                "dealer_code": d["code"], "dealer_email": d["contact_email"], "idx": k,
                "name": f"{fn} {ln}", "email": email, "phone": phone(area, used_phones),
                "home_address": f"{unit}{random.randint(10, 899)} {random.choice(streets)}, {city}, ON",
            })

    # Independent lots run with two to five logins. Extra staff come from their own RNG after the
    # rest of the contract, so the first two accounts and every other generated row stay stable.
    extra_rng = random.Random(20261017)
    titles = ["Sales Consultant", "Finance Manager", "Service Advisor", "Office Administrator"]
    for d in dealers:
        city, fsa, area, streets = next(c for c in CITIES if c[0] == d["city"])
        for title in titles[: extra_rng.choices([0, 1, 2, 3], [30, 35, 25, 10])[0]]:
            while True:
                fn, ln = extra_rng.choice(FIRST), extra_rng.choice(LAST)
                username, display = slug(fn) + "." + slug(ln), f"{fn} {ln}"
                if username not in used_users and display not in used_display:
                    used_users.add(username)
                    used_display.add(display)
                    break
            while True:
                number = f"({area}) 555-01{extra_rng.randint(0, 99):02d}"
                if number not in used_phones:
                    used_phones.add(number)
                    break
            d["staff"].append({
                "username": username, "display_name": display, "given_name": fn, "family_name": ln,
                "email": f"{slug(fn)}.{slug(ln)}@{d['domain']}", "phone": canonical(number), "title": title,
            })

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "dealers.json").write_text(json.dumps(dealers, indent=2, ensure_ascii=False) + "\n")
    (OUT / "vehicles-plan.json").write_text(json.dumps(vehicles, indent=2) + "\n")
    (OUT / "customers-plan.json").write_text(json.dumps(customers, indent=2, ensure_ascii=False) + "\n")
    print(len(dealers), "dealers;", sum(len(d["staff"]) for d in dealers), "staff;",
          len(vehicles), "vehicles;", sum(v["status"] == "SOLD" for v in vehicles), "sold;", len(customers), "customers")


if __name__ == "__main__":
    main()
