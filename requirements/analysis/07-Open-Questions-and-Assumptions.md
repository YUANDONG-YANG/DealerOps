# 07 Open Questions and Assumptions

## 1. Differences between the two sources

| Topic | PDF specification | DOCX brief | Resolution |
|---|---|---|---|
| Product name | Dealer Ops | DealerOS | Use Dealer Ops |
| Sign-in | Username + password | Firebase email/password and Google login (DOCX2) | Local password accounts, BCrypt-hashed; the sign-in name may be email, username or phone, and self-registration is allowed with admin-granted dealership access. Google ID-token sign-in added 2026-10-15 as `AUTH-23`, and Firebase **Auth** on 2026-10-16 as a third path (`POST /api/v1/auth/firebase`), using the client's own Firebase project. The Firebase **database** is not adopted. DealerOps still owns the account, role, dealership binding and JWT on every path. See design/SCOPE-BASELINE.md errata 1, 7 and 9 |
| CRM scope | Four fields + purchase link | Lead and customer lifecycle | Follow the PDF; no leads |
| Compliance check | Checklist + system flags missing items | AI screens automatically | Both: fixed rules first, then AI review |
| Publishing | "Before a listing is published" | "flagging before publication" | Ready + TXT export (SCOPE erratum 3) |
| Image Studio | None | Optional module | Built as `IMG-01–05` (SCOPE erratum 7, 2026-10-08) |
| VIN decode | None | NHTSA vPIC flow, returning make / model / year / body class / engine / country / manufacturer (DOCX2) | Built as `VIN-01–04`; make, model, year and body type prefill the create form, the rest are display-only (SCOPE erratum 6) |
| Landing page | None | Branding, hero, dashboard preview, feature cards, VIN decoder section, CTA, responsive (DOCX2) | Built as the public `/` route (SCOPE erratum 6) |
| Backend language | None | C# preferred (DOCX2) | .NET 10 / ASP.NET Core; Java is retired |
| AI assistant page | None | None (only the compliance assistant) | Add a read-only assistant page (SCOPE erratum 2) |
| Inventory / sales monitoring | None | "monitor sales" | No KPI dashboard; filter the list by sold |

## 2. Ambiguities and assumptions taken

| ID | Question | Assumption | Affects |
|---|---|---|---|
| Q-01 | What else does "etc." in car source cover? | Fixed four values: trade-in, auction, private purchase, other | DMS-05 |
| Q-02 | Year and VIN format? | Year 1900 – current + 1; VIN standard 17 chars | DMS-04 |
| Q-03 | CRM "Car(s) purchased" is under Required but has no `*` — required? | Optional; a customer can be recorded before buying | CRM-01 |
| Q-04 | Should linking in CRM also sell the vehicle in DMS? | No; two steps, sale recorded in DMS | CRM-05, DMS-10 |
| Q-05 | Can a sale be undone (return)? | Not in this release | DMS-12 |
| Q-06 | Can vehicles or customers be deleted? | No (protects audit and sale records) | DMS-17, CRM-14 |
| Q-07 | How does the ad "price" relate to DMS? DMS has no list price | Price is checked only in the ad body; no new DMS field | AD-R07 |
| Q-08 | Where does "new / used" status come from? DMS has no such field | Checked in the ad body; independent dealers default to used | AD-R04 |
| Q-09 | Who decides whether previous use / warranty "applies"? | No structured answers in this demo. Display a checklist; existing copy cues produce soft hints. Silent prior use/warranty cannot be inferred (accepted A1 limitation) | AD-R03, AD-R06 |
| Q-10 | Exactly 20,000 km/year — excess-km disclosure needed? | No (source says "under 20,000") | AD-R25 |
| Q-11 | Is a finance ad triggered by kind or by content? | FINANCE, or CASH matching the existing APR/PAYMENT pattern in title/body; LEASE keeps its own rules | AD-R10–R13 |
| Q-12 | Can one vehicle have several ads (different media)? | One ad per vehicle | AD-01 |
| Q-13 | Should audit record views? | Only modifications, not views | AUD-01–03 |
| Q-14 | Is there only one admin? | The PDF says "a single platform admin", and the build follows it: exactly one admin account, seeded from `ADMIN_USERNAME` / `ADMIN_PASSWORD` (`AUTH-21`). The role is not limited to one account by design, but no second admin is provisioned. This supersedes the earlier "multiple admin accounts allowed" assumption, which contradicted 01 §2 | AUTH-01, AUTH-21 |
| Q-15 | How far does "update rules without a code change" go this release? | Not this release. The patterns are hardcoded `static readonly Regex` constants in `backend/dotnet/DealerOps.Core/Compliance/OmvicRuleEngine.cs`. There is no rules config file and no admin UI. A rule change needs a code change. | AD-15 |

## 3. Questions for the client / instructor

1. **Q-04**: Do salespeople prefer "pick a car in CRM = sale done", or "record sale in DMS, CRM only links"? This affects the number of steps and the demo flow.
2. **Q-07 / Q-08**: May DMS gain "list price" and "new / used" fields for the compliance check? SCOPE currently forbids adding fields.
3. **Q-12**: For one vehicle advertised online and on a billboard, are two ads needed?
4. **Q-05**: Does the demo need to show a vehicle return?
5. Are the four dealer fields (registered name, phone, email, address) enough? Is the OMVIC registration number needed?

## 4. Risks

| Risk | Description | Mitigation |
|---|---|---|
| Compliance misjudgement | Ad text is natural language; keyword matching can miss or misfire | Fixed rules only check presence; semantic issues go to AI; regression test on the fixture set |
| AI instability | Same ad, different results on two runs | Low temperature, structured output, fixed fixture regression |
| Regulation changes | OMVIC rules change | Rules are hardcoded `static readonly Regex` constants in `DealerOps.Core/Compliance/OmvicRuleEngine.cs`; a regulation change needs a code change. There is no rules config file. |
| Tenant data leak | A missed dealer filter | Uniform data-layer filter + automated AT-01-style tests |
