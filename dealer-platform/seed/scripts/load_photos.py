#!/usr/bin/env python3
"""Load seed vehicle photographs into `vehicle_photo`.

For every vehicle in contract/vehicles-plan.json that belongs to a seed dealership, this inserts
one to three real photographs (IN_STOCK vehicles get 2-3, SOLD vehicles get 1) of the same make and
model from seed/images/, all freely licensed Wikimedia Commons files (see images/ATTRIBUTION-*.md).
Cached Kijiji listing photos are never used: they belong to the advertising dealerships and carry
their watermarks and phone numbers. Rows look exactly like rows written by the photo upload endpoint:

- content_type is detected from the file bytes (image/jpeg or image/png only),
- original_data holds the unmodified file bytes (at most 2 MB, at most 10 photos per vehicle),
- uploaded_by is a staff username of the owning dealership,
- created_at is the vehicle's added_on date plus 1-3 days (never after the sale date or the
  seed reference date).

About 20% of the photos also carry a stored BRIGHTEN enhancement, produced the way PhotoEnhancer
does it (scale to 1600 px long edge, gamma 0.8 lookup table, JPEG quality 90). This needs Pillow;
without Pillow, or with --no-enhance, enhanced_data and enhancement stay NULL.

All choices are derived from the VIN, so repeated runs pick the same photos. Vehicles that already
have at least one photo are skipped, which makes the loader safe to re-run.

Images are named <make-slug>_<model-slug>_<n>.jpg (slug: lowercase, non-alphanumeric runs replaced
by '-'). A model without images is reported and skipped.

Connection settings come from the environment and are passed to the `mysql` client:
MYSQL_HOST (127.0.0.1), MYSQL_PORT (3306), MYSQL_DB (dealer_core), MYSQL_USER (dealer) and
MYSQL_PWD (read by the client itself; never pass a password on the command line).
MYSQL_SSL_MODE is optional; set it to REQUIRED for a TLS-only server such as Azure MySQL.

Inserts are sent in transactions small enough for Azure's default 16 MiB max_allowed_packet.
A vehicle that already has a photo is skipped, so a partial load can be re-run.

Usage: python3 -I dealer-platform/seed/scripts/load_photos.py [--dry-run] [--no-enhance]
"""
import argparse
import datetime as dt
import hashlib
import io
import json
import os
import random
import re
import subprocess
import sys
from pathlib import Path

SEED_DIR = Path(__file__).resolve().parent.parent
IMAGES_DIR = SEED_DIR / "images"
REFERENCE_DATE = dt.date(2026, 10, 16)

# Mirrors the DealerOps.Core defaults (Photos:MaxFileSizeMb, Photos:MaxPerVehicle, Photos:MaxEdgePx).
MAX_BYTES = 2 * 1024 * 1024
MAX_PER_VEHICLE = 10
MAX_EDGE_PX = 1600
# Hex literals are twice the file size. Stay under Azure Flexible Server's 16 MiB default packet.
MAX_SQL_BATCH = 8 * 1024 * 1024
# Mirrors PhotoEnhancer constants.
JPEG_QUALITY = 90
BRIGHTEN_GAMMA = 0.8
ENHANCED_SHARE = 0.2


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def detect_content_type(data):
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    return None


def model_images():
    """Map (make-slug, model-slug) to the sorted list of usable image files."""
    pattern = re.compile(r"^(?P<make>[a-z0-9-]+)_(?P<model>[a-z0-9-]+)_(?P<n>\d+)\.(jpe?g|png)$")
    found = {}
    for path in IMAGES_DIR.iterdir():
        m = pattern.match(path.name)
        if not m or not path.is_file():
            continue
        found.setdefault((m["make"], m["model"]), []).append((int(m["n"]), path))
    return {key: [p for _, p in sorted(items)] for key, items in found.items()}


def mysql_base():
    command = [
        "mysql", "--default-character-set=utf8mb4", "--batch", "--skip-column-names",
        "-h", os.environ.get("MYSQL_HOST", "127.0.0.1"),
        "-P", os.environ.get("MYSQL_PORT", "3306"),
        "-u", os.environ.get("MYSQL_USER", "dealer"),
    ]
    ssl_mode = os.environ.get("MYSQL_SSL_MODE", "")
    if ssl_mode:
        command.append("--ssl-mode=" + ssl_mode)
    command.append(os.environ.get("MYSQL_DB", "dealer_core"))
    return command


def query(sql):
    out = subprocess.run(mysql_base() + ["-e", sql], check=True, capture_output=True, text=True).stdout
    return [line.split("\t") for line in out.splitlines() if line]


def sql_str(value):
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def load_enhancer(disabled):
    if disabled:
        return None
    try:
        from PIL import Image
    except ImportError:
        print("Pillow is not available; stored enhancements are skipped (enhanced_data stays NULL).")
        return None

    table = [min(255, max(0, round(255 * (v / 255.0) ** BRIGHTEN_GAMMA))) for v in range(256)]

    def brighten(original):
        with Image.open(io.BytesIO(original)) as src:
            img = src.convert("RGB")
        long_edge = max(img.size)
        if long_edge > MAX_EDGE_PX:
            ratio = MAX_EDGE_PX / long_edge
            img = img.resize((max(1, round(img.width * ratio)), max(1, round(img.height * ratio))),
                             Image.LANCZOS)
        img = img.point(table * 3)
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=JPEG_QUALITY)
        return buf.getvalue()

    return brighten


def main():
    parser = argparse.ArgumentParser(description="Load seed vehicle photos into vehicle_photo.")
    parser.add_argument("--dry-run", action="store_true", help="print the plan without writing")
    parser.add_argument("--no-enhance", action="store_true", help="never store enhanced versions")
    args = parser.parse_args()

    dealers = json.loads((SEED_DIR / "contract" / "dealers.json").read_text())
    plan = json.loads((SEED_DIR / "contract" / "vehicles-plan.json").read_text())
    staff = {d["contact_email"]: [s["username"] for s in d["staff"]] for d in dealers}
    images = model_images()
    enhance = load_enhancer(args.no_enhance)

    emails = ",".join(sql_str(e) for e in staff)
    rows = query(
        "SELECT d.contact_email, v.vin, v.id, v.dealer_id, v.added_on, IFNULL(v.sold_on, ''), "
        "(SELECT COUNT(*) FROM vehicle_photo p WHERE p.vehicle_id = v.id) "
        f"FROM vehicle v JOIN dealer d ON d.id = v.dealer_id WHERE d.contact_email IN ({emails})")
    db_vehicles = {(r[0], r[1]): r[2:] for r in rows}

    statements = ["SET NAMES utf8mb4;"]
    stats = {"vehicles": 0, "photos": 0, "enhanced": 0, "bytes": 0}
    skipped_existing = missing_vehicle = 0
    missing_models = set()

    for v in plan:
        if v["dealer_email"] not in staff:
            continue
        db = db_vehicles.get((v["dealer_email"], v["vin"]))
        if db is None:
            missing_vehicle += 1
            continue
        vehicle_id, dealer_id, added_on, sold_on, existing = db
        if int(existing) > 0:
            skipped_existing += 1
            continue
        files = images.get((slug(v["make"]), slug(v["model"])))
        if not files:
            missing_models.add(f'{v["make"]} {v["model"]}')
            continue

        rng = random.Random(hashlib.sha256(v["vin"].encode()).digest())
        wanted = rng.choice([2, 3]) if v["status"] == "IN_STOCK" else 1
        chosen = rng.sample(files, min(wanted, len(files), MAX_PER_VEHICLE))

        added = dt.date.fromisoformat(added_on)
        latest = min(dt.date.fromisoformat(sold_on) if sold_on else REFERENCE_DATE, REFERENCE_DATE)
        day = max(added, min(added + dt.timedelta(days=rng.randint(1, 3)), latest))
        moment = dt.datetime.combine(day, dt.time(rng.randint(13, 21), rng.randint(0, 59)))
        uploader = rng.choice(staff[v["dealer_email"]])

        inserted = 0
        for path in chosen:
            data = path.read_bytes()
            content_type = detect_content_type(data)
            if content_type is None or len(data) > MAX_BYTES:
                print(f"Skipping {path.name}: not a JPEG/PNG or larger than {MAX_BYTES} bytes")
                continue
            enhanced = None
            if enhance and rng.random() < ENHANCED_SHARE:
                enhanced = enhance(data)
            created = moment + dt.timedelta(seconds=37 * inserted)
            statements.append(
                "INSERT INTO vehicle_photo (dealer_id, vehicle_id, content_type, original_data, enhanced_data, "
                "enhancement, uploaded_by, created_at) VALUES "
                f"({dealer_id}, {vehicle_id}, {sql_str(content_type)}, X'{data.hex()}', "
                f"{'NULL' if enhanced is None else 'X' + sql_str(enhanced.hex())}, "
                f"{'NULL' if enhanced is None else sql_str('BRIGHTEN')}, {sql_str(uploader)}, "
                f"{sql_str(created.strftime('%Y-%m-%d %H:%M:%S'))});")
            inserted += 1
            stats["photos"] += 1
            stats["bytes"] += len(data)
            stats["enhanced"] += enhanced is not None
        if inserted:
            stats["vehicles"] += 1

    if missing_models:
        print("No images for: " + ", ".join(sorted(missing_models)))
    if missing_vehicle:
        print(f"{missing_vehicle} planned vehicles are not in the database yet; load 02_vehicles.sql first.")
    print(f"Skipped {skipped_existing} vehicles that already have photos.")
    print(f"Photos to insert: {stats['photos']} for {stats['vehicles']} vehicles "
          f"({stats['enhanced']} enhanced, {stats['bytes'] / 1048576:.1f} MB originals).")

    if args.dry_run or stats["photos"] == 0:
        return
    header = "SET NAMES utf8mb4;\nSET time_zone = '+00:00';\nSTART TRANSACTION;\n"
    footer = "\nCOMMIT;\n"
    batch = []
    batch_bytes = 0

    def flush():
        nonlocal batch, batch_bytes
        if not batch:
            return
        script = header + "\n".join(batch) + footer
        subprocess.run(mysql_base() + ["--max-allowed-packet=64M"], input=script.encode(), check=True)
        batch = []
        batch_bytes = 0

    for statement in statements:
        if statement.startswith("SET "):
            continue
        size = len(statement) + 1
        if batch and batch_bytes + size > MAX_SQL_BATCH:
            flush()
        batch.append(statement)
        batch_bytes += size
    flush()
    print("Vehicle photos loaded.")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as exc:
        sys.exit(f"mysql failed with exit code {exc.returncode}: {exc.stderr or ''}")
