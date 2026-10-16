import json, sys, random
from datetime import datetime, timedelta
C = '/Users/robin/IdeaProjects/DealerOps/dealer-platform/seed/contract/'
dealers = {d['code']: d for d in json.load(open(C+'dealers.json'))}
customers = json.load(open(C+'customers-plan.json'))
taken_names = {s['display_name'].lower() for d in dealers.values() for s in d['staff']} | {c['name'].lower() for c in customers}
taken_user = {s['username'] for d in dealers.values() for s in d['staff']}
taken_email = {s['email'] for d in dealers.values() for s in d['staff']} | {c['email'] for c in customers} | {d['contact_email'] for d in dealers.values()}

# (given, family, gender, email, mode, dealer, outcome, phone)
# mode: G = Google-only sign-up; P = password registration later linked with Google
# outcome: PENDING / APPROVED / REJECTED / CANCELLED
A = [
 ("Ethan","Lindqvist","m","ethan.lindqvist@gmail.com","G","D01","PENDING",None),
 ("Sofia","Marchetti","w","sofia.marchetti91@gmail.com","P","D01","APPROVED","(647) 555-0112"),
 ("Kofi","Asante","m","kofi.asante.to@gmail.com","G","D02","PENDING",None),
 ("Leah","Bernstein","w","leahbernstein@outlook.com","P","D02","REJECTED","(289) 555-0127"),
 ("Arash","Karimi","m","arash.karimi@gmail.com","G","D03","APPROVED",None),
 ("Nadia","Petrovic","w","nadia.petrovic@gmail.com","G","D03","PENDING",None),
 ("Jordan","Whitfield","m","jwhitfield88@hotmail.com","P","D04","PENDING","(289) 555-0143"),
 ("Amara","Nwosu","w","amara.nwosu@gmail.com","G","D05","PENDING",None),
 ("Caleb","Fontaine","m","caleb.fontaine@yahoo.ca","P","D05","APPROVED","(343) 555-0158"),
 ("Yuki","Hayashi","w","yuki.hayashi.ca@gmail.com","G","D06","PENDING",None),
 ("Mohammed","Siddiqui","m","m.siddiqui77@gmail.com","G","D07","REJECTED",None),
 ("Tessa","McAllister","w","tessa.mcallister@outlook.com","P","D07","PENDING","(226) 555-0119"),
 ("Diego","Alvarez","m","diego.alvarez.on@gmail.com","G","D08","APPROVED",None),
 ("Ingrid","Solberg","w","ingrid.solberg@gmail.com","G","D09","PENDING",None),
 ("Raj","Malhotra","m","rajmalhotra.cars@gmail.com","P","D09","CANCELLED","(249) 555-0131"),
 ("Camille","Dufresne","w","camille.dufresne@gmail.com","G","D10","PENDING",None),
 ("Brendan","Kowalczyk","m","brendan.kowalczyk@outlook.com","P","D10","APPROVED","(289) 555-0164"),
 ("Hana","Yoshida","w","hana.yoshida@gmail.com","G","D11","PENDING",None),
 ("Tariq","Mansour","m","tariq.mansour@gmail.com","G","D12","PENDING",None),
 ("Maeve","Callaghan","w","maeve.callaghan@icloud.com","P","D12","REJECTED","(343) 555-0176"),
 ("Andre","Baptiste","m","andre.baptiste@gmail.com","G","D13","APPROVED",None),
 ("Elena","Vasquez","w","elena.vasquez.ca@gmail.com","P","D14","PENDING","(647) 555-0185"),
 ("Samuel","Okafor","m","samuel.okafor@gmail.com","G","D15","PENDING",None),
 ("Lauren","Pelletier","w","lauren.pelletier@outlook.com","P","D16","PENDING","(437) 555-0108"),
 ("Nikhil","Bhatt","m","nikhil.bhatt@gmail.com","G","D17","APPROVED",None),
 ("Ava","Lindgren","w","ava.lindgren@gmail.com","G","D18","PENDING",None),
 ("Marco","Ferraro","m","marco.ferraro@hotmail.com","P","D19","PENDING","(289) 555-0192"),
 ("Zainab","Hussain","w","zainab.hussain@gmail.com","G","D20","CANCELLED",None),
 ("Gabriel","Lacroix","m","gabriel.lacroix@gmail.com","G","D21","PENDING",None),
 ("Chantal","Bisson","w","chantal.bisson@videotron.ca","P","D22","APPROVED","(343) 555-0124"),
 ("Owen","Thibault","m","owen.thibault@gmail.com","G","D23","PENDING",None),
 ("Riya","Desai","w","riya.desai@gmail.com","P","D24","PENDING","(249) 555-0147"),
 ("Felix","Brandt","m","felix.brandt@outlook.com","G","D25","REJECTED",None),
 ("Keisha","Campbell","w","keisha.campbell@gmail.com","G","D26","PENDING",None),
 ("Viktor","Horvath","m","viktor.horvath@gmail.com","P","D27","APPROVED","(343) 555-0161"),
 ("Naomi","Abernathy","w","naomi.abernathy@gmail.com","G","D28","PENDING",None),
 ("Devon","Mackenzie","m","devon.mackenzie@gmail.com","P","D29","APPROVED","(437) 555-0153"),
 ("Lucia","Romano","w","lucia.romano@gmail.com","G","D30","PENDING",None),
 ("Theo","Gallagher","m","theo.gallagher@outlook.com","G","D30","PENDING",None),
]
rnd = random.Random(7)
BASE = datetime(2026, 10, 16, 15, 0, 0)

def js(s):
    # System.Text.Json default encoder: escape HTML-sensitive chars and non-ASCII.
    out = []
    for ch in s:
        if ch in '"\\': out.append('\\' + ch)
        elif ch in "'&<>+`" or ord(ch) > 126 or ord(ch) < 32: out.append('\\u%04X' % ord(ch))
        else: out.append(ch)
    return ''.join(out)

def sq(s): return 'NULL' if s is None else "'" + s.replace("\\", "\\\\").replace("'", "''") + "'"
def canon(p): return None if p is None else '+1' + ''.join(c for c in p if c.isdigit())

rows = []; seen_u=set(); seen_n=set(); seen_p=set(); seen_sub=set()
avatar_n = {'m': 10, 'w': 10}
for i, (g, f, sex, email, mode, code, outcome, phone) in enumerate(A):
    local = email.split('@')[0]
    username = local if mode == 'G' else (g[0] + f).lower() if i % 2 else f"{g}.{f}".lower().replace('.', '_')
    display = f"{g} {f}"
    assert username not in taken_user and username not in seen_u, username
    assert display.lower() not in taken_names and display.lower() not in seen_n, display
    assert email not in taken_email
    if phone: assert canon(phone) not in seen_p; seen_p.add(canon(phone))
    seen_u.add(username); seen_n.add(display.lower())
    sub = '1' + ''.join(str(rnd.randint(0, 9)) for _ in range(20))
    assert sub not in seen_sub; seen_sub.add(sub)
    avatar_n[sex] += rnd.randint(1, 3)
    avatar = f"https://randomuser.me/api/portraits/{'men' if sex=='m' else 'women'}/{avatar_n[sex]}.jpg"
    locale = 'fr-CA' if f in ('Dufresne', 'Lacroix', 'Bisson', 'Pelletier', 'Thibault', 'Fontaine') else rnd.choice(['en', 'en-CA', 'en-CA', 'en-US'])
    if outcome == 'PENDING':
        age_h = rnd.randint(2, 29 * 24)
    else:
        age_h = rnd.randint(4 * 24, 29 * 24)
    req = BASE - timedelta(hours=age_h, minutes=rnd.randint(0, 59), seconds=rnd.randint(0, 59))
    # Password registrations happened earlier; the Google link that posted the request came later.
    created = req - timedelta(days=rnd.randint(1, 20), hours=rnd.randint(0, 12)) if mode == 'P' else req
    notif = req + timedelta(milliseconds=rnd.randint(40, 400))
    resolved = by = None
    if outcome in ('APPROVED', 'REJECTED'):
        resolved = notif + timedelta(hours=rnd.randint(1, 70), minutes=rnd.randint(0, 59))
        by = dealers[code]['staff'][rnd.randint(0, 1)]['username']
    elif outcome == 'CANCELLED':
        resolved = notif + timedelta(days=rnd.randint(1, 3), hours=rnd.randint(0, 10))
        by = username
    payload = '{"username":"%s","displayName":"%s","email":"%s"}' % (js(username), js(display), js(email))
    rows.append(dict(u=username, n=display, g=g, f=f, e=email, p=canon(phone), mode=mode, code=code,
                     out=outcome, sub=sub, av=avatar, loc=locale, created=created, notif=notif,
                     resolved=resolved, by=by, payload=payload))

def ts(d, frac=False): return 'NULL' if d is None else "'" + (d.strftime('%Y-%m-%d %H:%M:%S.%f') if frac else d.strftime('%Y-%m-%d %H:%M:%S')) + "'"
HASH = '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.'
o = []
w = o.append
w("""SET NAMES utf8mb4;

-- DealerOps demo seed 07: self-service join requests (AUTH-16..23).
-- Applicants are unbound Dealer.User accounts that asked to join one of the 30 seed dealerships
-- through Google sign-in, plus the JOIN_REQUEST inbox notification each request posted.
-- Rows mirror the code paths exactly:
--   * Google-only sign-up (AuthService.CreateUnboundGoogleUser): password_hash '', phone NULL,
--     username from the e-mail local part, Google claims stored (sub, names, picture, locale).
--   * Password registration later linked with Google (AuthService.Register + SetRequestedDealer):
--     BCrypt hash and phone kept, Google claims synced on the later sign-in.
--   * Payload JSON matches NotificationService.Create (System.Text.Json, camelCase).
--   * APPROVED  (JoinRequestService.Approve): dealer_id set, requested_dealer_id cleared, active
--     membership with created_by = the approving staff member.
--   * REJECTED  (JoinRequestService.Reject): requested_dealer_id cleared, still unbound.
--   * CANCELLED (MeController.DeleteMe): account deactivated, email/phone suffixed with
--     ':deleted:<id>', resolved_by = the applicant.
--   * Unresolved rows stay pending: requested_dealer_id set, dealer_id NULL.
-- Dealers are resolved by contact_email; every insert is guarded so a re-run adds nothing.

DROP TEMPORARY TABLE IF EXISTS seed_join_request;
CREATE TEMPORARY TABLE seed_join_request (
  username        VARCHAR(64)  NOT NULL PRIMARY KEY,
  display_name    VARCHAR(120) NOT NULL,
  given_name      VARCHAR(120) NOT NULL,
  family_name     VARCHAR(120) NOT NULL,
  email           VARCHAR(254) NOT NULL,
  phone           VARCHAR(40)  NULL,
  password_hash   VARCHAR(100) NOT NULL,
  google_sub      VARCHAR(64)  NOT NULL,
  avatar_url      TEXT         NOT NULL,
  locale          VARCHAR(16)  NOT NULL,
  dealer_email    VARCHAR(120) NOT NULL,
  outcome         VARCHAR(16)  NOT NULL,
  user_created_at DATETIME     NOT NULL,
  requested_at    DATETIME(6)  NOT NULL,
  resolved_at     DATETIME(6)  NULL,
  resolved_by     VARCHAR(64)  NULL,
  payload         TEXT         NOT NULL
);

INSERT INTO seed_join_request
  (username, display_name, given_name, family_name, email, phone, password_hash, google_sub,
   avatar_url, locale, dealer_email, outcome, user_created_at, requested_at, resolved_at,
   resolved_by, payload)
VALUES""")
vals = []
for r in rows:
    vals.append("  (%s, %s, %s, %s, %s, %s, %s, %s,\n   %s, %s, %s, %s, %s, %s, %s,\n   %s, %s)" % (
        sq(r['u']), sq(r['n']), sq(r['g']), sq(r['f']), sq(r['e']), sq(r['p']), sq(HASH if r['mode']=='P' else ''), sq(r['sub']),
        sq(r['av']), sq(r['loc']), sq(dealers[r['code']]['contact_email']), sq(r['out']), ts(r['created']), ts(r['notif'], True), ts(r['resolved'], True),
        sq(r['by']), sq(r['payload'])))
w(",\n".join(vals) + ";\n")
w("""-- Applicant accounts in their final state.
INSERT INTO app_user
  (username, password_hash, display_name, role, dealer_id, requested_dealer_id, active, created_at,
   email, phone, google_sub, given_name, family_name, avatar_url, locale)
SELECT s.username, s.password_hash, s.display_name, 'Dealer.User',
       CASE WHEN s.outcome = 'APPROVED' THEN d.id END,
       CASE WHEN s.outcome = 'PENDING' THEN d.id END,
       CASE WHEN s.outcome = 'CANCELLED' THEN 0 ELSE 1 END,
       s.user_created_at, s.email, s.phone, s.google_sub, s.given_name, s.family_name,
       s.avatar_url, s.locale
FROM seed_join_request s
JOIN dealer d ON d.contact_email = s.dealer_email
WHERE NOT EXISTS (SELECT 1 FROM app_user u WHERE u.username = s.username)
ORDER BY s.user_created_at;

-- Cancelled accounts free their e-mail and phone the way DeleteMe does.
UPDATE app_user u
JOIN seed_join_request s ON s.username = u.username AND s.outcome = 'CANCELLED'
SET u.email = CONCAT(u.email, ':deleted:', u.id),
    u.phone = CASE WHEN u.phone IS NULL THEN NULL ELSE CONCAT(u.phone, ':deleted:', u.id) END
WHERE u.email = s.email;

-- One JOIN_REQUEST per request, resolved or still in the dealership inbox.
INSERT INTO notification (dealer_id, kind, payload, created_at, resolved_at, resolved_by, resolved_action)
SELECT d.id, 'JOIN_REQUEST', s.payload, s.requested_at, s.resolved_at, s.resolved_by,
       CASE WHEN s.outcome = 'PENDING' THEN NULL ELSE s.outcome END
FROM seed_join_request s
JOIN dealer d ON d.contact_email = s.dealer_email
WHERE NOT EXISTS (
  SELECT 1 FROM notification n
  WHERE n.dealer_id = d.id AND n.kind = 'JOIN_REQUEST' AND n.payload = s.payload)
ORDER BY s.requested_at;

-- Approved applicants get the membership JoinRequestService.Approve creates.
INSERT INTO membership (dealer_id, username, active, created_by, created_at)
SELECT d.id, s.username, 1, s.resolved_by, s.resolved_at
FROM seed_join_request s
JOIN dealer d ON d.contact_email = s.dealer_email
WHERE s.outcome = 'APPROVED'
  AND NOT EXISTS (SELECT 1 FROM membership m WHERE m.dealer_id = d.id AND m.username = s.username);

DROP TEMPORARY TABLE seed_join_request;
""")
sys.stdout.write("\n".join(o))
from collections import Counter
print(Counter(r['out'] for r in rows), Counter(r['mode'] for r in rows), file=sys.stderr)
