# AI protocol and rules hard spec

**Currently in force.** This document **overrides** the following fine-grained conflicts in [14-Backend-API-Contract.md](14-Backend-API-Contract.md) / [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md). Coding AIs **must follow this document**; they may not “pick one” or keep a withdrawn 15 branch.

This is not business code, not the full OpenAPI, and does not change `13`–`19` / BRIEF / README. OMVIC fixed rules still run in **dealer-core** before the model; ai-service only runs the review conversation.

Conflict order (only the fine points this document touches): **this document > 14 HTTP fine codes / 15 data-behavior fine points**. Unnamed paths, DTOs, and SQL still follow 14 / 15.

---

## A. 14 vs 15: four pinned rulings

### A.1 Cross-dealership vehicle link: always 404

**Cross-dealership ids are always HTTP 404 `NOT_FOUND` (anti-probing).** Do not load by global id and then compare `dealer_id`.

`PUT /api/v1/customers/{id}/vehicles/{vehicleId}` decision order (do not swap):

1. JWT + `membership.active=1` yields `tenantDealerId`. No dealership → **403** `FORBIDDEN`.
2. Load customer and vehicle **in this dealership**. Customer id or vehicle id does not exist for this store (including a real id from another store) → **404** `NOT_FOUND`.
3. This-store vehicle already linked to any customer → **409** `VEHICLE_ALREADY_LINKED`.
4. Otherwise 200 + audit `LINK`. A same-dealer `IN_STOCK` or `SOLD` vehicle may be linked. `CustomerService.link` does not read `vehicle.status` and must not throw `WRONG_DEALER_OR_SOLD`.

`DELETE` on the same path: no link or cross-store → **404** `NOT_FOUND`; this-store vehicle `SOLD` → **409** `SOLD_LOCKED`.

**`WRONG_DEALER_OR_SOLD`** stays on `ErrorCode`. The link path must not throw it. A missing customer or vehicle is `NOT_FOUND`. An existing link is `VEHICLE_ALREADY_LINKED`. Unlink of a sold vehicle is still **409** `SOLD_LOCKED`.
**Ban** using `WRONG_DEALER_OR_SOLD` for a same-dealer sold vehicle, for cross-store ids, for a dealership mismatch, or for a customer at another store. Aligned wording: [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) §4, [18-Backend-Core-Engineering.md](18-Backend-Core-Engineering.md) §6, and the `WRONG_DEALER_OR_SOLD` rows in [14-Backend-API-Contract.md](14-Backend-API-Contract.md).

### A.2 One person, two stores active → 409 `DUP_MEMBER`

**Adopt 15 §2.2; 14 must add this layer (this document is that add).**

The same `entraOid` **may have only one** `membership.active=1` at a time.

`POST /api/v1/admin/dealers/{id}/members`:

| Existing state | HTTP |
|---|---|
| Already **this store** active | **409** `DUP_MEMBER` |
| Already **another store** active | **409** `DUP_MEMBER` (one person, one store; unbind first, then bind) |
| This store previously unbound `active=0` | **Reactivate** that row; no 409; do not insert a second row |
| No row | INSERT, 201 |

V1 `uk_membership (dealer_id, entra_oid)` cannot block dual active across stores; **application-layer check is required**. If a read path finds ≥2 active rows → configuration error at 500 level; reject business (15 §2.4). Do not build a dealership switcher.

### A.3 Sale price: `soldPrice > 0` and paired with `soldOn`

`POST /api/v1/vehicles/{id}/sell` body: `soldOn`, `soldPrice`, `version`.

| Condition | HTTP / code |
|---|---|
| Missing `soldOn`, or `soldOn` blank / not `YYYY-MM-DD` | **400** `SOLD_PAIR_REQUIRED` |
| Missing `soldPrice`, or JSON `null` | **400** `SOLD_PAIR_REQUIRED` |
| `soldPrice` is not a positive number (`<= 0`, NaN) | **400** `SOLD_PAIR_REQUIRED` |
| Sell again after sold | **409** `SOLD_LOCKED` |
| `version` mismatch | **409** `VERSION_CONFLICT` |
| Cross-store / no such vehicle | **404** |

Invariant: `IN_STOCK` ⇔ both sale fields NULL; `SOLD` ⇔ both non-NULL and `soldPrice > 0`.  
**Ban** using `400 VALIDATION` for “price ≤ 0” (18 once allowed either; this document removes the choice). PATCH must not change `status` / `soldOn` / `soldPrice`.

### A.4 AI system prompt: do not embed the OMVIC hard checklist again

**Overrides 09 “put the OMVIC checklist in system.”** Hard rules live only in core `OmvicRuleEngine`. Ads posted to `/internal/v1/ad-check` **already passed hard[]**. ai-service system **only** reviews whether the copy is misleading. Full English body is in **§B.4** (copy-paste). Assistant prompt is in **§B.5**.

---

## B. Internal AI HTTP (responses 14 §11 did not pin)

Browser hits `/internal/v1/**` → Gateway **404**. Core outbound only hits Gateway; it does not call 8082 directly.

### B.1 Request headers

| Header | Value source |
|---|---|
| `X-Dealer-Internal` | Environment variable **`INTERNAL_TOKEN`** (Key Vault suggested name `INTERNAL-TOKEN`) |
| Literal default when unset | **`dealer-internal`**, accepted only when the Spring profile is **`dev`** or **`local`**. Any other profile must set a non-default **`INTERNAL_TOKEN`** shared by gateway, ai-service, and dealer-core. Gateway and ai-service refuse to start on that default. |

Ban forwarding the user JWT to ai-service. Ban listing this header in Gateway CORS `allowedHeaders`. Missing or wrong header → **404** (not 401).

### B.2 `POST /internal/v1/ad-check`

Request-body shape remains 14 §11 (`listing` + `vehiclePublic` without cost + `dealerPublic`). This document only pins the **response**.

#### Success — HTTP **200**

```json
{
  "success": true,
  "notes": [
    { "message": "No additional misleading claims found." }
  ]
}
```

| Field | Type | Rule |
|---|---|---|
| `success` | boolean | Must be `true` |
| `notes` | array | May be `[]`; each element at least `{ "message": string }`. core writes `aiNotes` as-is |

Ban inventing `recommendation` / `checkStatus` / `ruleFindings` in the success body. The five states are written by core. On success and the model does not require a hard block → core: `recommendation=PASSED`, `aiStatus=SUCCESS`.

#### Failure (core always maps to public 502 `AI_UNAVAILABLE`)

Unified failure body (same shape for all three reasons):

```json
{
  "success": false,
  "code": "AI_TIMEOUT",
  "message": "Model call exceeded 15s."
}
```

| Reason | HTTP | `code` | `message` (fixed English) |
|---|---|---|---|
| connect+response timeout | **504** | `AI_TIMEOUT` | `Model call exceeded 15s.` |
| `AIMANAGER_API_KEY` missing or blank | **503** | `AI_KEY_MISSING` | `AIMANAGER_API_KEY is missing or invalid.` |
| Invalid key / `isSuccess()==false` / parse failure / vendor error | **502** | `AI_PROVIDER_FAILED` | `Model did not return a usable result.` |

Missing key: **immediate** 503; **do not** wait the full 15s.  
core treats “AI failed” as: **HTTP ≠ 200, or body.`success` ≠ true, or read timeout**. Then:

- Still **INSERT** `compliance_check`: `recommendation=UNAVAILABLE`, `aiStatus=UNAVAILABLE`, `aiNotes=null` or `[{ "message": "<code>" }]`
- Write back `listing.last_check_id`
- Public **502** `{ "code": "AI_UNAVAILABLE", "message": "Ad check AI is unavailable." }`

Ban ai-service returning 200 + empty notes as fake Pass. Ban sending internal `AI_TIMEOUT` as-is to the browser.

### B.3 `POST /internal/v1/assistant`

Request body remains 14 §11 (`question` + already-filtered `resources`).

#### Success — HTTP **200**

```json
{
  "success": true,
  "summary": "Two in-stock Toyotas match. Open a card for DMS."
}
```

| Field | Type | Rule |
|---|---|---|
| `success` | boolean | `true` |
| `summary` | string | Short explanation; non-empty. core re-checks card ids (keep only ids that appeared in this `resources`) |

#### Failure — **same JSON shape and same HTTP/code table as B.2**

core **must not** return 502 to the browser. Public remains **200**:

```json
{
  "summary": null,
  "summaryAvailable": false,
  "cards": []
}
```

`cards` = this retrieval list (at most 5), not an empty array (unless retrieval itself returned 0). Only identity failure is 403.

### B.4 Ad-check system prompt (full English, copy-paste)

The `systemMessage` of `startConversation(conversationId, systemMessage)` **must be this entire paragraph verbatim**. Do not append an OMVIC price/APR/name/condition hard checklist.

```
You are a second-pass reviewer for a used-vehicle dealership advertisement.

The calling system has already enforced hard compliance gates (price present, dealer legal name, condition disclosure, finance/lease APR when required, and similar). Do not re-implement those gates. Do not invent missing columns. Do not use purchase cost as an advertised price.

Your only job: decide whether the ad copy is misleading relative to the structured public facts in the user JSON (listing title/body/adKind/medium, vehicle year/make/model/VIN/conditionCode/source, dealer legal name and public contacts).

Look for: contradictory claims, implied certification the facts do not support, unclear prior-use hints, incomplete warranty boasts, and finance/lease wording that looks misleading even if an APR string is present.

Reply with plain text only. Use one short note per line. If nothing misleading stands out, reply with exactly:
No additional misleading claims found.

Never say the ad is OMVIC approved, OMVIC certified, or legally cleared. Never output SQL, stack traces, API keys, phone/email/address that are not already in the user JSON. Never instruct the caller to change HTTP status codes.
```

User message = the 14 §11 ad-check JSON as-is. `finally` must `closeConversation`. Check `AIResponse.isSuccess()` before parsing. Collect each model line into `notes[].message`.

### B.5 Assistant system prompt (full English, copy-paste)

```
You are an in-dealership inventory helper. Answer only from the resource list in the user JSON.

Write one or two short sentences. Mention resource ids only if they appear in that list. Do not invent vehicles, customers, or listings. Do not output phone numbers, emails, or home addresses. Do not write to any database. If the list is empty or does not answer the question, say you found no matching in-store records.

Never claim legal approval. Never ask for secrets or tokens.
```

User message = `{ "question": "...", "resources": [ ... ] }`.

### B.6 core call sequence (exactly 8 steps)

`POST /api/v1/listings/{id}/checks`, body `{ "version" }`:

1. **This dealership + optimistic lock.** Listing missing or cross-store → 404. `version` ≠ current row → 409 `VERSION_CONFLICT`.
2. **Build public input.** listing title/body/adKind/medium; vehicle public fields (year/make/model/vin/conditionCode/source, **no** purchase/repair/sold price); dealership public four fields.
3. **Run `OmvicRuleEngine` (this document §C).** Obtain `hard[]`, `soft[]`.
4. **`hard[]` non-empty → do not call AI.** Same transaction INSERT `compliance_check` (`recommendation=BLOCKED`, `aiStatus=SKIPPED`, `ruleFindings`=hard+soft, `severity` hard=`BLOCK` / soft=`REVIEW`), write back `last_check_id`. HTTP **200** + full check object. `AiGatewayClient` **zero calls**. Stop.
5. **`hard[]` empty → then call AI.** core POSTs `/internal/v1/ad-check` via Gateway with `X-Dealer-Internal: ${INTERNAL_TOKEN:dealer-internal}` (that default is accepted only when gateway and ai-service run Spring profile `dev` or `local`; see §B.1); timeout in §D.
6. **Success (HTTP 200 and `success=true`).** INSERT check: `recommendation=PASSED`, `aiStatus=SUCCESS`, `ruleFindings`=soft (may be empty), `aiNotes`=`notes`. Write back `last_check_id`. HTTP **200**.
7. **Failure (timeout / missing key / not 200 / `success≠true`).** **Still persist**: `recommendation=UNAVAILABLE`, `aiStatus=UNAVAILABLE`, write back `last_check_id`. Ban treating as Pass.
8. **Public.** After step 7, HTTP **502** `AI_UNAVAILABLE`. Client GET listing then sees `checkStatus=AI_UNAVAILABLE`. If the write fails, the database wins: roll back the whole unit and check again next time.

---

## C. OMVIC executable rules (core, before AI)

Input: `listing` (title, body, adKind, medium), `vehicle` public fields, `dealer` public four fields.  
`text = listing.title + "\n" + listing.body`. Matching is always **CASE_INSENSITIVE**. Do not use `purchaseCost` as the advertised price. No APR column: search copy only.

`hard[]` non-empty → `recommendation=BLOCKED`, `aiStatus=SKIPPED`, **do not call AI**.  
`hard[]` empty → the fixed-rule side treats this as about to call AI (`NEEDS_AI`).

`ruleId` uses the identifiers below; HTTP element shape is in 14 §8.1.

### C.0 Shared regexes and helpers (copy-paste)

```java
static final Pattern PRICE = Pattern.compile(
    "(?:cad|c\\$|\\$)\\s*\\d[\\d,]*(?:\\.\\d{2})?|\\d[\\d,]*(?:\\.\\d{2})?\\s*(?:cad|dollars?)",
    Pattern.CASE_INSENSITIVE);

static final Pattern PHONE = Pattern.compile("\\d{3}[-.\\s]?\\d{3}[-.\\s]?\\d{4}");
static final Pattern EMAIL = Pattern.compile("\\S+@\\S+\\.\\S+");

static final Pattern APR = Pattern.compile(
    "\\d+(?:\\.\\d+)?\\s*%\\s*(?:apr|annual percentage rate)|apr\\s*[:=]?\\s*\\d+(?:\\.\\d+)?\\s*%",
    Pattern.CASE_INSENSITIVE);

static final Pattern PAYMENT = Pattern.compile(
    "\\$?\\d[\\d,]*(?:\\.\\d{2})?\\s*(?:per month|/mo|monthly|bi-?weekly|per week|/wk)",
    Pattern.CASE_INSENSITIVE);

static final Pattern TERM_MO = Pattern.compile(
    "\\d+\\s*(?:month|months|mo)\\b|term\\s*[:=]?\\s*\\d+",
    Pattern.CASE_INSENSITIVE);

static final Pattern LEASE_WORD = Pattern.compile("\\b(?:lease|leasing|lessee)\\b", Pattern.CASE_INSENSITIVE);
static final Pattern LEASE_RENT = Pattern.compile(
    "\\$?\\d[\\d,]*(?:\\.\\d{2})?\\s*(?:per month|/mo|monthly)",
    Pattern.CASE_INSENSITIVE);
static final Pattern LEASE_DOWN = Pattern.compile(
    "down payment|due at signing|\\$\\d[\\d,]*.{0,12}down",
    Pattern.CASE_INSENSITIVE);

/** Overrides 15’s unfinished capturedKm: must accept FX-09 “15000 km per year” and FX-16 “20,000 km per year”. */
static final Pattern LEASE_KM_ALLOWANCE = Pattern.compile(
    "(\\d{1,2}[, ]?\\d{3}|\\d{1,5})\\s*(?:km|kilomet(?:er|re)s?)\\s*(?:per|/)?\\s*(?:year|yr|annual)",
    Pattern.CASE_INSENSITIVE);
static final Pattern LEASE_EXCESS = Pattern.compile(
    "excess|overage|additional.{0,20}(?:km|kilomet)",
    Pattern.CASE_INSENSITIVE);

static final Pattern CERTIFIED = Pattern.compile("certified|cpo|certifi", Pattern.CASE_INSENSITIVE);
static final Pattern AS_IS = Pattern.compile("as[\\s-]?is", Pattern.CASE_INSENSITIVE);
static final Pattern UNFIT = Pattern.compile("unfit|not roadworthy|not fit", Pattern.CASE_INSENSITIVE);
static final Pattern IRREP = Pattern.compile("irreparable|salvage|write[\\s-]?off", Pattern.CASE_INSENSITIVE);

static final Pattern BRAND_NEW = Pattern.compile(
    "\\b(?:brand[\\s-]?new|never used|0\\s*km|zero kilometres|new car(?!\\s+feel))\\b",
    Pattern.CASE_INSENSITIVE);

static final Pattern PRIOR_USE_CUE = Pattern.compile(
    "police|taxi|cab\\b|limo(?:usine)?|uber|lyft|rideshare|daily rental|rental (?:car|fleet)|car[- ]share|"
        + "lease return|ex[- ]lease|former lease|repo(?:ssessed)?|ambulance|driver[- ]ed",
    Pattern.CASE_INSENSITIVE);
static final Pattern PRIOR_USE_DISCLOSURE = Pattern.compile(
    "(?:previously used as|prior use|former(?:ly)? (?:a )?(?:police|taxi|limo(?:usine)?|rental)|"
        + "ex[- ](?:police|taxi|limo(?:usine)?|rental)|lease return disclosed|disclosed prior use)",
    Pattern.CASE_INSENSITIVE);

static final Pattern WARRANTY_BOAST = Pattern.compile(
    "extended warranty|warranty included|free warranty",
    Pattern.CASE_INSENSITIVE);

static boolean blank(String s) {
    return s == null || s.trim().isEmpty();
}

static String digits(String s) {
    return s == null ? "" : s.replaceAll("\\D", "");
}

static boolean containsNormalized(String haystack, String needle) {
    if (blank(needle)) return false;
    String h = haystack.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    String n = needle.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    return h.contains(n);
}

/** 15 did not define this. Copy mentions a prior-use cue. */
static boolean mentionsPriorUseCue(String text) {
    return PRIOR_USE_CUE.matcher(text).find();
}

static boolean mentionsPriorUseDisclosure(String text) {
    return PRIOR_USE_DISCLOSURE.matcher(text).find();
}

/** 15 did not define this. Take the first annual-allowance number; “20,000” → 20000. No match → empty. */
static OptionalInt capturedKm(String text) {
    Matcher m = LEASE_KM_ALLOWANCE.matcher(text);
    if (!m.find()) return OptionalInt.empty();
    int km = Integer.parseInt(m.group(1).replaceAll("[, ]", ""));
    return OptionalInt.of(km);
}
```

### C.0a Course severity model (intentional vs specification wording)

The specification PDF lists many ad disclosures as flat “always required / must disclose.” This course engine still uses only two buckets:

- **hard (`BLOCK`)** — empty draft, missing price, missing dealer name, fully missing dealer contact, condition mismatch/undisclosed for AS_IS/UNFIT/IRREPARABLE, FINANCE/LEASE APR when that `adKind` applies, LEASE statement, LEASE excess-km when allowance &lt; 20,000. Non-empty `hard[]` → `BLOCKED` / `SKIPPED`, **do not call AI**.
- **soft (`REVIEW`)** — everything else that is regex-checkable but not a publish gate: incomplete contact, year omitted, new/used contradiction, certified not restated, prior-use cue without disclosure, warranty boast, FINANCE term, FINANCE APR proximity (ONLINE), LEASE term/rent/down, LEASE allowance unstated. Soft findings travel with the check and feed AI review; they **do not** alone block Ready.

**Deliberate course choices (do not “fix” by promoting soft → hard or adding columns without instructor sign-off):**

| Spec-ish item | Course ruling |
|---|---|
| Status used/new as its own always-required field | **No** `advertisedAsNew` column. Only soft `YEAR_NEW_USED_CONTRADICTION` when copy implies brand-new and `modelYear <= Y-2`. Condition disclosure remains the hard path via `conditionCode`. |
| FINANCE “cash price” | Covered by always-on hard `PRICE_MISSING` (same price regex). Not a separate FINANCE-only finding. |
| FINANCE “cost of borrowing” | **Not** a dedicated regex finding (amounts/fees too ambiguous for a fixed rule). Soft layout/APR review + AI notes cover residual risk. |
| FINANCE loan term / LEASE down / prior-use / warranty terms | Stay **soft** as pinned in §C.1 (AI reviews completeness). |
| Prior-use cue keywords | Include police / taxi / **limo(usine)** / cab / rideshare / rental / lease-return / etc. Still soft when cue lacks disclosure. |

Ban inventing hard blocks for the soft rows above. Ban adding APR / warranty / prior-use / used-new **columns** (15 already forbids those).

### C.1 Rule table (input / decision / hard vs soft)

Run the following rules on `text`. After the empty-draft short-circuit you may still accumulate, but the implementation must **first** return on empty draft (same as 15).

| ruleId | Input | Decision (pinned) | Bucket |
|---|---|---|---|
| `PRICE_MISSING` | `text` | `!PRICE.matcher(text).find()` | **hard** |
| `DEALER_NAME_MISSING` | `text`, `dealer.legalName` | `!containsNormalized(text, legalName)`. “the dealership” does not count as the name | **hard** |
| `DEALER_CONTACT_MISSING` | `text`, three dealership contacts | Phone: `containsNormalized(text, digits(phone))` **or** `PHONE`; email: contains the original **or** `EMAIL`; address: contains `contactAddress`. **All three missing** | **hard** |
| `DEALER_CONTACT_INCOMPLETE` | Same | Not all three present, but at least one | **soft** |
| `YEAR_NOT_IN_COPY` | `text`, `vehicle.modelYear` | Copy does not contain `String.valueOf(modelYear)` | **soft** |
| `YEAR_NEW_USED_CONTRADICTION` | `text`, `modelYear`, calendar year `Y` | `BRAND_NEW` hits **and** `modelYear <= Y - 2` (15 did not define a function: this document pins it; **soft**, hand to AI) | **soft** |
| `CONDITION_MISMATCH` | `text`, `conditionCode` | `CERTIFIED` hits and `code != CERTIFIED` | **hard** |
| `CONDITION_UNDISCLOSED` | Same | `code==UNFIT` and no `UNFIT`; or `IRREPARABLE` and no `IRREP`; or `AS_IS` and no `AS_IS`. Also add this code on empty draft | **hard** |
| `CERTIFIED_NOT_IN_COPY` | Same | `code==CERTIFIED` and no `CERTIFIED` regex | **soft** |
| `PRIOR_USE_UNCLEAR` | `text` | `mentionsPriorUseCue(text) && !mentionsPriorUseDisclosure(text)` | **soft** |
| `WARRANTY_CLAIM_NEEDS_REVIEW` | `text` | `WARRANTY_BOAST` hits | **soft** |
| `FINANCE_APR_MISSING` | `text`, `adKind==FINANCE`, or `CASH` whose copy matches `APR` or `PAYMENT` (spec §5: "if the ad shows a rate or payment") | `!APR.matcher(text).find()` | **hard** |
| `FINANCE_TERM_MISSING` | Same | No `TERM_MO` | **soft** |
| `FINANCE_APR_PROXIMITY` | FINANCE or CASH matching APR/PAYMENT, and `medium != RADIO_TV_BILLBOARD` | Cannot reliably regex “shown next to”; **add on every ONLINE finance-triggered ad** (with or without APR; still add soft when hard exists; does not change the hard block) | **soft** |
| `LEASE_APR_MISSING` | `adKind==LEASE` | No `APR` | **hard** |
| `LEASE_STATEMENT_MISSING` | Same | No `LEASE_WORD` | **hard** |
| `LEASE_TERM_MISSING` | Same | No `\d+\s*(month\|months\|mo)\b` | **soft** |
| `LEASE_RENT_MISSING` | Same | No `PRICE` and no `LEASE_RENT` | **soft** |
| `LEASE_DOWN_MISSING` | Same | No `LEASE_DOWN` | **soft** |
| `LEASE_EXCESS_KM_MISSING` | Same | `capturedKm` has a value **and** `km < 20000` **and** no `LEASE_EXCESS` | **hard** |
| `LEASE_ALLOWANCE_UNSTATED` | Same | `capturedKm` empty | **soft** |

Empty draft (`blank(title) && blank(body)`) **immediately** hard += `PRICE_MISSING`, `DEALER_NAME_MISSING`, `CONDITION_UNDISCLOSED`, return Blocked, do not call AI.

### C.2 Engine skeleton (copy-paste)

```java
Result runFixedOmvic(Listing L, VehiclePublic V, DealerPublic D) {
    String text = L.title + "\n" + L.body;
    List<Finding> hard = new ArrayList<>();
    List<Finding> soft = new ArrayList<>();

    if (blank(L.title) && blank(L.body)) {
        hard.addAll(PRICE_MISSING, DEALER_NAME_MISSING, CONDITION_UNDISCLOSED);
        return blocked(hard);
    }

    if (!PRICE.matcher(text).find()) hard.add(PRICE_MISSING);
    if (!containsNormalized(text, D.legalName)) hard.add(DEALER_NAME_MISSING);

    boolean hasPhone = containsNormalized(text, digits(D.contactPhone)) || PHONE.matcher(text).find();
    boolean hasEmail = containsNormalized(text, D.contactEmail) || EMAIL.matcher(text).find();
    boolean hasAddr  = containsNormalized(text, D.contactAddress);
    if (!(hasPhone && hasEmail && hasAddr)) {
        if (!(hasPhone || hasEmail || hasAddr)) hard.add(DEALER_CONTACT_MISSING);
        else soft.add(DEALER_CONTACT_INCOMPLETE);
    }

    if (!text.contains(String.valueOf(V.modelYear))) soft.add(YEAR_NOT_IN_COPY);
    int calendarYear = Year.now(ZoneOffset.UTC).getValue(); // Implementation uses UTC year; do not pick another time zone
    if (BRAND_NEW.matcher(text).find() && V.modelYear <= calendarYear - 2)
        soft.add(YEAR_NEW_USED_CONTRADICTION);

    boolean claimedCertified = CERTIFIED.matcher(text).find();
    boolean claimedAsIs = AS_IS.matcher(text).find();
    boolean claimedUnfit = UNFIT.matcher(text).find();
    boolean claimedIrrep = IRREP.matcher(text).find();

    if (claimedCertified && V.conditionCode != CERTIFIED) hard.add(CONDITION_MISMATCH);
    if (V.conditionCode == UNFIT && !claimedUnfit) hard.add(CONDITION_UNDISCLOSED);
    if (V.conditionCode == IRREPARABLE && !claimedIrrep) hard.add(CONDITION_UNDISCLOSED);
    if (V.conditionCode == AS_IS && !claimedAsIs) hard.add(CONDITION_UNDISCLOSED);
    if (V.conditionCode == CERTIFIED && !claimedCertified) soft.add(CERTIFIED_NOT_IN_COPY);

    if (mentionsPriorUseCue(text) && !mentionsPriorUseDisclosure(text))
        soft.add(PRIOR_USE_UNCLEAR);
    if (WARRANTY_BOAST.matcher(text).find()) soft.add(WARRANTY_CLAIM_NEEDS_REVIEW);

    if (L.adKind == FINANCE || (L.adKind == CASH
        && (APR.matcher(text).find() || PAYMENT.matcher(text).find()))) {
        if (!APR.matcher(text).find()) hard.add(FINANCE_APR_MISSING);
        if (!TERM_MO.matcher(text).find()) soft.add(FINANCE_TERM_MISSING);
        if (L.medium != RADIO_TV_BILLBOARD) soft.add(FINANCE_APR_PROXIMITY);
    }

    if (L.adKind == LEASE) {
        if (!APR.matcher(text).find()) hard.add(LEASE_APR_MISSING);
        if (!LEASE_WORD.matcher(text).find()) hard.add(LEASE_STATEMENT_MISSING);
        if (!Pattern.compile("\\d+\\s*(month|months|mo)\\b", CASE_INSENSITIVE).matcher(text).find())
            soft.add(LEASE_TERM_MISSING);
        if (!PRICE.matcher(text).find() && !LEASE_RENT.matcher(text).find())
            soft.add(LEASE_RENT_MISSING);
        if (!LEASE_DOWN.matcher(text).find()) soft.add(LEASE_DOWN_MISSING);
        OptionalInt km = capturedKm(text);
        if (km.isPresent()) {
            if (km.getAsInt() < 20000 && !LEASE_EXCESS.matcher(text).find())
                hard.add(LEASE_EXCESS_KM_MISSING);
        } else {
            soft.add(LEASE_ALLOWANCE_UNSTATED);
        }
    }

    if (!hard.isEmpty()) return blocked(concat(hard, soft)); // SKIPPED, do not call AI
    return needsAi(soft);
}
```

### C.3 Against 17: FX-01 / 03 / 10 / 11 / 12

Dealership public four fields and V-ASIS follow 17 §1. Running fixture copy through §C rules **must** produce the table below; do not invent another path.

| Fixture | hard[] (must include) | soft[] (allowed) | Call AI? | HTTP / DB state |
|---|---|---|---|---|
| **FX-01** missing-price CASH | `PRICE_MISSING` | no requirement | **No** | **200** `BLOCKED` / `SKIPPED` |
| **FX-03** FINANCE no APR | `FINANCE_APR_MISSING` | may have `FINANCE_APR_PROXIMITY` (ONLINE); does not change the hard block | **No** | **200** `BLOCKED` / `SKIPPED` |
| **FX-10** clean CASH | **empty** | usually empty (year already in copy) | **Yes** | success → **200** `PASSED` / `SUCCESS` |
| **FX-11** | this step **does not** run the engine | — | **No** | GET `checkStatus=STALE`; Ready/Export → **409** `CHECK_STALE` |
| **FX-12** copy = FX-10 | **empty** (same as FX-10) | same as FX-10 | **Yes** (then fail) | **502** `AI_UNAVAILABLE`; row written `UNAVAILABLE`; Ready → **409** `NOT_PASSED` |

FX-11 steps pinned: after FX-10 is `PASSED`, PATCH the price to `$17,900` (or any different advertised price) → `contentVersion++`, `status=DRAFT`, **do not** clear `lastCheckId` → derive `STALE`. Do not use a hard-fail ad to impersonate FX-12.

---

## D. Timeouts (do not split 15s another way)

**connect 2s + response 13s = 15s total.** Same set on both ends; do not “set only one 15000.”

### D.1 Spring / WebClient config keys (pinned)

**core** (`AiGatewayClient` → Gateway):

```yaml
dealerops:
  ai:
    connect-timeout-ms: 2000
    response-timeout-ms: 13000
    # Sum 15000; do not change the split
```

Java:

```java
HttpClient.create()
    .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 2000)
    .responseTimeout(Duration.ofMillis(13000));
WebClient.builder().clientConnector(new ReactorClientHttpConnector(httpClient));
```

**ai-service** (outbound to the model; in-library `blockOptional` has no 15s guarantee; wrap it):

```yaml
dealerops:
  ai:
    connect-timeout-ms: 2000
    response-timeout-ms: 13000
    timeout-ms: 15000   # Validation only: must equal the sum of the two above
```

Timeout → internal **504** `AI_TIMEOUT` (§B.2). Rate-limit queue **off by default**. CI does not hit paid endpoints.

---

## E. Coding-AI bans

- Do not change 13–19, BRIEF, README, or `AI-CODING-BACKEND.md` (if someone else is writing it).
- Do not move the rule engine into ai-service; do not embed the OMVIC hard checklist in the system prompt.
- Do not return 400/403 for a cross-store link; do not use 200/500 instead of `DUP_MEMBER` for one person on two stores.
- Do not use `VALIDATION` for sale price ≤ 0.
- Do not call `/internal/v1/ad-check` on a hard miss.
- Do not write business Java into this repo; this document only rules protocol and rules.
