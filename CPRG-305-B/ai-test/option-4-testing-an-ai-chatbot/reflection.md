# Reflection

The suite in `ai-response.md` was checked by reading. It was not run.

> **Superseded in part.** The suite was afterwards executed; see
> [actual-results.md](actual-results.md). This document remains the pre-run review, and the
> paragraphs below about nothing being started are true of that stage only. Three of its
> predictions were borne out: the model-down conflict is real, the Playwright oracles do not cover
> the model payload, and `design/10`'s expected strings would fail the current contract. One of its
> judgements needs correcting — the consistency bar it sets ("the suite does not require two model
> sentences to match") is wrong for counting questions, which core answers deterministically without
> calling the model at all.

No MySQL, DealerOps.Core, DealerOps.AiService, DealerOps.Gateway, or React process was started. No assistant question was sent. No paid model API was called, and no model quota was spent. A listen check on the documented local ports (MySQL 3306, gateway 8080, core 8081, ai-service 8082, web 5174, and the private end-to-end ports 18080, 18081, and 5175) found nothing listening. There was no live chat to observe.

This deliverable is a designed test suite, not a live run. A private stack and model quota were out of scope for this pass. Every actual result remains "Not executed." Filling those cells with guessed pass or fail results would not be evidence.

## What the suite gets right

The functional cases follow `design/10-Web-AI-Assistant.md`: the example stock, sold, and listing questions; make, VIN, and customer-name retrieval; a cap of five; this-dealership scope; no writes to vehicles, customers, or check results; one synchronous answer; model-down behavior; and dropping invented ids and paths.

The compliance section has hard checks for the three rules this option required:

- LEAD-09: lead notes and lead fields are absent from the model payload and the public answer, and a matching lead count is treated as a failed read (CB-CMP-01, CB-CMP-02, CB-CMP-03).
- Cross-tenant isolation: South Lot VINs, names, ids, and contact values stay out of a North Lot answer and out of the model payload (CB-CMP-04, CB-CMP-05), including when the user asks for every dealership (CB-CMP-08).
- The other instruction rules design/10 actually states: contact fields are not sent (CB-CMP-06, CB-CMP-07), the conversation does not write business data (CB-ACC-08, CB-ACC-09, CB-CMP-12), retrieved ids are filtered (CB-ACC-12, CB-CMP-09), and turns are not retained (CB-CON-02).

`AGENTS.md` adds the browser-to-gateway boundary and the ban on AiService reading the application database (CB-CMP-10, CB-CMP-11). Those are not sentences in design/10.

Accuracy is judged on links, ids, and unchanged rows. The suite does not require two model sentences to match. That is the right consistency bar for this assistant. design/10 does not promise deterministic prose.

Unclear questions are bounded by "not a general natural-language database query engine," plus the same leak and write bans. The suite does not invent a refusal sentence.

## Comparison with the Playwright assistant specs

The oracles are `playwright/tests/api/assistant.spec.ts` and `playwright/tests/ui/assistant.spec.ts`. They were read only.

| Oracle case | What it asserts | Suite case | Gap |
| --- | --- | --- | --- |
| API AI-03 empty text | HTTP 400 `VALIDATION` | CB-UNC-01 | design/10 does not state this. The suite records it as a conflict. |
| API AI-03 cards and rival id | HTTP 200, at most five cards, rival vehicle id absent | CB-ACC-01, CB-ACC-06, CB-CMP-05 | The isolation idea matches. The oracle also pins JSON and HTTP 200. |
| API AT-21 / AI-03 | A sell question leaves the vehicle `IN_STOCK` and does not change `version` | CB-ACC-08 | Same observation. The oracle pins HTTP 200. |
| API AT-22 / AI-04 / CRM-12 | Response body has no phone, email, home address, or purchase cost `24680` / `24,680` | CB-CMP-07 | Contact fields match design/10. Purchase cost is not in design/10. |
| API AT-40 / UI-52 | `count.count` lies between two reads of this dealer's own list; cards stay at most five; rival customers are created first | CB-ACC-06 | design/10 says the five matches are not totals. The oracle requires a core-computed total. |
| UI UI-50 / UI-51 | Panel opens and closes, placeholder "Ask about this dealership…", copy "This assistant is read-only" and "never create, change or delete any data" | none | design/10 says an assistant page and does not state this copy. |
| UI UI-50 / AI-03 vehicle card | Card opens `/dms?vehicleId=` and the edit dialog | none | design/10 says links into this dealership's resources and does not name the route. |
| UI UI-50 / AI-03 customer card | Card opens `/crm?customerId=` | none | Same gap. |
| UI UI-52 / AI-03 | Summary text contains "{count} customer" | none | Depends on the count object design/10 does not define. |
| UI AT-21 | Status, `soldOn`, `soldPrice`, and `version` stay unchanged | CB-ACC-08 | Suite checks status, sold date, sold price, and version in words. It does not name `soldOn` and `soldPrice`. |
| UI AT-22 | Panel text has no phone, email, or home address | CB-CMP-07 | Matched. The UI oracle does not check purchase cost. |
| UI AI-03 model down | A stubbed `summaryAvailable: false` renders "Smart summary unavailable" and still shows cards | CB-ACC-07 | The oracle never takes the model down. It rewrites a successful response. The required sentence disagrees with design/10. |
| UI UI-50 admin | No "Open assistant" button and no `.assistant-widget` on `/admin` | CB-ACC-11 | design/10 only says administrators have no assistant page. |

The oracles do not cover LEAD-09, the model payload, AiService database access, retained history, gibberish, weather, underspecified follow-ups, or an instruction-override question. A green Playwright assistant run would not score those compliance cases.

The UI model-down test also cannot support a finding about a real model failure. It forces `summaryAvailable` false on whatever the stack already returned.

## Comparison with the design

`design/10-Web-AI-Assistant.md` is thinner than this brief, and it disagrees with later documents in ways a live run would hit.

1. **Leads.** design/10 never mentions leads. Its retrieval list is vehicles, customer IDs, and advertisement statuses. LEAD-09 is a later Must rule in `design/21-Feature-Extensions.md`. The suite cites LEAD-09 for the lead cases instead of pretending design/10 states the ban.

2. **Cross-tenant method.** design/10 says queries are this dealership only and that core recognizes the JWT and `dealer_id`. It does not say that a client-supplied `dealerId` is ignored, that another dealership's id returns 404, or how to prove a rival VIN is absent from the model payload. Those stronger statements live in design/14, design/15, and design/16. The suite's hard check is absence of the other dealer's data from the public answer and the model payload.

3. **AiService and the database.** `AGENTS.md` says AiService must not access the application database. design/10 does not. It says core filters the payload and ai-service calls the GitHub component. CB-CMP-11 is an architecture check, not something the chat panel can prove.

4. **Who calls ai-service.** design/10 step 3 says core calls ai-service via the gateway. design/14 §11 says core calls ai-service directly and the browser does not. design/18 §4.8 again says the internal assistant call goes via the gateway. The README diagram shows core calling ai-service directly. The suite refuses to score that path.

5. **Page versus panel.** design/10 says dealer users have an assistant page and administrators do not. design/13 §5.7 and the UI oracle use a floating panel on staff pages and no assistant route. design/16 FE-06 calls `/assistant` a retired route.

6. **Totals.** design/10 says the five matches are examples, not inventory or customer totals. design/14 §10 says `count` is null unless the question asks how many, and then core, never the model, computes it from all matching rows. The API and UI oracles enforce that count. Both a "no total" reading and a "count plus five cards" reading cannot be the single expected result.

7. **Model-down copy.** design/10 requires "Smart explanation is temporarily unavailable." design/12 §6, design/13 §8, and design/16 FE-10 require "Smart summary unavailable." FE-10 also says not to use document 10's wording. The current design/10 file is English; the remaining defect is the sentence, not a leftover non-English string.

8. **History.** design/10 allows a three-turn cap if one is kept, and then says turns are not retained and the next call sends the question plus resources only. The later sentence matches design/14 §10 and design/18 §4.8. CB-CON-02 follows that later sentence inside the same document.

9. **Missing product rules.** design/10 does not state empty-question 400, administrator 403, purchase cost, card kinds, navigation routes, the read-only notice, the failure sentence "Could not ask assistant," or a fixed answer for an unclear question. Protocol B.5 in `design/AI-PROTOCOL-AND-RULES.md` does tell the model to answer only from the resource list and to say it found no matching in-store records when the list does not answer. That prompt was not in the source list for the raw suite, so the suite correctly left the refusal sentence unspecified.

10. **No ids in design/10.** Labels such as 10-EX-STOCK are citations added so each case has a requirement ID. design/10 itself does not number its rules.

## Improvements after the comparison

These replace the primary expected result only where a later contract and the Playwright oracles agree. They do not mean the cases were run.

| Case | Improved expected result | Requirement ID |
| --- | --- | --- |
| CB-UNC-01 | Empty `text` returns HTTP 400 `VALIDATION` and does not need a model call. Whitespace-only text stays unspecified. | design/14 §10; API AI-03 |
| CB-ACC-07 | HTTP 200, `summary` null, `summaryAvailable` false, cards still the retrieval list, panel text "Smart summary unavailable." A whole request failure shows "Could not ask assistant." Do not require design/10's sentence on the current UI. | design/12 §6; design/13 §8; FE-10; UI AI-03 |
| CB-ACC-06 | For "how many" questions, core returns `count` for all matching rows of this dealer. `cards.length` stays at most 5. The card list is still not the total. Rival rows must not move `count` outside this dealer's own list total. | design/14 §10; AT-40; UI-52 |
| CB-CMP-07 | Also assert that the public body does not contain the fixture purchase cost `24680` or `24,680`. | AT-22; API AI-04. Still not a design/10 rule. |
| CB-ACC-11 | Administrator sees no assistant control. `POST /api/v1/assistant/ask` returns 403 and the body has no business fields. | design/13 §5.7; design/14 §10; BE-12; UI-50 |
| CB-ACC-08 | Also assert `soldOn` and `soldPrice` stay empty, matching the UI oracle. | AT-21 |
| New CB-UI-01 | The panel shows "This assistant is read-only" and "never create, change or delete any data," and it opens and closes. | UI-50; UI-51. Not in design/10. |
| New CB-UI-02 | A vehicle card navigates to `/dms?vehicleId={id}`. A customer card navigates to `/crm?customerId={id}`. | UI-50; design/13 §5.7. design/10 only says "links." |
| CB-UNC-02 and CB-UNC-03 | When the model is up and retrieval does not answer, the explanation says it found no matching in-store records. This is the assistant instruction in protocol B.5, not a design/10 sentence. | design/AI-PROTOCOL-AND-RULES.md B.5 |

No improvement adds a live transcript. The course rubric asks for actual results and findings. The finding is that the suite cannot be scored for accuracy, consistency, or compliance until it is run against a private stack, and that several design/10 expected strings would fail the current UI oracles if they were run unchanged.

## Marker notes

Score CB-CMP-01 through CB-CMP-05 as the LEAD-09 and cross-tenant checks. Score CB-CMP-06, CB-CMP-07, CB-ACC-08, CB-ACC-09, CB-ACC-12, and CB-CMP-09 as the instruction rules design/10 states. Score CB-CMP-10 and CB-CMP-11 as service-boundary checks from `AGENTS.md`.

Do not treat identical model sentences as required. Do not treat the Playwright files as coverage of lead data or of the model payload. Do not treat design/10's model-down sentence as the current UI oracle.
