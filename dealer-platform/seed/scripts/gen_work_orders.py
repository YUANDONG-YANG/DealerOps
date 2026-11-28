import json, random, datetime as dt, sys, collections

ROOT = sys.argv[1]
OUT = sys.argv[2]
TODAY = dt.date(2026, 10, 16)
rnd = random.Random(20261016)

dealers = json.load(open(f"{ROOT}/contract/dealers.json"))
vehicles = json.load(open(f"{ROOT}/contract/vehicles-plan.json"))
staff = {d["code"]: [s["username"] for s in d["staff"]] for d in dealers}

TIRES = {
    "Outback": "225/65R17", "Civic": "215/55R16", "Odyssey": "235/60R18", "C-Class": "225/50R17",
    "Q5": "235/60R18", "3 Series": "225/50R17", "Equinox": "225/65R17", "Malibu": "225/55R17",
    "Silverado 1500": "265/70R17", "Grand Caravan": "225/65R17", "Escape": "225/65R17",
    "F-150": "275/65R18", "Mustang": "235/55R17", "Transit Connect": "215/55R16",
    "Accord": "225/50R17", "CR-V": "235/60R18", "Odyssey ": "235/60R18", "Elantra": "205/55R16",
    "Santa Fe": "235/60R18", "Tucson": "225/60R17", "Grand Cherokee": "265/60R18",
    "Wrangler": "245/75R17", "Forte": "205/55R16", "Sportage": "225/60R17", "RX 350": "235/65R18",
    "CX-5": "225/65R17", "Mazda3": "205/60R16", "Cooper": "195/55R16", "Altima": "215/55R17",
    "Rogue": "225/65R17", "1500": "275/65R18", "WRX": "225/45R17", "Model 3": "235/45R18",
    "Camry": "215/55R17", "Corolla": "205/55R16", "RAV4": "225/65R17", "Tacoma": "265/70R16",
    "Golf": "205/55R16", "Tiguan": "215/65R17",
}
LUX = {"BMW", "Mercedes-Benz", "Audi", "Lexus", "Tesla"}
CVT = {"Nissan", "Subaru"}


def tire_cost(size):
    rim = int(size.split("R")[1])
    return {16: (980, 1180), 17: (1150, 1380), 18: (1320, 1620)}.get(rim, (1150, 1400))


# key: (task text or callable, (low, high), [notes], duration days range)
def catalogue(v):
    m, mk, y = v["model"], v["make"], v["model_year"]
    size = TIRES.get(m, "225/65R17")
    winter_brand = rnd.choice(["Michelin X-Ice Snow", "Bridgestone Blizzak WS90", "Nokian Hakkapeliitta R5"])
    adas = y >= 2018
    c = {
        "ssc": ("Ontario Safety Standards Certificate inspection", (110, 160), [
            "Passed SSC inspection. Front pads {fp} mm, rear {rp} mm, tread {tr}/32 on all four. Certificate issued and filed in the deal jacket.",
            "SSC complete and passed. Replaced two burnt-out marker bulbs during the inspection. Tread {tr}/32, pads {fp} mm front.",
            "Inspected to the Ontario standard, no defects found. Certificate number recorded on the bill of sale worksheet.",
        ], (0, 1)),
        "detail": ("Full interior/exterior detail", (229, 349), [
            "Shampooed carpets and seats, clay bar and one-step polish, engine bay wiped down. Ozone treatment for smoke odour.",
            "Full detail done: hand wash, clay, polish and sealant. Salt stains removed from footwell carpets. Ready for photos.",
            "Interior steam cleaned, pet hair removed, leather cleaned and conditioned. Exterior polished and waxed.",
        ], (1, 2)),
        "oil": ("Oil and filter change with multi-point inspection", (89, 129), [
            "Changed oil and filter with full synthetic, reset maintenance minder. Multi-point inspection all green.",
            "Oil service done. Noted wiper blades worn and replaced them at no charge. Tire pressures set to door placard.",
        ], (0, 1)),
        "fbrakes": ("Replace front brake pads and rotors", (420, 640), [
            "Front pads were at 2 mm with scored rotors. Installed ceramic pads and new rotors, serviced slide pins, road tested OK.",
            "Replaced front pads and rotors, flushed brake fluid (moisture 3%). No pulsation on road test.",
        ], (1, 2)),
        "rbrakes": ("Replace rear brake pads and resurface rotors", (260, 390), [
            "Rear inner pads worn to 3 mm from seized slider. Freed and greased sliders, new pads, rotors resurfaced within spec.",
        ], (1, 2)),
        "winter": (f"Mount 4 winter tires ({winter_brand} {size})", tire_cost(size), [
            "Mounted and balanced four new winter tires, TPMS sensors relearned, torqued to spec and re-checked after 50 km.",
            "Winter set installed on steel rims, all-seasons bagged and stored in the trunk for the buyer.",
        ], (1, 3)),
        "allseason": (f"Replace 4 all-season tires (Michelin CrossClimate2 {size}) and align", (tire_cost(size)[0] + 120, tire_cost(size)[1] + 160), [
            "Old tires at 3/32 with cupping. Installed four CrossClimate2, four-wheel alignment brought toe back into spec.",
        ], (1, 3)),
        "align": ("Four-wheel alignment", (129, 169), [
            "Vehicle pulled right; front toe and camber adjusted into spec. Printout attached to the work order.",
        ], (0, 1)),
        "windshield": (("Replace cracked windshield and recalibrate forward camera (ADAS)", (950, 1380)) if adas else ("Replace cracked windshield", (420, 690)), None, [
            "Replaced windshield with OEE glass, urethane cured overnight. {extra}",
            "Long crack across the driver's view; windshield replaced and moulding renewed. {extra}",
        ], (1, 3)),
        "pdr_q": ("Paintless dent repair – rear quarter panel", (190, 420), [
            "Removed a 6 cm dent from the left rear quarter panel without paint. Panel is straight under the line board.",
        ], (1, 2)),
        "pdr_d": ("Paintless dent repair – driver door dings", (120, 240), [
            "Pushed out three parking lot dings on the driver door. No paint damage.",
        ], (0, 1)),
        "battery": ("Replace 12V battery (failed load test)", (219, 329), [
            "Battery tested at 41% health with low CCA. Installed new AGM battery, cleaned terminals, charging system tested OK.",
            "Vehicle would not start on the lot. Replaced battery, checked parasitic draw at 25 mA (normal).",
        ], (0, 1)),
        "headlights": ("Restore oxidized headlight lenses", (89, 149), [
            "Wet sanded and polished both headlight lenses, applied UV clear coat. Beam pattern re-aimed.",
        ], (0, 1)),
        "key": ("Cut and program second key fob", (280, 460), [
            "Vehicle came in with one key. Sourced OEM fob, cut blade and programmed both remotes to the immobilizer.",
        ], (2, 4)),
        "krown": ("Rust-proofing oil spray (Krown annual treatment)", (159, 199), [
            "Applied annual oil-based rust protection to underbody, doors and rocker panels. Sticker placed on the door jamb.",
        ], (0, 1)),
        "filters": ("Replace engine and cabin air filters", (79, 129), [
            "Both filters heavily loaded with leaves and debris. Replaced engine and cabin filters.",
        ], (0, 1)),
        "bumper": ("Refinish front bumper cover (scuffs and road rash)", (380, 650), [
            "Sanded, primed and refinished the front bumper cover. Colour match checked in daylight, no visible edge.",
        ], (2, 4)),
        "cel": ("Diagnose check-engine light (code scan and smoke test)", (129, 189), [
            "Codes P0455 and P0456. Smoke test found a cracked EVAP purge hose; replaced hose and cleared codes. Monitors ready after drive cycle.",
            "Code P0171 lean bank 1. Smoke test found a split intake boot; replaced boot, fuel trims back to normal.",
        ], (1, 2)),
        "cv": ("Replace front CV axle (torn boot, clicking on turns)", (380, 560), [
            "Left front outer boot torn and joint clicking on full lock. Installed new axle assembly, no noise on road test.",
        ], (1, 2)),
        "struts": ("Replace front struts and mounts", (850, 1290), [
            "Front struts leaking and mounts knocking over bumps. Installed complete strut assemblies, aligned afterwards.",
        ], (1, 3)),
        "exhaust": ("Replace rusted exhaust flex pipe", (280, 450), [
            "Flex pipe rusted through ahead of the converter. Cut out and welded in new flex section, no leaks at idle.",
        ], (1, 2)),
        "ac": ("Recharge A/C and replace leaking condenser", (650, 1050), [
            "UV dye showed a stone hole in the condenser. Replaced condenser and receiver drier, evacuated and recharged. Vent temp 5 C.",
        ], (1, 3)),
        "trans": (("CVT fluid change" if mk in CVT else "Transmission fluid exchange"), (189, 289), [
            "Drained and refilled with OEM fluid, checked level at operating temperature. Shifts smooth on road test.",
        ], (0, 1)),
        "brakefluid": ("Brake fluid flush", (119, 159), [
            "Brake fluid tested at 4% moisture. Flushed and bled all four corners with DOT 4.",
        ], (0, 1)),
        "assess": ("Pre-sale mechanical assessment for as-is disclosure", (149, 199), [
            "Assessment done. Disclosed items: worn rear brakes, oil seep at valve cover, rust on rear subframe. Written report added to the deal jacket.",
            "Road test and lift inspection complete. Not certifiable without front suspension work; findings recorded for the as-is bill of sale.",
            "Assessment complete. Main items: check-engine light, cracked windshield, tires at 3/32. Customer disclosure sheet prepared.",
        ], (0, 1)),
        "plugs": ("Replace spark plugs and ignition coil (cylinder 3 misfire)", (420, 620), [
            "Code P0303. Swapped coil to confirm, replaced all plugs and the failed coil. No misfires after 20 km test.",
        ], (1, 2)),
        "timing": ("Replace timing belt, water pump and tensioner", (1100, 1450), [
            "Belt was original with cracking on the back side. Replaced belt, water pump, tensioner and idler, refilled coolant and bled system.",
        ], (2, 3)),
    }
    if mk == "Tesla":
        for k in ("oil", "trans", "plugs", "exhaust", "cel", "timing", "filters"):
            c.pop(k, None)
        c["battery"] = ("Replace 12V low-voltage battery", (240, 340), [
            "Vehicle showed a low-voltage battery alert. Replaced 12V battery and confirmed no alerts after a sleep cycle.",
        ], (0, 1))
        c["tesla_filter"] = ("Replace cabin HEPA and air filters", (130, 190), [
            "Replaced both cabin filters and cleaned the evaporator with antimicrobial treatment.",
        ], (0, 1))
        c["calipers"] = ("Service brake calipers (road salt corrosion)", (180, 260), [
            "Regenerative braking had left pads glazed and slides rusty. Cleaned and lubricated calipers, scuffed pads, fluid tested OK.",
        ], (0, 1))
    if m != "Odyssey":
        c.pop("timing", None)
    return c


MOTO = {
    "ssc": ("Ontario Safety Standards Certificate inspection (motorcycle)", (90, 130), [
        "Motorcycle passed SSC inspection. Chain slack and brakes within spec, all lights and horn working.",
    ], (0, 1)),
    "chain": ("Replace drive chain and sprockets", (380, 520), [
        "Chain was stretched with hooked rear sprocket teeth. Installed new chain and sprocket set, slack adjusted.",
    ], (1, 2)),
    "tires": ("Replace front and rear tires (Michelin Road 6)", (520, 690), [
        "Rear tire squared off and front cupped. Mounted and balanced new Road 6 pair.",
    ], (1, 2)),
    "fluids": ("Fluid service: engine oil, coolant and brake fluid", (220, 320), [
        "Changed oil and filter, flushed coolant and both brake circuits. No leaks.",
    ], (0, 1)),
    "fairing": ("Replace cracked left side fairing", (320, 520), [
        "Installed OEM-colour replacement fairing panel and new mounting grommets. Fitment checked.",
    ], (2, 4)),
    "detail": ("Full detail and chain clean", (99, 149), [
        "Washed, degreased chain and wheels, polished tank and fairings.",
    ], (0, 1)),
}

UNFIT = {
    "frame": ("Weld frame rail perforation and treat structural rust", (1400, 2200), [
        "Cut out perforated section of the rear frame rail and welded in a fabricated patch. Rust converter and undercoat applied.",
    ], (3, 6)),
    "calipers": ("Replace seized brake calipers and rusted brake lines", (850, 1250), [
        "Both front calipers seized and rear hard lines rusted through. Replaced calipers, pads, rotors and lines; bled system.",
    ], (2, 4)),
    "balljoints": ("Replace lower ball joints and outer tie rod ends", (520, 780), [
        "Ball joints had visible play and torn boots. Replaced both sides, aligned the front end.",
    ], (1, 3)),
    "cat": ("Replace catalytic converter (P0420)", (1400, 2100), [
        "Converter efficiency below threshold and rattling internally. Installed CARB-compliant converter, readiness monitors set.",
    ], (2, 4)),
    "rocker": ("Repair rocker panel rust and refinish", (900, 1600), [
        "Cut out rusted rocker sections, welded in patch panels, seam sealed and refinished. Cavity wax applied.",
    ], (3, 5)),
    "fit": ("Unfit-to-fit safety inspection and certificate", (150, 220), [
        "Re-inspected after repairs; vehicle passed. Certificate issued so the permit can be changed from unfit to fit.",
    ], (0, 1)),
}

IRREP = {
    "report": ("Pre-auction condition report and photos", (0, 0), [
        "Condition report written up with 24 photos. Frame damage and airbag deployment noted for wholesale buyers.",
    ], (0, 1)),
    "salvage": ("Drain fluids and remove battery for salvage transfer", (120, 180), [
        "Drained fuel, oil and coolant to the recycler's spec, removed battery. Ready for pickup by the salvage yard.",
    ], (0, 1)),
    "strip": ("Remove dash cam and personal items before wholesale", (40, 75), [
        "Removed aftermarket dash cam and wiring, bagged personal items found under the seats for the previous owner.",
    ], (0, 1)),
}

CANCEL_OK = {"winter", "allseason", "detail", "pdr_q", "pdr_d", "key", "bumper", "krown", "headlights", "fit", "cat", "rocker", "align", "fairing"}
LATE_TASKS = ["winter", "battery", "krown", "detail", "headlights", "pdr_d"]


def pick(keys, n, avail):
    keys = [k for k in keys if k in avail]
    rnd.shuffle(keys)
    return keys[:n]


def plan(v):
    cond = v["condition_code"]
    if v["body_type"] == "MOTORCYCLE":
        cat = MOTO
        keys = ["ssc"] + pick(["chain", "tires", "fluids", "fairing", "detail"], rnd.randint(1, 2), cat)
        # repairs first, SSC last
        return cat, keys[1:] + keys[:1]
    if cond == "IRREPARABLE":
        n = rnd.choice([0, 1, 1, 2])
        return IRREP, pick(list(IRREP), n, IRREP)
    base = catalogue(v)
    if cond == "UNFIT":
        cat = dict(base, **UNFIT)
        rep = pick(["frame", "calipers", "balljoints", "cat", "rocker"], rnd.randint(2, 3), cat)
        return cat, rep + ["fit"]
    if cond == "AS_IS":
        extras = pick(["detail", "cel", "bumper", "battery", "cv", "krown", "exhaust", "headlights", "filters", "trans"],
                      rnd.choice([0, 1, 1, 2]), base)
        return base, ["assess"] + extras
    extras_pool = ["detail", "fbrakes", "rbrakes", "winter", "oil", "pdr_q", "pdr_d", "windshield", "align", "battery",
                   "key", "allseason", "struts", "ac", "brakefluid", "plugs", "timing", "tesla_filter", "calipers", "headlights"]
    extras = pick(extras_pool, rnd.choice([0, 1, 1, 2]), base)
    if v["model"] == "Odyssey" and v["model_year"] <= 2020 and "timing" not in extras:
        extras = ["timing"] + extras[:1]
    # repairs first, then SSC, detail last before photos
    reps = [e for e in extras if e != "detail"]
    return base, reps + ["ssc"] + (["detail"] if "detail" in extras else [])


def money(lo, hi, v):
    x = rnd.uniform(lo, hi)
    if v["make"] in LUX:
        x *= 1.25
    elif v["body_type"] == "TRUCK":
        x *= 1.12
    return round(round(x / 2.5) * 2.5, 2)


def note(tmpl):
    return tmpl.format(fp=rnd.choice([6, 7, 8, 9]), rp=rnd.choice([5, 6, 7]), tr=rnd.choice([6, 7, 8, 9]),
                       extra=rnd.choice(["Rain sensor reseated, no leaks on water test.",
                                         "Static camera calibration passed; lane keep verified on road test.",
                                         "Old glass had a 30 cm stress crack."]))


def ts(day, lo=13, hi=21):
    return dt.datetime.combine(day, dt.time(rnd.randint(lo, hi), rnd.randint(0, 59), rnd.randint(0, 59)))


def sq(s):
    return "NULL" if s is None else "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"


rows = []
for v in vehicles:
    cat, keys = plan(v)
    added = dt.date.fromisoformat(v["added_on"])
    sold = dt.date.fromisoformat(v["sold_on"]) if v["sold_on"] else None
    users = staff[v["dealer_code"]]
    end = (sold - dt.timedelta(days=1)) if sold else TODAY
    cursor = added + dt.timedelta(days=rnd.randint(0, 2))
    unfit_stock = v["condition_code"] == "UNFIT" and not sold
    seen = set()
    for i, k in enumerate(keys):
        entry = cat[k]
        if entry[1] is None:
            (task, cost_rng), _, notes, dur = entry
        else:
            task, cost_rng, notes, dur = entry
        if task in seen:
            continue
        seen.add(task)
        created = min(cursor, end)
        status = "DONE"
        d = rnd.randint(*dur)
        completed = created + dt.timedelta(days=d)
        if sold:
            if completed > end:
                completed = end
            if k in CANCEL_OK and rnd.random() < 0.3 or (k == "fit" and v["condition_code"] == "UNFIT"):
                status = "CANCELLED"
        else:
            if unfit_stock and i >= 1:
                # still being repaired: recent activity, nothing certified yet
                created = max(created, TODAY - dt.timedelta(days=rnd.randint(3, 12)))
                status = "IN_PROGRESS" if i == 1 else "OPEN"
            elif completed >= TODAY:
                status = "IN_PROGRESS" if created < TODAY - dt.timedelta(days=0) and rnd.random() < 0.6 else "OPEN"
            elif k in CANCEL_OK and rnd.random() < 0.15:
                status = "CANCELLED"
        due = created + dt.timedelta(days=rnd.randint(2, 10))
        assignee = rnd.choice(users) if rnd.random() < 0.82 else None
        c_at = ts(created)
        cost = comp_note = comp_on = None
        if status == "DONE":
            cost = money(*cost_rng, v)
            comp_note = note(rnd.choice(notes))
            comp_on = completed
            u_at = ts(completed)
            if u_at <= c_at:
                u_at = c_at + dt.timedelta(minutes=rnd.randint(40, 180))
                comp_on = u_at.date()
            version = 2 if d >= 1 else 1
        elif status == "CANCELLED":
            cday = min(created + dt.timedelta(days=rnd.randint(0, 3)), end)
            u_at = ts(cday)
            if u_at <= c_at:
                u_at = c_at + dt.timedelta(minutes=rnd.randint(30, 120))
            version = rnd.choice([1, 1, 2])
        elif status == "IN_PROGRESS":
            sday = min(created + dt.timedelta(days=rnd.randint(0, 2)), TODAY - dt.timedelta(days=0))
            u_at = ts(sday, 13, 14)
            if u_at <= c_at:
                u_at = c_at + dt.timedelta(minutes=rnd.randint(30, 90))
            version = 1
        else:
            u_at = c_at
            version = 0
        # keep every timestamp in the past (seed "now" is 2026-10-16 ~12:00 UTC)
        limit = dt.datetime(2026, 10, 16, 12, 0, 0)
        if c_at > limit:
            c_at = limit - dt.timedelta(hours=rnd.randint(2, 20))
        if u_at > limit:
            u_at = limit - dt.timedelta(minutes=rnd.randint(5, 60))
            if u_at < c_at:
                u_at = c_at
            if comp_on:
                comp_on = u_at.date()
        rows.append(dict(v=v, task=task, assignee=assignee, status=status, due=due, cost=cost, note=comp_note,
                         comp=comp_on, version=version, c_at=c_at, u_at=u_at))
        cursor = (comp_on or created) + dt.timedelta(days=rnd.randint(0, 1))

    # seasonal / lot-maintenance follow-up on older stock (October: winter tires, batteries)
    if not sold and v["body_type"] != "MOTORCYCLE" and v["condition_code"] in ("CERTIFIED", "AS_IS") \
            and (TODAY - added).days > 30 and rnd.random() < 0.6:
        base = cat if v["condition_code"] != "IRREPARABLE" else None
        for k in LATE_TASKS:
            if k in base and base[k][0] not in seen:
                task = base[k][0]
                created = TODAY - dt.timedelta(days=rnd.randint(1, 9))
                status = rnd.choice(["OPEN", "OPEN", "IN_PROGRESS"])
                c_at = ts(created)
                u_at = c_at + dt.timedelta(hours=rnd.randint(1, 20)) if status == "IN_PROGRESS" else c_at
                rows.append(dict(v=v, task=task, assignee=rnd.choice(users + [None]), status=status,
                                 due=created + dt.timedelta(days=rnd.randint(3, 10)), cost=None, note=None, comp=None,
                                 version=1 if status == "IN_PROGRESS" else 0, c_at=c_at, u_at=min(u_at, dt.datetime(2026, 10, 16, 11, 30))))
                break

# sanity checks
for r in rows:
    v = r["v"]
    added = dt.date.fromisoformat(v["added_on"])
    assert r["c_at"].date() >= added, r
    assert r["u_at"] >= r["c_at"], r
    assert len(r["task"]) <= 200 and (r["note"] is None or len(r["note"]) <= 500)
    if v["sold_on"]:
        s = dt.date.fromisoformat(v["sold_on"])
        assert r["status"] in ("DONE", "CANCELLED"), r
        assert r["u_at"].date() < s, r
        if r["comp"]:
            assert r["comp"] < s
    if r["status"] == "DONE":
        assert r["cost"] is not None and r["note"] and r["comp"] and r["comp"] == r["u_at"].date()

d_email = {d["code"]: d["contact_email"] for d in dealers}
out = []
out.append("""-- DealerOps demo seed: reconditioning work orders (work_order).
-- Generated by a one-off script from contract/vehicles-plan.json and contract/dealers.json.
--
-- Task names and prices reflect typical Ontario independent-shop and dealer service pricing
-- (CAD, pre-tax), consulted October 2026: Ontario Safety Standards Certificate inspections
-- ($110-$160; ontario.ca/page/safety-standards-certificate, O. Reg. 473/24), shop labour at
-- $110-$150/h in Ontario (On The Move Canada repair-cost guide), front pads and rotors
-- ($420-$640 per axle), windshield replacement ($420-$690, $950-$1,380 with ADAS camera
-- calibration; Ontario auto-glass shop pricing and Globe and Mail Drive reporting), winter tire
-- packages from Canadian Tire / Costco Tire Centre price ranges, Krown rust-proofing and
-- full-detail menu prices. Luxury makes are about 25% higher, full-size trucks about 12% higher.
--
-- Status rules (design/21-Feature-Extensions.md WO-01..WO-05):
--   * SOLD vehicles only have DONE or CANCELLED work orders, all closed before sold_on.
--   * IN_STOCK vehicles mix OPEN, IN_PROGRESS and DONE.
--   * DONE rows carry cost, completion_note and completed_on (= updated_at date, UTC).
--   * version: OPEN 0; IN_PROGRESS 1; DONE 1 (quick job) or 2 (via IN_PROGRESS); CANCELLED 1 or 2.
-- Work-order costs are reconditioning history only; vehicle.repair_cost is owned by 02_vehicles.sql.
-- Re-runs are guarded by NOT EXISTS on (vehicle_id, task). Timestamps are UTC.

SET NAMES utf8mb4;
""")
for code in sorted(d_email):
    out.append(f"SET @{code.lower()} = (SELECT id FROM dealer WHERE contact_email = {sq(d_email[code])});")
out.append("")

cur = None
for r in rows:
    v = r["v"]
    dv = "@" + v["dealer_code"].lower()
    key = (v["dealer_code"], v["vin"])
    if key != cur:
        cur = key
        out.append(f"\n-- {v['dealer_code']} {v['model_year']} {v['make']} {v['model']} ({v['condition_code']}, {v['status']})")
        out.append(f"SET @v = (SELECT id FROM vehicle WHERE dealer_id = {dv} AND vin = {sq(v['vin'])});")
    vals = ", ".join([dv, "@v", sq(r["task"]), sq(r["assignee"]), sq(r["status"]), sq(r["due"].isoformat()),
                      "NULL" if r["cost"] is None else f"{r['cost']:.2f}", sq(r["note"]),
                      sq(r["comp"].isoformat() if r["comp"] else None), str(r["version"]),
                      sq(r["c_at"].strftime("%Y-%m-%d %H:%M:%S")), sq(r["u_at"].strftime("%Y-%m-%d %H:%M:%S"))])
    out.append("INSERT INTO work_order (dealer_id, vehicle_id, task, assignee_username, status, due_on, cost, "
               "completion_note, completed_on, version, created_at, updated_at)\n"
               f"SELECT {vals}\nFROM DUAL WHERE @v IS NOT NULL AND NOT EXISTS "
               f"(SELECT 1 FROM work_order WHERE vehicle_id = @v AND task = {sq(r['task'])});")

open(OUT, "w").write("\n".join(out) + "\n")
print(len(rows), collections.Counter(r["status"] for r in rows))
print(collections.Counter((r["v"]["status"], r["status"]) for r in rows))
print("vehicles with WO:", len({(r['v']['dealer_code'], r['v']['vin']) for r in rows}))
