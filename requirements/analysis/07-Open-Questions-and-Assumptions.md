# 07 Open Questions and Assumptions

## 1. Differences between the two sources

| Topic | PDF specification | DOCX brief | Resolution |
|---|---|---|---|
| Product name | Dealer Ops | DealerOS | Use Dealer Ops |
| Sign-in | Username + password | Not mentioned | Entra (SCOPE erratum 1) |
| CRM scope | Four fields + purchase link | Lead and customer lifecycle | Follow the PDF; no leads |
| Compliance check | Checklist + system flags missing items | AI screens automatically | Both: fixed rules first, then AI review |
| Publishing | "Before a listing is published" | "flagging before publication" | Ready + TXT export (SCOPE erratum 3) |
| Image Studio | None | Optional module | Not built |
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
| Q-14 | Is there only one admin? | Multiple admin accounts allowed, same role | AUTH-01 |
| Q-15 | How far does "update rules without a code change" go this release? | Not this release. The patterns are hardcoded `static final Pattern` constants in `OmvicRuleEngine` (`dealer-core/src/main/java/com/dealerops/core/compliance/OmvicRuleEngine.java`). There is no rules config file and no admin UI. A rule change needs a code change. | AD-15 |

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
| Regulation changes | OMVIC rules change | Rules are hardcoded `static final Pattern` constants in `OmvicRuleEngine`; a regulation change needs a code change. There is no rules config file. |
| Tenant data leak | A missed dealer filter | Uniform data-layer filter + automated AT-01-style tests |
