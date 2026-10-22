#!/usr/bin/env python3
"""Snapshot real used-vehicle listings from Kijiji (Ontario) for the seed vehicle plan.

Default mode: for every make/model in CATALOG, read the Kijiji Ontario search results
and keep listings that carry a valid 17-character VIN (check digit verified), a model year, a
mileage of at least 5,000 km and an asking price. The result is written to
contract/kijiji-snapshot.json and is the only source of vehicle identity for gen_contract.py, so
every seeded vehicle (VIN, year, trim, mileage, colour, asking price) is a real Ontario listing.

--photos mode: download up to three listing photos for every vehicle in contract/vehicles-plan.json
into images/kijiji/<VIN>_<n>.jpg. Those photos belong to the advertising dealerships, so the folder
is git-ignored; load_photos.py does not load them, because they carry those dealerships' branding.

Usage:
  python3 -I dealer-platform/seed/scripts/fetch_kijiji.py            # refresh the snapshot
  python3 -I dealer-platform/seed/scripts/fetch_kijiji.py --photos   # cache photos for the plan
"""
import argparse
import json
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SEED_DIR = Path(__file__).resolve().parent.parent
SNAPSHOT = SEED_DIR / "contract" / "kijiji-snapshot.json"
PLAN = SEED_DIR / "contract" / "vehicles-plan.json"
PHOTO_DIR = SEED_DIR / "images" / "kijiji"
SEARCH = "https://www.kijiji.ca/b-cars-trucks/ontario/{query}/k0c174l9004"
PAGE_SEARCH = "https://www.kijiji.ca/b-cars-trucks/ontario/{query}/page-{page}/k0c174l9004"
USER_AGENT = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/129.0 Safari/537.36")
PER_MODEL = 8
MAX_YEAR = 2025
MIN_KM = 5000
MIN_PRICE = 3000
PHOTOS_PER_VEHICLE = 3
PHOTO_RULE = "?rule=kijijica-960-jpg"  # the media CDN rejects requests without a size rule
DELAY_SECONDS = 1.5

# (make, model, body_type, min_year): the models searched on Kijiji and the plan picks from
CATALOG = [
    ("Toyota", "Corolla", "sedan", 2014),
    ("Toyota", "RAV4", "suv", 2015),
    ("Toyota", "Camry", "sedan", 2014),
    ("Toyota", "Tacoma", "truck", 2016),
    ("Honda", "Civic", "sedan", 2014),
    ("Honda", "CR-V", "suv", 2015),
    ("Honda", "Odyssey", "van", 2015),
    ("Honda", "Accord", "sedan", 2015),
    ("Ford", "F-150", "truck", 2015),
    ("Ford", "Escape", "suv", 2015),
    ("Ford", "Mustang", "coupe", 2015),
    ("Chevrolet", "Equinox", "suv", 2016),
    ("Chevrolet", "Silverado 1500", "truck", 2015),
    ("Chevrolet", "Malibu", "sedan", 2016),
    ("Hyundai", "Elantra", "sedan", 2016),
    ("Hyundai", "Tucson", "suv", 2016),
    ("Hyundai", "Santa Fe", "suv", 2016),
    ("Kia", "Sportage", "suv", 2016),
    ("Kia", "Forte", "sedan", 2016),
    ("Nissan", "Rogue", "suv", 2015),
    ("Nissan", "Altima", "sedan", 2015),
    ("Mazda", "CX-5", "suv", 2015),
    ("Mazda", "Mazda3", "hatchback", 2014),
    ("Subaru", "Outback", "suv", 2015),
    ("Volkswagen", "Golf", "hatchback", 2015),
    ("Volkswagen", "Jetta", "sedan", 2015),
    ("Jeep", "Grand Cherokee", "suv", 2015),
    ("Jeep", "Wrangler", "suv", 2015),
    ("Ram", "1500", "truck", 2015),
    ("Dodge", "Grand Caravan", "van", 2014),
    ("BMW", "3 Series", "sedan", 2015),
    ("Mercedes-Benz", "C-Class", "sedan", 2015),
    ("Audi", "Q5", "suv", 2016),
    ("Tesla", "Model 3", "sedan", 2018),
    ("Lexus", "RX 350", "suv", 2015),
    ("Volkswagen", "Tiguan", "suv", 2016),
    ("Ford", "Transit Connect", "van", 2015),
    ("Honda", "CBR500R", "motorcycle", 2016),
    ("Mini", "Cooper", "hatchback", 2015),
    ("Subaru", "WRX", "sedan", 2015),
]

# Title spellings Kijiji sellers use for catalog models whose name rarely appears verbatim.
ALIASES = {
    ("BMW", "3 Series"): ["3 series", "320i", "328i", "330i", "330e", "340i", "m340i", "335i"],
    ("Mercedes-Benz", "C-Class"): ["c-class", "c class", "c300", "c 300", "c43", "c 43"],
    ("Lexus", "RX 350"): ["rx 350", "rx350"],
    ("Mazda", "Mazda3"): ["mazda3", "mazda 3"],
    ("Ford", "F-150"): ["f-150", "f150"],
    ("Honda", "CR-V"): ["cr-v", "crv"],
    ("Mazda", "CX-5"): ["cx-5", "cx5"],
    ("Mini", "Cooper"): ["cooper"],
}
# Different models that contain a catalog model name.
EXCLUDE = ["corolla cross", "santa fe xl", "outback sport", "grand cherokee wk", "transit-250",
           "transit 250", "silverado 2500", "silverado 3500", "f-250", "f-350", "ram 2500",
           "ram 3500", "rav4 prime", "model 3 performance", "paceman", "countryman",
           "clubman"]
MAKE_SPELLINGS = {"Mercedes-Benz": ["mercedes-benz", "mercedes benz", "mercedes"], "Ram": ["ram", "dodge ram"]}

TRANSLIT = {**{str(d): d for d in range(10)},
            **dict(zip("ABCDEFGH", range(1, 9))), **dict(zip("JKLMNPR", [1, 2, 3, 4, 5, 7, 9])),
            **dict(zip("STUVWXYZ", range(2, 10)))}
WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]
COLOURS = {"black": "Black", "white": "White", "grey": "Grey", "silver": "Silver", "blue": "Blue",
           "red": "Red", "green": "Green", "brown": "Brown", "beige": "Beige", "gold": "Gold",
           "orange": "Orange", "yellow": "Yellow", "burgundy": "Burgundy", "purple": "Purple"}
DRIVETRAINS = {"awd": "AWD", "4x4": "4x4", "fwd": "FWD", "rwd": "RWD"}
TRANSMISSIONS = {"1": "Manual", "2": "Automatic", "3": "Other"}
FUELS = {"gas": "Gasoline", "diesel": "Diesel", "hybrid": "Hybrid", "electric": "Electric",
         "phev": "Plug-in hybrid"}


def vin_valid(vin):
    if not re.fullmatch(r"[A-HJ-NPR-Z0-9]{17}", vin or ""):
        return False
    total = sum(TRANSLIT[c] * w for c, w in zip(vin, WEIGHTS))
    check = "X" if total % 11 == 10 else str(total % 11)
    return vin[8] == check


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "en-CA"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def listings(url):
    html = fetch(url).decode("utf-8", "replace")
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not match:
        return []
    state = json.loads(match.group(1))["props"]["pageProps"].get("__APOLLO_STATE__", {})
    return [v for k, v in state.items() if k.startswith("AutosListing:")]


def norm(text):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\- ]", " ", text.lower())).strip()


def title_matches(title, make, model):
    t = f" {norm(title)} "
    if not any(f" {m} " in t for m in MAKE_SPELLINGS.get(make, [make.lower()])):
        return False
    if any(x in t for x in EXCLUDE):
        return False
    return any(f" {a} " in t or t.find(f" {a}") >= 0 for a in ALIASES.get((make, model), [model.lower()]))


def trim_of(title, make, model, year):
    """Words after the model name up to the first separator, e.g. 'EX-L Navigation'."""
    head = re.split(r"\s[|/\-–]\s|[|!,*(+]", title)[0]
    t = norm(head)
    for alias in sorted(ALIASES.get((make, model), [model.lower()]), key=len, reverse=True):
        i = t.rfind(alias)
        if i >= 0:
            words = head.split()
            consumed = len(t[: i + len(alias)].split())
            trim = " ".join(words[consumed:consumed + 4]).strip(" -")
            trim = re.sub(rf"\b{year}\b", "", trim).strip()
            return trim if trim and trim.lower() != "other" else None
    return None


def to_record(raw, make, model, body_type, min_year):
    attrs = {a["canonicalName"]: a["canonicalValues"] for a in raw["attributes"]["all"]}
    first = lambda key: (attrs.get(key) or [None])[0]
    vin, year, km = (first("vin") or "").upper(), first("caryear"), first("carmileageinkms")
    price = (raw.get("price") or {}).get("amount")
    if not (vin_valid(vin) and year and km and price):
        return None
    year, km, price = int(year), int(km), round(price / 100)
    if not (min_year <= year <= MAX_YEAR and km >= MIN_KM and price >= MIN_PRICE):
        return None
    if not title_matches(raw["title"], make, model):
        return None
    location = raw.get("location") or {}
    return {
        "kijiji_id": raw["id"], "url": raw["url"], "title": raw["title"].strip(),
        "make": make, "model": model, "body_type": body_type, "model_year": year,
        "trim": trim_of(raw["title"], make, model, year), "vin": vin, "mileage_km": km,
        "asking_price": price, "colour": COLOURS.get(first("carcolor") or ""),
        "drivetrain": DRIVETRAINS.get(first("drivetrain") or ""),
        "transmission": TRANSMISSIONS.get(first("cartransmission") or ""),
        "fuel": FUELS.get(first("carfueltype") or ""),
        "seller": "dealer" if first("forsaleby") == "delr" else "private",
        "location": location.get("name"), "listed_at": raw.get("sortingDate"),
        "description": (raw.get("description") or "").strip(),
        "image_urls": [u.split("?")[0] for u in (raw.get("imageUrls") or [])[:PHOTOS_PER_VEHICLE]],
    }


def snapshot():
    out, seen = [], set()
    for make, model, body, y0 in CATALOG:
        query = norm(f"{make} {model}").replace(" ", "-")
        kept = []
        for page in (1, 2):
            url = SEARCH.format(query=query) if page == 1 else PAGE_SEARCH.format(query=query, page=page)
            for raw in listings(url):
                record = to_record(raw, make, model, body.upper(), max(y0, 2012))
                if record and record["vin"] not in seen:
                    seen.add(record["vin"])
                    kept.append(record)
            time.sleep(DELAY_SECONDS)
            if len(kept) >= PER_MODEL:
                break
        # Spread model years and prices instead of keeping the first page's newest stock.
        kept.sort(key=lambda r: (r["model_year"], r["asking_price"]))
        step = max(1, len(kept) / PER_MODEL)
        picked = [kept[int(i * step)] for i in range(min(PER_MODEL, len(kept)))]
        print(f"{make} {model}: {len(kept)} usable, kept {len(picked)}", file=sys.stderr)
        out.extend(picked)
    payload = {"source": "https://www.kijiji.ca (Ontario, Cars & Trucks)",
               "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "listings": out}
    SNAPSHOT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"{len(out)} listings -> {SNAPSHOT.relative_to(SEED_DIR)}", file=sys.stderr)


def photos():
    by_vin = {r["vin"]: r for r in json.loads(SNAPSHOT.read_text())["listings"]}
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    for vehicle in json.loads(PLAN.read_text()):
        record = by_vin.get(vehicle["vin"])
        for n, url in enumerate(record["image_urls"] if record else [], start=1):
            target = PHOTO_DIR / f"{vehicle['vin']}_{n}.jpg"
            if target.exists():
                continue
            try:
                data = fetch(url + PHOTO_RULE)
            except OSError as error:
                print(f"{vehicle['vin']} photo {n}: {error}", file=sys.stderr)
                continue
            if data[:3] == b"\xff\xd8\xff":
                target.write_bytes(data)
            time.sleep(0.3)
    print(f"{len(list(PHOTO_DIR.glob('*.jpg')))} photos in {PHOTO_DIR.relative_to(SEED_DIR)}", file=sys.stderr)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--photos", action="store_true", help="cache listing photos for the vehicle plan")
    photos() if parser.parse_args().photos else snapshot()
