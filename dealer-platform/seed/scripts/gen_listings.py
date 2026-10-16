#!/usr/bin/env python3
"""Generate sql/04_listings.sql: one ad per vehicle plus its compliance check history.

Ad copy is built from the real Kijiji listing behind each vehicle (model year, trim, mileage, colour,
drivetrain and asking price from contract/vehicles-plan.json) and the dealership block from
contract/dealers.json. Some ads deliberately carry a compliance defect so every check outcome
(PASSED, BLOCKED, STALE, NEEDS_AI, AI_UNAVAILABLE) is represented.

rule_findings are produced by `findings()`, a line-for-line port of
backend/dotnet/DealerOps.Core/Compliance/OmvicRuleEngine.cs (hard findings first, then review
findings, camelCase as stored by ComplianceCheckService). Earlier content versions are not stored;
only their check rows remain. Re-runnable: listings are keyed by vehicle, checks by
(listing, created_at).

Usage: python3 -I dealer-platform/seed/scripts/gen_listings.py
"""
import json
import random
import re
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

SEED = Path(__file__).resolve().parent.parent
TODAY = date(2026, 10, 16)
TOR = ZoneInfo("America/Toronto")
rng = random.Random(20261016)

# ---------------------------------------------------------------------------------------------
# Port of OmvicRuleEngine. Keep it in step with the C# source; Python's `re` has no
# variable-width look-behind, so the pickup "Crew Cab" exception is applied after matching.
I = re.IGNORECASE
PRICE = re.compile(r"(?:cad|c\$|\$)\s*\d[\d,]*(?:\.\d{2})?|\d[\d,]*(?:\.\d{2})?\s*(?:cad|dollars?)\b", I)
PHONE = re.compile(r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")
EMAIL = re.compile(r"\S+@\S+\.\S+")
APR = re.compile(r"\d+(?:\.\d+)?\s*%\s*(?:apr|annual percentage rate)|apr\s*[:=]?\s*\d+(?:\.\d+)?\s*%", I)
TERM_MO = re.compile(r"\d+[\s-]*(?:month|months|mo)\b|term\s*[:=]?\s*\d+", I)
LEASE_WORD = re.compile(r"\b(?:lease|leasing|lessee)\b", I)
LEASE_DOWN = re.compile(r"down payment|due at signing|\$\d[\d,]*.{0,12}down", I)
LEASE_KM = re.compile(r"(?<![\d,.])(?P<km>\d{1,3}(?:[, ]\d{3})+|\d{1,6})\s*(?:km|kilomet(?:er|re)s?)\s*(?:(?:per|/|a|each)\s*)?(?:year|yr|annum|annual(?:ly)?)", I)
LEASE_KM_FIRST = re.compile(r"annual(?:ly)?[^.\n]{0,30}?(?<![\d,.])(?P<km>\d{1,3}(?:[, ]\d{3})+|\d{1,6})\s*(?:km|kilomet(?:er|re)s?)", I)
LEASE_EXCESS = re.compile(r"excess|overage|additional.{0,20}(?:km|kilomet)", I)
LEASE_TERM_ONLY = re.compile(r"\d+[\s-]*(month|months|mo)\b", I)
CERTIFIED = re.compile(r"\b(?:certified|cpo)\b", I)
CERTIFIED_DENIAL = re.compile(r"\b(?:not|never|non)[\s-]*certified\b", I)
AS_IS = re.compile(r"\bas[\s-]?is\b", I)
UNFIT = re.compile(r"unfit|not roadworthy|not fit", I)
IRREP = re.compile(r"irreparable|salvage|write[\s-]?off", I)
BRAND_NEW = re.compile(r"\b(?:brand[\s-]?new|never used|0\s*km|zero kilometres|new car(?!\s+feel))\b", I)
PRIOR_USE_CUE = re.compile(r"\b(?:police|taxi|cab|limo(?:usine)?|uber|lyft|rideshare|daily rental|rental (?:car|fleet)|car[- ]share|lease return|ex[- ]lease|former lease|repo(?:ssessed)?|ambulance|driver[- ]ed)\b", I)
CAB_STYLES = ("crew", "king", "double", "quad", "super", "mega", "extended", "access", "regular")
PRIOR_USE_DISCLOSURE = re.compile(r"(?:previously used as|prior use|former(?:ly)? (?:a )?(?:police|taxi|limo(?:usine)?|rental)|ex[- ](?:police|taxi|limo(?:usine)?|rental)|lease return disclosed|disclosed prior use)", I)
RENTAL_DISCLOSURE = re.compile(r"(?:previously|formerly|prior|ex)[\s\S]{0,30}rental|rental[\s\S]{0,30}(?:previously used|prior use|former)", I)
WARRANTY = re.compile(r"\bwarrant(?:y|ies)\b", I)
CADENCE = r"(?:per\s+month|a\s+month|/\s*mo(?:nth)?\b|monthly|bi-?weekly|weekly|per\s+week|/\s*wk\b)"
PAYMENT = re.compile(r"\$?\d[\d,]*(?:\.\d{2})?\s*" + CADENCE, I)
USED = re.compile(r"\b(?:used|pre[\s-]?owned|second[\s-]?hand|previously owned)\b", I)
COST_OF_BORROWING = re.compile(r"cost of borrowing|total cost of credit|borrowing cost|finance charge", I)
PAYMENT_CADENCE = re.compile(r"^\s*" + CADENCE, I)


def _contains(haystack, needle):
    if not needle or not needle.strip():
        return False
    squash = lambda s: re.sub(r"\s+", " ", s.lower())
    return squash(needle) in squash(haystack)


def _prior_use_cue(text):
    for m in PRIOR_USE_CUE.finditer(text):
        before = text[: m.start()].lower()
        if m.group(0).lower() == "cab" and any(before.endswith(f"{s} ") for s in CAB_STYLES):
            continue
        return True
    return False


def _has_cash_price(text):
    return any(not PAYMENT_CADENCE.match(text[m.end():]) for m in PRICE.finditer(text))


def findings(ad, vehicle, dealer, now_year=TODAY.year):
    hard, soft = [], []
    H = lambda rule, msg: hard.append({"ruleId": rule, "severity": "BLOCK", "passed": False, "message": msg})
    S = lambda rule, msg: soft.append({"ruleId": rule, "severity": "REVIEW", "passed": False, "message": msg})
    text = ad["title"] + "\n" + ad["body"]

    if not PRICE.search(text):
        H("PRICE_MISSING", "Advertised price not found in the ad body.")
    if not _contains(text, dealer["legal_name"]):
        H("DEALER_NAME_MISSING", "Dealership legal name is missing from the ad.")
    has_phone = _contains(text, re.sub(r"\D", "", dealer["contact_phone"])) or bool(PHONE.search(text))
    has_email = _contains(text, dealer["contact_email"]) or bool(EMAIL.search(text))
    has_addr = _contains(text, dealer["contact_address"])
    if not (has_phone and has_email and has_addr):
        if not (has_phone or has_email or has_addr):
            H("DEALER_CONTACT_MISSING", "Dealership contact details are missing from the ad.")
        else:
            S("DEALER_CONTACT_INCOMPLETE", "Dealership contact details look incomplete.")
    if not re.search(rf"(?<!\d){vehicle['model_year']}(?!\d)", text):
        S("YEAR_NOT_IN_COPY", "Model year is not present in the ad copy.")
    if BRAND_NEW.search(text) and vehicle["model_year"] <= now_year - 2:
        S("YEAR_NEW_USED_CONTRADICTION", "Copy implies new while the model year is older.")

    claimed_certified = bool(CERTIFIED.search(CERTIFIED_DENIAL.sub(" ", text)))
    code = vehicle["condition_code"]
    if claimed_certified and code != "CERTIFIED":
        H("CONDITION_MISMATCH", "Ad claims certified but the vehicle is not certified.")
    if code == "UNFIT" and not UNFIT.search(text):
        H("CONDITION_UNDISCLOSED", "Unfit condition is not disclosed.")
    if code == "IRREPARABLE" and not IRREP.search(text):
        H("CONDITION_UNDISCLOSED", "Irreparable condition is not disclosed.")
    if code == "AS_IS" and not AS_IS.search(text):
        H("CONDITION_UNDISCLOSED", "As-is condition is not disclosed.")
    if code == "CERTIFIED" and not claimed_certified:
        S("CERTIFIED_NOT_IN_COPY", "Certified status is not stated in the copy.")
    if not BRAND_NEW.search(text) and not USED.search(text):
        S("NEW_USED_NOT_STATED", "The ad does not state whether the vehicle is new or used.")

    prior = ad["prior_use"]
    disclosed = RENTAL_DISCLOSURE.search(text) if prior == "DAILY_RENTAL" else PRIOR_USE_DISCLOSURE.search(text)
    if (_prior_use_cue(text) or prior) and not disclosed:
        S("PRIOR_USE_UNCLEAR", "Prior use is mentioned without a clear disclosure.")
    if ad["warranty_terms"] and not _contains(text, ad["warranty_terms"]):
        S("WARRANTY_TERMS_MISSING", "Extended warranty terms are recorded but are not stated in the ad.")
    if WARRANTY.search(text):
        S("WARRANTY_CLAIM_NEEDS_REVIEW", "Warranty claim needs review.")

    kind = ad["ad_kind"]
    if kind == "FINANCE" or (kind == "CASH" and (APR.search(text) or PAYMENT.search(text))):
        if not APR.search(text):
            H("FINANCE_APR_MISSING", "Finance APR is missing from the ad.")
        if not TERM_MO.search(text):
            S("FINANCE_TERM_MISSING", "Finance term is not stated.")
        if not _has_cash_price(text) and not COST_OF_BORROWING.search(text):
            H("FINANCE_CASH_PRICE_MISSING", "Finance advertising must state the cash price or the cost of borrowing.")
        if ad["medium"] != "RADIO_TV_BILLBOARD":
            S("FINANCE_APR_PROXIMITY", "Finance APR placement should be reviewed.")
    if kind == "LEASE":
        if not APR.search(text):
            H("LEASE_APR_MISSING", "Lease APR is missing from the ad.")
        if not LEASE_WORD.search(text):
            H("LEASE_STATEMENT_MISSING", "Lease statement is missing from the ad.")
        if not LEASE_TERM_ONLY.search(text):
            S("LEASE_TERM_MISSING", "Lease term is not stated.")
        if not PAYMENT.search(text):
            S("LEASE_RENT_MISSING", "Lease payment amount is not stated.")
        if not LEASE_DOWN.search(text):
            S("LEASE_DOWN_MISSING", "Lease down payment is not stated.")
        km = LEASE_KM.search(text) or LEASE_KM_FIRST.search(text)
        to_int = lambda m: int(m.group("km").replace(",", "").replace(" ", ""))
        declared = ad["annual_km_allowance"]
        if declared is not None:
            effective = declared
            if not km:
                S("LEASE_ALLOWANCE_NOT_IN_COPY", "Recorded annual kilometre allowance is not stated in the ad.")
            else:
                if to_int(km) != declared:
                    S("LEASE_ALLOWANCE_MISMATCH", "Annual kilometre allowance in the ad differs from the salesperson checklist.")
                effective = min(declared, to_int(km))
            if effective < 20000 and not LEASE_EXCESS.search(text):
                H("LEASE_EXCESS_KM_MISSING", "Excess kilometre fees are missing.")
        elif km:
            if to_int(km) < 20000 and not LEASE_EXCESS.search(text):
                H("LEASE_EXCESS_KM_MISSING", "Excess kilometre fees are missing.")
        else:
            S("LEASE_ALLOWANCE_UNSTATED", "Annual kilometre allowance is not stated.")
    return hard + soft, bool(hard)


# ---------------------------------------------------------------------------------------------
# Ad copy

AS_IS_TEXT = ("Sold as-is: this vehicle is not represented as being in road-worthy condition, mechanically "
              "sound or maintained at any guaranteed level of quality, and may require substantial repairs "
              "at the purchaser's expense.")
UNFIT_TEXT = ("Unfit vehicle: it is not roadworthy and is sold for repair. It cannot be driven or plated "
              "until it is repaired and passes an Ontario safety inspection.")
IRREP_TEXT = ("Irreparable vehicle sold for parts only. It has an irreparable branding and can never be "
              "plated for road use in Ontario.")
CERT_TEXT = "Ontario safety certified with a fresh oil change, inspection report on file, and two keys."


def money(x):
    return f"${x:,.0f}"


def ad_price(v):
    p = v["asking_price"]
    factor = {"CERTIFIED": 1.0, "AS_IS": 0.9, "UNFIT": 0.6, "IRREPARABLE": 0.15}[v["condition_code"]]
    return max(800, round(p * factor / 100) * 100 - 5)


def vehicle_name(v):
    return " ".join(x for x in (str(v["model_year"]), v["make"], v["model"], v["trim"]) if x)


def finance_terms(price):
    apr = rng.choice([6.49, 6.99, 7.49, 7.99, 8.49, 8.99])
    months = rng.choice([60, 72, 84])
    r = apr / 100 / 12
    monthly = price * r / (1 - (1 + r) ** -months)
    biweekly = round(monthly * 12 / 26)
    return apr, months, biweekly, round(monthly * months - price)


def lease_terms(price):
    apr = rng.choice([4.99, 5.49, 5.99, 6.49])
    months = rng.choice([36, 48])
    down = rng.choice([1500, 2000, 2500, 3000])
    residual = price * (0.62 if months == 36 else 0.54)
    monthly = round((price - down - residual) / months + (price - down + residual) * apr / 100 / 24)
    return apr, months, down, monthly, rng.choice([16000, 20000, 24000])


def dealer_block(d, full=True):
    if full:
        return f"{d['legal_name']}, {d['contact_address']}. Call {d['contact_phone']} or email {d['contact_email']}."
    return f"Call {d['contact_phone']} or visit {d['domain']}."


def build_ad(v, d, kind, medium, defect, prior_use, warranty):
    price, code, name = ad_price(v), v["condition_code"], vehicle_name(v)
    km = f"{v['mileage_km']:,} km"
    spec = ", ".join(x for x in (v["colour"], v["drivetrain"]) if x)
    label = {"CERTIFIED": "Certified", "AS_IS": "Sold As-Is", "UNFIT": "Unfit - Repair Project",
             "IRREPARABLE": "Irreparable - Parts Only"}[code]
    if defect == "CONDITION_MISMATCH":
        label = "Certified"
    if defect == "CONDITION_UNDISCLOSED":
        label = "Priced to Sell"
    condition = {"CERTIFIED": CERT_TEXT, "AS_IS": AS_IS_TEXT, "UNFIT": UNFIT_TEXT, "IRREPARABLE": IRREP_TEXT}[code]
    if defect == "CONDITION_UNDISCLOSED":
        condition = "Runs and drives, priced to sell quickly."
    ad = {"ad_kind": kind, "medium": medium, "prior_use": prior_use, "warranty_terms": warranty,
          "annual_km_allowance": None}

    if kind == "CASH":
        pricing = f"All-in price {money(price)} plus HST and licensing."
        headline = money(price)
        if defect == "PRICE_MISSING":
            pricing, headline = "Call today for our best price.", "Call for Price"
    elif kind == "FINANCE":
        apr, months, biweekly, cob = finance_terms(price)
        apr_text = f" at {apr}% APR" if defect != "FINANCE_APR_MISSING" else ""
        pricing = (f"Cash price {money(price)} plus HST and licensing. Finance from {money(biweekly)} bi-weekly "
                   f"for {months} months{apr_text} with $0 down, OAC. Total cost of borrowing {money(cob)}.")
        headline = f"From {money(biweekly)} Bi-Weekly"
    else:
        apr, months, down, monthly, allowance = lease_terms(price)
        if defect == "LEASE_EXCESS_KM_MISSING":
            allowance = 16000
        excess = "" if defect == "LEASE_EXCESS_KM_MISSING" else " Excess kilometres are charged at $0.16/km."
        pricing = (f"Lease from {money(monthly)} per month for {months} months at {apr}% APR with {money(down)} "
                   f"down payment and {allowance:,} km per year.{excess} Cash price {money(price)} plus HST and licensing.")
        headline = f"Lease {money(monthly)}/mo"
        ad["annual_km_allowance"] = allowance

    extras = []
    if prior_use == "DAILY_RENTAL":
        extras.append("Prior use: this vehicle was previously used as a daily rental vehicle.")
    if warranty:
        extras.append(f"Includes {warranty}.")
    block = dealer_block(d)
    if defect == "DEALER_NAME_MISSING":
        block = block.replace(d["legal_name"], d["legal_name"].rsplit(" ", 1)[0])

    if medium == "RADIO_TV_BILLBOARD":
        lead = "certified, pre-owned" if label == "Certified" else "used"
        title = f"Radio 30s: {label} {name} | {headline}"
        body = (f"At {d['legal_name']}, this {lead} {name} with {km} is on the lot now. "
                + (f"{condition} " if code != "CERTIFIED" else "") + f"{pricing} {dealer_block(d, full=False)}")
    else:
        title = f"{label} {name} | {km} | {headline}"
        body = " ".join([f"Used {name}" + (f", {spec}" if spec else "") + f", {km}.", condition, *extras, pricing, block])
    if prior_use == "DAILY_RENTAL":
        title = f"Former Rental {title}"
    ad["title"], ad["body"] = title[:200], body
    return ad


# ---------------------------------------------------------------------------------------------
# AI review notes stored on non-blocked checks (shape: [{"message": ...}]).

def ai_notes(ad, rules):
    ids = {f["ruleId"] for f in rules}
    notes = []
    if ad["ad_kind"] == "FINANCE":
        notes.append("Cash price, APR, term and cost of borrowing all appear; keep the APR as prominent as the bi-weekly payment wherever the ad is displayed.")
    if ad["ad_kind"] == "LEASE":
        notes.append("Lease rate, term, down payment and kilometre allowance are stated; consider adding the total lease obligation.")
    if "DEALER_CONTACT_INCOMPLETE" in ids:
        notes.append("Only the phone number and website are read out; consider naming the street address for broadcast copy.")
    if ad["prior_use"]:
        notes.append("Prior daily rental use is disclosed clearly in the body and the title.")
    if ad["warranty_terms"]:
        notes.append("The included warranty coverage is stated with its limits; confirm any extended plans are described as optional.")
    if not notes:
        notes.append("No additional misleading claims found.")
    return [{"message": n} for n in notes]


# ---------------------------------------------------------------------------------------------

def ts(day, hour, minute, second=0):
    local = datetime.combine(day, time(hour, minute, second), TOR)
    return local.astimezone(timezone.utc).replace(tzinfo=None)


def fmt(x):
    return x.strftime("%Y-%m-%d %H:%M:%S")


def q(x):
    return "NULL" if x is None else "'" + str(x).replace("\\", "\\\\").replace("'", "''") + "'"


def scenario(v):
    code, sold = v["condition_code"], v["status"] == "SOLD"
    if code == "CERTIFIED":
        kind = rng.choices(["CASH", "FINANCE", "LEASE"], [50, 30, 20 if v["model_year"] >= 2021 else 0])[0]
    elif code == "AS_IS":
        kind = rng.choices(["CASH", "FINANCE"], [85, 15])[0]
    else:
        kind = "CASH"
    medium = "RADIO_TV_BILLBOARD" if code in ("CERTIFIED", "AS_IS") and rng.random() < 0.15 else "ONLINE"
    outcome = "PASSED" if sold else rng.choices(
        ["PASSED", "FIXED", "BLOCKED", "STALE", "NEEDS_AI", "AI_UNAVAILABLE"], [40, 10, 22, 8, 10, 10])[0]
    return kind, medium, outcome


def defect_for(v, kind, medium):
    options = ["PRICE_MISSING", "DEALER_NAME_MISSING"] if kind == "CASH" else ["DEALER_NAME_MISSING"]
    if medium == "RADIO_TV_BILLBOARD":
        options = []
    if v["condition_code"] in ("AS_IS", "UNFIT", "IRREPARABLE"):
        options += ["CONDITION_UNDISCLOSED"] * 2
    if v["condition_code"] == "AS_IS":
        options += ["CONDITION_MISMATCH"]
    if kind == "FINANCE":
        options += ["FINANCE_APR_MISSING"] * 2
    if kind == "LEASE":
        options += ["LEASE_EXCESS_KM_MISSING"] * 2
    return rng.choice(options) if options else None


def main():
    dealers = {d["code"]: d for d in json.loads((SEED / "contract/dealers.json").read_text())}
    plan = json.loads((SEED / "contract/vehicles-plan.json").read_text())
    out = ["-- Listings and compliance checks for the 30 seed dealerships.",
           "-- Generated by scripts/gen_listings.py from contract/*.json; do not hand-edit.",
           "-- Ad copy describes the real Kijiji listing behind each vehicle (see kijiji_url in",
           "-- contract/vehicles-plan.json). rule_findings follow DealerOps.Core/Compliance/OmvicRuleEngine.cs.",
           "SET NAMES utf8mb4;", ""]
    outcomes, recommendations = {}, {}
    for v in plan:
        d = dealers[v["dealer_code"]]
        kind, medium, outcome = scenario(v)
        defect = defect_for(v, kind, medium) if outcome in ("BLOCKED", "FIXED") else None
        if outcome in ("BLOCKED", "FIXED") and defect is None:
            outcome = "PASSED"
        prior_use = "DAILY_RENTAL" if medium == "ONLINE" and rng.random() < 0.05 else None
        warranty = ("balance of factory powertrain warranty to 100,000 km" if v["condition_code"] == "CERTIFIED"
                    and v["model_year"] >= 2022 and medium == "ONLINE" and rng.random() < 0.3 else None)

        clean = build_ad(v, d, kind, medium, None, prior_use, warranty)
        flawed = build_ad(v, d, kind, medium, defect, prior_use, warranty) if defect else None
        stored = flawed if outcome == "BLOCKED" else clean

        added = date.fromisoformat(v["added_on"])
        last_day = date.fromisoformat(v["sold_on"]) - timedelta(days=1) if v["sold_on"] else TODAY - timedelta(days=1)
        created_day = min(added + timedelta(days=rng.randint(1, 6)), max(added, last_day))
        created = ts(created_day, rng.randint(9, 16), rng.choice([0, 15, 30, 45]))

        checks = []  # (content_version, ad checked, created_at, kind)
        t = created + timedelta(minutes=rng.randint(5, 25), seconds=rng.randint(0, 59))
        if outcome == "FIXED":
            checks.append((1, flawed, t, "RULES"))
            t += timedelta(hours=rng.randint(1, 30), minutes=rng.randint(0, 59))
            checks.append((2, clean, t, "AI_OK"))
            content_version = 2
        elif outcome == "STALE":
            checks.append((1, clean, t, "AI_OK"))
            content_version = 2
        elif outcome == "NEEDS_AI":
            content_version = 1
        else:
            checks.append((1, stored, t, "AI_DOWN" if outcome == "AI_UNAVAILABLE" else "AI_OK"))
            content_version = 1

        updated = checks[-1][2] if checks else created
        if outcome == "STALE":
            updated += timedelta(days=rng.randint(2, 20), minutes=rng.randint(0, 59))
        updated = min(updated, ts(TODAY, 8, 0))
        ready = outcome == "PASSED" and (v["status"] == "SOLD" or rng.random() < 0.6)
        version = len(checks) + (1 if ready else 0) + (1 if outcome == "STALE" else 0)
        title = f"{v['dealer_code']} {v['model_year']} {v['make']} {v['model']} ({v['condition_code']})"
        out.append(f"-- {title}: {kind} / {medium} -> {'PASSED' if outcome == 'FIXED' else outcome}")
        out.append(f"SET @d = (SELECT id FROM dealer WHERE contact_email = {q(d['contact_email'])});")
        out.append(f"SET @v = (SELECT id FROM vehicle WHERE dealer_id = @d AND vin = {q(v['vin'])});")
        out.append("INSERT INTO listing (dealer_id, vehicle_id, title, body, ad_kind, medium, prior_use, warranty_terms,\n"
                   "    annual_km_allowance, status, content_version, last_check_id, version, created_at, updated_at)")
        out.append(f"SELECT @d, @v, {q(stored['title'])},\n    {q(stored['body'])},\n"
                   f"    {q(kind)}, {q(medium)}, {q(prior_use)}, {q(warranty)},\n"
                   f"    {stored['annual_km_allowance'] or 'NULL'}, {q('READY' if ready else 'DRAFT')}, {content_version}, NULL, "
                   f"{version}, {q(fmt(created))}, {q(fmt(updated))}")
        out.append("FROM DUAL WHERE @v IS NOT NULL AND NOT EXISTS (SELECT 1 FROM listing WHERE vehicle_id = @v);")
        if checks:
            out.append("SET @l = (SELECT id FROM listing WHERE vehicle_id = @v);")
        for cv, ad, at, mode in checks:
            rules, blocked = findings(ad, v, d)
            if blocked != (ad is flawed):
                raise SystemExit(f"{v['vin']}: defect {defect} did not produce the expected outcome: {rules}")
            if blocked:
                ai_status, notes, rec = "SKIPPED", None, "BLOCKED"
            elif mode == "AI_DOWN":
                ai_status, notes, rec = "UNAVAILABLE", None, "UNAVAILABLE"
            else:
                ai_status, notes, rec = "SUCCESS", json.dumps(ai_notes(ad, rules)), "PASSED"
            recommendations[rec] = recommendations.get(rec, 0) + 1
            out.append("INSERT INTO compliance_check (dealer_id, listing_id, content_version, rule_findings, ai_status,\n"
                       "    ai_notes, recommendation, created_at)")
            out.append(f"SELECT @d, @l, {cv},\n    {q(json.dumps(rules))},\n    {q(ai_status)},\n    {q(notes)},\n"
                       f"    {q(rec)}, {q(fmt(at))}")
            out.append(f"FROM DUAL WHERE @l IS NOT NULL AND NOT EXISTS (SELECT 1 FROM compliance_check WHERE listing_id = @l AND created_at = {q(fmt(at))});")
        if checks:
            last = q(fmt(checks[-1][2]))
            out.append(f"UPDATE listing SET last_check_id = (SELECT id FROM compliance_check WHERE listing_id = @l AND created_at = {last}),\n"
                       "    updated_at = updated_at WHERE id = @l AND last_check_id IS NULL;")
        out.append("")
        outcomes[outcome] = outcomes.get(outcome, 0) + 1
    (SEED / "sql/04_listings.sql").write_text("\n".join(out))
    print(sum(1 for line in out if line.startswith("INSERT INTO listing")), "listings;", outcomes, "checks:", recommendations)


if __name__ == "__main__":
    main()
