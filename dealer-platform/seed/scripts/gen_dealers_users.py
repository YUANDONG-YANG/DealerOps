import json, base64, sys, datetime as dt

contract, logos, out = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(contract))
HASH = "$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z."
FEMALE = {"Chloé", "Emma", "Fatima", "Grace", "Harleen", "Isabella", "Jasmine", "Mei", "Natalie",
          "Olivia", "Priya", "Rachel", "Simran", "Victoria", "Zofia"}

def q(s):
    return "'" + s.replace("\\", "\\\\").replace("'", "''") + "'"

L = []
L.append(f"-- DealerOps demo seed: 30 dealerships, {sum(len(x['staff']) for x in d)} dealer staff accounts and their memberships.")
L.append("-- Source: contract/dealers.json. Idempotent: every insert is guarded by its natural key.")
L.append("-- Logos are original fictional emblems, 160x160 PNG data URLs (the dealer API accepts PNG/JPEG/WebP only).")
L.append("SET NAMES utf8mb4;")
L.append("SET time_zone = '+00:00';")
L.append("")
L.append("-- Dealerships")
start = dt.datetime(2025, 9, 2, 14, 0, 0)
dealer_at = {}
for i, x in enumerate(d):
    at = start + dt.timedelta(days=round(i * 210 / 29), hours=(i * 5) % 8, minutes=(i * 17) % 60)
    dealer_at[x["code"]] = at
    png = open(f"{logos}/{x['code']}.png", "rb").read()
    logo = "data:image/png;base64," + base64.b64encode(png).decode()
    assert len(logo) < 200000
    L.append(f"-- {x['code']} {x['legal_name']}")
    L.append("INSERT INTO dealer (legal_name, contact_phone, contact_email, contact_address, active, version, created_at, updated_at, logo_data_url)")
    L.append(f"SELECT {q(x['legal_name'])}, {q(x['contact_phone'])}, {q(x['contact_email'])}, {q(x['contact_address'])}, 1, 0,")
    L.append(f"       '{at:%Y-%m-%d %H:%M:%S}', '{at:%Y-%m-%d %H:%M:%S}',")
    L.append(f"       {q(logo)}")
    L.append(f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM dealer WHERE contact_email = {q(x['contact_email'])});")
L.append("")
L.append("-- Dealer id variables")
for x in d:
    n = x["code"][1:]
    L.append(f"SET @d{n} = (SELECT id FROM dealer WHERE contact_email = {q(x['contact_email'])});")
L.append("")
L.append("-- Dealer staff (Dealer.User) and active memberships")
used = {"men": set(), "women": set()}
counters = {"men": 11, "women": 23}
for i, x in enumerate(d):
    n = x["code"][1:]
    for j, s in enumerate(x["staff"]):
        g = "women" if s["given_name"] in FEMALE else "men"
        num = counters[g]
        while num in used[g]:
            num = (num + 1) % 100
        used[g].add(num)
        counters[g] = (num + 37) % 100
        avatar = f"https://randomuser.me/api/portraits/{g}/{num}.jpg"
        at = dealer_at[x["code"]] + (dt.timedelta(days=1 + i % 3, hours=2) if j == 0
                                     else dt.timedelta(days=5 + (i * 3) % 9, hours=4, minutes=30))
        if j > 1:  # later hires join months after the dealership opened
            at += dt.timedelta(days=40 * (j - 1) + (i * 11) % 30, hours=j)
        ts = f"'{at:%Y-%m-%d %H:%M:%S}'"
        L.append(f"-- {s['display_name']} ({s['title']})")
        L.append("INSERT INTO app_user (username, password_hash, display_name, role, dealer_id, active, created_at, email, phone, given_name, family_name, avatar_url, locale)")
        L.append(f"SELECT {q(s['username'])}, '{HASH}', {q(s['display_name'])}, 'Dealer.User', @d{n}, 1, {ts},")
        L.append(f"       {q(s['email'])}, {q(s['phone'])}, {q(s['given_name'])}, {q(s['family_name'])}, {q(avatar)}, 'en-CA'")
        L.append(f"FROM DUAL WHERE @d{n} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM app_user WHERE username = {q(s['username'])}"
                 f" OR email = {q(s['email'])} OR display_name = {q(s['display_name'])} OR phone = {q(s['phone'])});")
        L.append("INSERT INTO membership (dealer_id, username, active, created_by, created_at)")
        L.append(f"SELECT @d{n}, {q(s['username'])}, 1, 'admin', {ts}")
        L.append(f"FROM DUAL WHERE EXISTS (SELECT 1 FROM app_user WHERE username = {q(s['username'])} AND dealer_id = @d{n})")
        L.append(f"  AND NOT EXISTS (SELECT 1 FROM membership WHERE dealer_id = @d{n} AND username = {q(s['username'])});")
open(out, "w").write("\n".join(L) + "\n")
print("written", len(L))
