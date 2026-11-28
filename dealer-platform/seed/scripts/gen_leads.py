#!/usr/bin/env python3
"""Deterministic generator for dealer-platform/seed/sql/05_leads.sql.

Reads the three contract files and writes sales_lead and sales_lead_note rows.
Run from anywhere: python3 dealer-platform/seed/scripts/gen_leads.py
"""
import json
from datetime import date, datetime, timedelta
from pathlib import Path

SEED = Path(__file__).resolve().parent.parent
TODAY = date(2026, 10, 16)
NOW = datetime(2026, 10, 16, 13, 30, 0)

dealers = json.loads((SEED / "contract/dealers.json").read_text())
vehicles = json.loads((SEED / "contract/vehicles-plan.json").read_text())
customers = json.loads((SEED / "contract/customers-plan.json").read_text())

LOST_REASONS = [
    "Bought a 2021 Toyota RAV4 at a franchise dealer in Oakville",
    "Financing declined; both lenders turned down the application on Dealertrack",
    "Trade-in value too low; customer expected about $4,000 more than our appraisal",
    "Decided to keep the current vehicle and put the money into repairs instead",
    "Monthly payment above budget even at an 84-month term",
    "Went with a private sale found on Kijiji for a lower price",
    "Stopped responding after three follow-up attempts",
    "Spouse preferred a new vehicle with the full factory warranty",
    "Insurance quote too high for a driver with a G2 licence",
    "Relocating to Calgary for work; purchase postponed indefinitely",
    "Bought a 2022 Honda CR-V from a dealer in Brampton offering a lower all-in price",
    "Not comfortable with the prior collision claim shown on the Carfax report",
]

FIRST_CONTACT = [
    "Inbound inquiry from our AutoTrader listing on the {veh}. Called the customer, left a voicemail and sent a text with store hours.",
    "Walk-in on Saturday asking about the {veh}. Took a quick look around the vehicle; customer wants to come back with their partner.",
    "Web lead from our website chat about the {veh}. Replied the same day and asked about timing and budget.",
    "Phone-in inquiry about the {veh}. Customer is replacing a high-mileage car and wants something reliable for commuting on the 401.",
    "Facebook Marketplace message about the {veh}. Moved the conversation to a phone call and confirmed the vehicle is still available.",
    "Referral from a past customer. Interested in the {veh}; asked for a callback after work hours.",
]
FIRST_CONTACT_NOVEH = [
    "Walk-in browsing the lot. Looking for a compact SUV under $30,000 all-in; nothing on the lot fits yet, will watch incoming trades.",
    "Phone-in inquiry for a reliable sedan for a new driver. Budget around $18,000; promised to call when a suitable unit arrives.",
    "Web lead asking about minivans with low mileage. Explained current inventory and added the customer to our watch list.",
    "Referral from a service customer. Wants a pickup for weekend use; discussed what is coming in from auction next week.",
]
CONTACTED = [
    "Spoke with the customer by phone. Confirmed interest in the {veh} and booked a test drive for later this week.",
    "Second call connected. Sent the Carfax report on the {veh}; customer will review it tonight.",
    "Customer called back. Walked through OMVIC all-in pricing for the {veh}: advertised price includes everything except HST and licensing.",
    "Followed up by text after the voicemail. Customer asked about winter tires and remote start on the {veh}.",
    "Talked through the reconditioning done on the {veh} (brakes and tires). Customer appreciated the detail.",
]
CONTACTED_NOVEH = [
    "Followed up by phone. Customer still shopping; shared two incoming units from auction that may fit the budget.",
    "Left a voicemail with an update on incoming inventory. Will try again early next week.",
]
QUALIFIED = [
    "Test drive completed on the {veh}. Customer liked the ride and asked about extended warranty options.",
    "Appraised the customer's trade-in (2014 Honda Civic, 212,000 km). Gave a trade-in value and showed the net difference.",
    "Credit application submitted through Dealertrack. Approved with TD Auto Finance at a competitive rate pending proof of income.",
    "Reviewed the bill of sale draft with OMVIC all-in price, HST, and licensing itemised. Customer is comparing two lenders.",
    "Second test drive with the customer's partner. Discussed a refundable deposit to hold the {veh}.",
]
WON = [
    "Deposit taken to hold the {veh}. Safety certificate booked with the shop.",
    "Financing finalised; customer signed the bill of sale. Delivery scheduled.",
    "Delivered the {veh}. Walked the customer through the features and handed over both keys and the Carfax report.",
    "Customer chose to pay in full by bank draft. Paperwork and plate transfer done at delivery.",
]
LOST = [
    "Customer called to say they are no longer moving forward. Thanked them and closed the lead.",
    "No response to the last two calls and a text. Closing the lead after manager review.",
    "Customer explained their decision on the phone. Offered to keep them in mind for future inventory.",
]
NEW_FOLLOWUP = [
    "Sent a follow-up text with a link to the listing photos. Waiting to hear back.",
    "Tried calling at lunch, no answer. Will try again after 5 pm.",
]


def veh_label(v):
    return f"{v['model_year']} {v['make']} {v['model']}" if v else ""


def pick(pool, k):
    return pool[k % len(pool)]


def sql_str(s):
    return "'" + s.replace("\\", "\\\\").replace("'", "''") + "'"


def ts(dt):
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def leads_for_dealer(i, d):
    code = d["code"]
    staff = [s["username"] for s in d["staff"]]
    vs = [v for v in vehicles if v["dealer_code"] == code]
    cs = [c for c in customers if c["dealer_code"] == code]
    sold = [v for v in vs if v["status"] == "SOLD"]
    stock = [v for v in vs if v["status"] == "IN_STOCK"]
    out = []

    # Slot A: a closed lead. WON on a sold vehicle for most dealers that sold one, otherwise LOST.
    if sold and i % 2 == 0:
        out.append(dict(stage="WON", veh=sold[0], cust=cs[i % 4]))
    else:
        out.append(dict(stage="LOST", veh=stock[0] if i % 2 == 0 else None, cust=cs[i % 4]))
    # Slot B: an open lead on an in-stock vehicle.
    out.append(dict(stage=["NEW", "CONTACTED", "QUALIFIED"][i % 3], veh=stock[-1], cust=cs[(i + 1) % 4]))
    # Slot C: a second open (or lost) lead for most dealerships.
    if i % 5 != 4:
        stage = ["CONTACTED", "NEW", "QUALIFIED", "LOST"][i % 4]
        veh = stock[0] if (len(stock) > 1 and i % 4 != 1) else None
        out.append(dict(stage=stage, veh=veh, cust=cs[(i + 2) % 4]))
    # Slot D: a few dealerships also closed a second sale through a lead.
    if len(sold) > 1 and i % 6 == 0:
        out.append(dict(stage="WON", veh=sold[1], cust=cs[(i + 3) % 4]))

    for k, lead in enumerate(out):
        n = i * 7 + k * 3
        v = lead["veh"]
        hour = 14 + (n % 8)
        minute = (n * 13) % 60
        second = 10 + k  # unique per (dealer, created_at)
        if lead["stage"] == "WON":
            sold_on = date.fromisoformat(v["sold_on"])
            added_on = date.fromisoformat(v["added_on"])
            start = max(added_on + timedelta(days=1), sold_on - timedelta(days=12 + n % 10))
            created = datetime.combine(start, datetime.min.time()).replace(hour=hour, minute=minute, second=second)
            end = datetime.combine(sold_on, datetime.min.time()).replace(hour=21, minute=0)
        else:
            if lead["stage"] == "LOST":
                start = date(2026, 8, 18) + timedelta(days=n % 30)
            elif lead["stage"] == "NEW":
                start = date(2026, 10, 6) + timedelta(days=n % 8)
            else:
                start = date(2026, 9, 8) + timedelta(days=n % 26)
            if v:
                start = max(start, date.fromisoformat(v["added_on"]) + timedelta(days=1))
            created = datetime.combine(start, datetime.min.time()).replace(hour=hour, minute=minute, second=second)
            end = NOW if lead["stage"] != "LOST" else created + timedelta(days=9 + n % 12)
            end = min(end, NOW)

        # Owner: closed and qualified leads always have one; some new/contacted leads are unassigned.
        if lead["stage"] in ("NEW", "CONTACTED") and n % 4 == 1:
            owner = None
        else:
            owner = staff[(i + k) % 2]

        stage = lead["stage"]
        label = veh_label(v)
        fmt = lambda s: s.format(veh=label or "vehicle")
        bodies = []
        if v:
            bodies.append(fmt(pick(FIRST_CONTACT, n)))
        else:
            bodies.append(pick(FIRST_CONTACT_NOVEH, n))
        if stage == "NEW":
            if n % 2 == 0:
                bodies.append(pick(NEW_FOLLOWUP, n))
        elif stage == "CONTACTED":
            bodies.append(fmt(pick(CONTACTED, n)) if v else pick(CONTACTED_NOVEH, n))
        elif stage == "QUALIFIED":
            bodies.append(fmt(pick(CONTACTED, n)) if v else pick(CONTACTED_NOVEH, n))
            bodies.append(fmt(pick(QUALIFIED, n)))
            if n % 3 == 0:
                bodies.append(fmt(pick(QUALIFIED, n + 1)))
        elif stage == "WON":
            bodies.append(fmt(pick(CONTACTED, n)))
            bodies.append(fmt(pick(QUALIFIED, n)))
            bodies.append(fmt(pick(WON, n)))
        elif stage == "LOST":
            bodies.append(fmt(pick(CONTACTED, n)) if v else pick(CONTACTED_NOVEH, n))
            bodies.append(pick(LOST, n))

        # Spread notes between creation and the end of the window, chronologically.
        span = (end - created).total_seconds()
        notes = []
        for j, body in enumerate(bodies):
            if j == 0:
                at = created + timedelta(minutes=4 + n % 20)
            else:
                at = created + timedelta(seconds=span * j / len(bodies)) + timedelta(minutes=(n * 7 + j * 11) % 50)
                at = at.replace(second=(20 + j) % 60)
            at = min(at, end)
            if notes and at <= notes[-1][1]:
                at = notes[-1][1] + timedelta(minutes=17)
            if owner and (j == 0 or (n + j) % 4):
                author = owner
            else:
                author = staff[(n + j) % 2]
            notes.append((author, at, body))

        version = {"NEW": 0, "CONTACTED": 1, "QUALIFIED": 2, "WON": 3, "LOST": 2}[stage]
        if stage == "NEW" and owner is None:
            version = 0
        updated = notes[-1][1] if stage != "NEW" else created

        if stage in ("WON", "LOST"):
            follow = None
        else:
            # Open leads: 2026-10-10 .. 2026-11-15; roughly a quarter are overdue.
            offset = (n * 5) % 37 if n % 6 else n % 6
            follow = date(2026, 10, 10) + timedelta(days=offset)
            follow = max(follow, created.date())

        lead.update(
            code=code,
            dealer_email=d["contact_email"],
            owner=owner,
            created=created,
            updated=max(updated, created),
            version=version,
            follow=follow,
            lost=pick(LOST_REASONS, i + k) if stage == "LOST" else None,
            notes=notes,
        )
    return out


def main():
    all_leads = []
    for i, d in enumerate(dealers):
        all_leads.extend(leads_for_dealer(i, d))

    lines = [
        "SET NAMES utf8mb4;",
        "SET time_zone = '+00:00';",
        "",
        "-- DealerOps demo seed: sales_lead and sales_lead_note.",
        "-- Generated by dealer-platform/seed/scripts/gen_leads.py; do not hand-edit.",
        "--",
        "-- Natural keys:",
        "--   dealer   : dealer.contact_email",
        "--   customer : (dealer_id, customer.email)",
        "--   vehicle  : (dealer_id, vehicle.vin)",
        "--   lead     : (dealer_id, created_at). Every seeded lead of a dealership has a distinct",
        "--              created_at, so this pair identifies the lead for its notes and for re-runs.",
        "--   note     : (lead_id, created_at)",
        "-- WON leads point at a SOLD vehicle. Their customer is the buyer linked in customer_vehicle",
        "-- (03_customers_links.sql) when one exists, otherwise the planned contract customer.",
        "-- Open leads reference IN_STOCK vehicles only (LEAD-02); WON/LOST leads have no follow-up date;",
        "-- LOST leads carry a reason (LEAD-03); owners are dealership staff with a membership (LEAD-04).",
        "-- Every insert is guarded with WHERE NOT EXISTS, so re-running the file adds nothing.",
        "",
    ]
    cur = None
    for lead in all_leads:
        if lead["code"] != cur:
            cur = lead["code"]
            lines.append(f"-- {cur}")
            lines.append(f"SET @d = (SELECT id FROM dealer WHERE contact_email = {sql_str(lead['dealer_email'])});")
        v = lead["veh"]
        lines.append(
            f"SET @v = {'(SELECT id FROM vehicle WHERE dealer_id = @d AND vin = ' + sql_str(v['vin']) + ')' if v else 'NULL'};"
        )
        planned = f"(SELECT id FROM customer WHERE dealer_id = @d AND email = {sql_str(lead['cust']['email'])})"
        if lead["stage"] == "WON":
            lines.append(
                "SET @c = COALESCE((SELECT customer_id FROM customer_vehicle WHERE dealer_id = @d AND vehicle_id = @v), "
                f"{planned});"
            )
        else:
            lines.append(f"SET @c = {planned};")
        created = ts(lead["created"])
        owner = sql_str(lead["owner"]) if lead["owner"] else "NULL"
        follow = sql_str(lead["follow"].isoformat()) if lead["follow"] else "NULL"
        lost = sql_str(lead["lost"]) if lead["lost"] else "NULL"
        lines.append(
            "INSERT INTO sales_lead (dealer_id, customer_id, vehicle_id, owner_username, stage, next_follow_up_on, "
            "lost_reason, version, created_at, updated_at)\n"
            f"SELECT @d, @c, @v, {owner}, '{lead['stage']}', {follow}, {lost}, {lead['version']}, "
            f"'{created}', '{ts(lead['updated'])}'\n"
            "FROM DUAL WHERE @d IS NOT NULL AND @c IS NOT NULL"
            + (" AND @v IS NOT NULL" if v else "")
            + f"\n  AND NOT EXISTS (SELECT 1 FROM sales_lead WHERE dealer_id = @d AND created_at = '{created}');"
        )
        lines.append(f"SET @l = (SELECT id FROM sales_lead WHERE dealer_id = @d AND created_at = '{created}');")
        for author, at, body in lead["notes"]:
            lines.append(
                "INSERT INTO sales_lead_note (dealer_id, lead_id, author_username, body, created_at)\n"
                f"SELECT @d, @l, {sql_str(author)}, {sql_str(body)}, '{ts(at)}'\n"
                "FROM DUAL WHERE @l IS NOT NULL\n"
                f"  AND NOT EXISTS (SELECT 1 FROM sales_lead_note WHERE lead_id = @l AND created_at = '{ts(at)}');"
            )
        lines.append("")

    (SEED / "sql/05_leads.sql").write_text("\n".join(lines))
    from collections import Counter
    print("leads", len(all_leads), Counter(l["stage"] for l in all_leads))
    print("notes", sum(len(l["notes"]) for l in all_leads))
    print("unassigned", sum(1 for l in all_leads if not l["owner"]))
    print("overdue", sum(1 for l in all_leads if l["follow"] and l["follow"] < TODAY))


if __name__ == "__main__":
    main()
