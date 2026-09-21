# AI 协议与规则硬规格

**现行有效。** 本文裁定 **覆盖** [14-Backend-API-Contract.md](14-Backend-API-Contract.md) / [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) 下列细处冲突。编码 AI **必须遵守本文**；不得再「选一种」或沿用 15 被废弃的分支。

本文不是业务代码、不是 OpenAPI 全文、不改 `13`–`19` / BRIEF / README。OMVIC 固定规则仍在 **dealer-core** 先于模型跑；ai-service 只做复核会话。

冲突顺序（仅本文触及的细处）：**本文 > 14 的 HTTP 细码 / 15 的数据行为细处**。未点名的路径、DTO、SQL 仍以 14 / 15 为准。

---

## A. 14 vs 15：四条写死

### A.1 跨店挂车：一律 404

**采用 14 的防探测语义，废弃 15 §4「看得见但店不一致 → 400 `WRONG_DEALER_OR_SOLD`」用于跨店 id。**

`PUT /api/v1/customers/{id}/vehicles/{vehicleId}` 判定顺序（禁止对调）：

1. JWT + `membership.active=1` 得到 `tenantDealerId`。无店 → **403** `FORBIDDEN`。
2. 用 **本店** 加载客户、车辆。客户 id 或车辆 id 对本店不存在（含他店真实 id）→ **404** `NOT_FOUND`。不要先按全局 id 取出再比 `dealer_id`。
3. 本店车且 `status != IN_STOCK`（含 `SOLD`）→ **400** `WRONG_DEALER_OR_SOLD`。
4. 本店车已挂任一客户 → **409** `VEHICLE_ALREADY_LINKED`。
5. 否则 200 + 审计 `LINK`。

`DELETE` 同路径：无关联或跨店 → **404**；本店车 `SOLD` → **409** `SOLD_LOCKED`。

**`WRONG_DEALER_OR_SOLD` 只用于：** 本店车、PUT 挂车、但已售或非 `IN_STOCK`。  
**禁止**再用于跨店 id、店不一致、客户在他店。14 §12 表里「车非本店」那半句以本文作废。15 §4 表第一行后半句作废。18 §6 同行「看得见但店不一致」作废（18 本身不改文件，实现按本文）。

### A.2 一人两店 active → 409 `DUP_MEMBER`

**采用 15 §2.2，14 必须补这一层（本文即补口）。**

同一 `entraOid` **同一时刻只允许一条** `membership.active=1`。

`POST /api/v1/admin/dealers/{id}/members`：

| 已有状态 | HTTP |
|---|---|
| 已是**本店** active | **409** `DUP_MEMBER` |
| 已是**另一店** active | **409** `DUP_MEMBER`（一人一店；先解绑再绑） |
| 本店曾解绑 `active=0` | **重激活**该行，不 409，不插第二行 |
| 无行 | INSERT，201 |

V1 `uk_membership (dealer_id, entra_oid)` 挡不住跨店双 active，**必须应用层检查**。读路径若发现 ≥2 条 active → 500 级配置错误，拒绝业务（15 §2.4）。不要做切店器。

### A.3 售价：`soldPrice > 0` 且与 `soldOn` 成对

`POST /api/v1/vehicles/{id}/sell` body：`soldOn`、`soldPrice`、`version`。

| 条件 | HTTP / code |
|---|---|
| 缺 `soldOn`，或 `soldOn` 空白 / 非 `YYYY-MM-DD` | **400** `SOLD_PAIR_REQUIRED` |
| 缺 `soldPrice`，或 JSON `null` | **400** `SOLD_PAIR_REQUIRED` |
| `soldPrice` 不是正数（`<= 0`、NaN） | **400** `SOLD_PAIR_REQUIRED` |
| 已售再售 | **409** `SOLD_LOCKED` |
| `version` 不匹配 | **409** `VERSION_CONFLICT` |
| 跨店 / 无此车 | **404** |

不变量：`IN_STOCK` ⇔ 两出售字段都 NULL；`SOLD` ⇔ 两者都非 NULL 且 `soldPrice > 0`。  
**禁止**用 `400 VALIDATION` 表示「价 ≤ 0」（18 曾允许二选一；本文取消选择）。PATCH 不得改 `status` / `soldOn` / `soldPrice`。

### A.4 AI system prompt：不要再塞 OMVIC 硬清单

**覆盖 09「system 放 OMVIC 清单」。** 硬规则只在 core `OmvicRuleEngine`。打进 `/internal/v1/ad-check` 的广告 **已通过 hard[]**。ai-service 的 system **只**复核是否误导。完整英文正文见 **§B.4**（可复制）。助手 prompt 见 **§B.5**。

---

## B. 内部 AI HTTP（14 §11 未钉的响应）

浏览器打 `/internal/v1/**` → Gateway **404**。core 出站只打 Gateway，不直连 8082。

### B.1 请求头

| 头 | 值从哪来 |
|---|---|
| `X-Dealer-Internal` | 环境变量 **`INTERNAL_TOKEN`**（Key Vault 建议名 `INTERNAL-TOKEN`） |
| 本地未设时的字面默认 | **`dealer-internal`**（三端同一默认：gateway 谓词、core 出站、ai-service 校验） |

禁止把用户 JWT 转给 ai-service。禁止把本头列入 Gateway CORS `allowedHeaders`。缺头或值不对 → **404**（不 401）。

### B.2 `POST /internal/v1/ad-check`

请求体形状仍是 14 §11（`listing` + `vehiclePublic` 无成本 + `dealerPublic`）。本文只钉 **响应**。

#### 成功 — HTTP **200**

```json
{
  "success": true,
  "notes": [
    { "message": "No additional misleading claims found." }
  ]
}
```

| 字段 | 类型 | 规则 |
|---|---|---|
| `success` | boolean | 必须 `true` |
| `notes` | array | 可 `[]`；元素至少 `{ "message": string }`。core 原样写入 `aiNotes` |

禁止成功体里再发明 `recommendation` / `checkStatus` / `ruleFindings`。五态由 core 写。成功且模型未要求硬拦 → core：`recommendation=PASSED`，`aiStatus=SUCCESS`。

#### 失败（core 一律映射对外 502 `AI_UNAVAILABLE`）

统一失败体（三种原因共用形状）：

```json
{
  "success": false,
  "code": "AI_TIMEOUT",
  "message": "Model call exceeded 15s."
}
```

| 原因 | HTTP | `code` | `message`（固定英文） |
|---|---|---|---|
| connect+response 超时 | **504** | `AI_TIMEOUT` | `Model call exceeded 15s.` |
| `AIMANAGER_API_KEY` 缺失或空白 | **503** | `AI_KEY_MISSING` | `AIMANAGER_API_KEY is missing or invalid.` |
| Key 无效 / `isSuccess()==false` / 解析失败 / 厂商错误 | **502** | `AI_PROVIDER_FAILED` | `Model did not return a usable result.` |

缺 Key：**立即** 503，**不要**挂满 15s。  
core 判定「AI 失败」：**HTTP ≠ 200，或 body.`success` ≠ true，或读超时**。然后：

- 仍 **INSERT** `compliance_check`：`recommendation=UNAVAILABLE`，`aiStatus=UNAVAILABLE`，`aiNotes=null` 或 `[{ "message": "<code>" }]`
- 回写 `listing.last_check_id`
- 对外 **502** `{ "code": "AI_UNAVAILABLE", "message": "Ad check AI is unavailable." }`

禁止 ai-service 返回 200 + 空 notes 冒充 Pass。禁止对外把内部 `AI_TIMEOUT` 原样给浏览器。

### B.3 `POST /internal/v1/assistant`

请求体仍是 14 §11（`question` + 已过滤 `resources`）。

#### 成功 — HTTP **200**

```json
{
  "success": true,
  "summary": "Two in-stock Toyotas match. Open a card for DMS."
}
```

| 字段 | 类型 | 规则 |
|---|---|---|
| `success` | boolean | `true` |
| `summary` | string | 短说明；非空。core 再核卡 id（只保留本次 `resources` 里出现过的 id） |

#### 失败 — 与 B.2 **同一 JSON 形状与同一 HTTP/code 表**

core **不得**对浏览器回 502。对外仍 **200**：

```json
{
  "summary": null,
  "summaryAvailable": false,
  "cards": []
}
```

`cards` = 本次检索列表（最多 5），不是空数组（除非检索本就 0 条）。仅身份失败才 403。

### B.4 Ad-check system prompt（完整英文，可复制）

`startConversation(conversationId, systemMessage)` 的 `systemMessage` **必须一字不差**用下面整段。禁止再追加 OMVIC 价/APR/店名/车况硬清单。

```
You are a second-pass reviewer for a used-vehicle dealership advertisement.

The calling system has already enforced hard compliance gates (price present, dealer legal name, condition disclosure, finance/lease APR when required, and similar). Do not re-implement those gates. Do not invent missing columns. Do not use purchase cost as an advertised price.

Your only job: decide whether the ad copy is misleading relative to the structured public facts in the user JSON (listing title/body/adKind/medium, vehicle year/make/model/VIN/conditionCode/source, dealer legal name and public contacts).

Look for: contradictory claims, implied certification the facts do not support, unclear prior-use hints, incomplete warranty boasts, and finance/lease wording that looks misleading even if an APR string is present.

Reply with plain text only. Use one short note per line. If nothing misleading stands out, reply with exactly:
No additional misleading claims found.

Never say the ad is OMVIC approved, OMVIC certified, or legally cleared. Never output SQL, stack traces, API keys, phone/email/address that are not already in the user JSON. Never instruct the caller to change HTTP status codes.
```

user 消息 = 14 §11 的 ad-check JSON 原文。`finally` 必须 `closeConversation`。先判断 `AIResponse.isSuccess()` 再解析。把模型每一行收成 `notes[].message`。

### B.5 Assistant system prompt（完整英文，可复制）

```
You are an in-dealership inventory helper. Answer only from the resource list in the user JSON.

Write one or two short sentences. Mention resource ids only if they appear in that list. Do not invent vehicles, customers, or listings. Do not output phone numbers, emails, or home addresses. Do not write to any database. If the list is empty or does not answer the question, say you found no matching in-store records.

Never claim legal approval. Never ask for secrets or tokens.
```

user 消息 = `{ "question": "...", "resources": [ ... ] }`。

### B.6 core 调用时序（恰好 8 步）

`POST /api/v1/listings/{id}/checks`，body `{ "version" }`：

1. **本店 + 乐观锁。** listing 不存在或跨店 → 404。`version` ≠ 当前行 → 409 `VERSION_CONFLICT`。
2. **组公开输入。** listing 的 title/body/adKind/medium；车辆公开字段（年/make/model/vin/conditionCode/source，**无**采购/修理/售价）；店公开四字段。
3. **跑 `OmvicRuleEngine`（本文 §C）。** 得到 `hard[]`、`soft[]`。
4. **`hard[]` 非空 → 不调 AI。** 同一事务 INSERT `compliance_check`（`recommendation=BLOCKED`，`aiStatus=SKIPPED`，`ruleFindings`=hard+soft，`severity` hard=`BLOCK` / soft=`REVIEW`），回写 `last_check_id`。HTTP **200** + 完整检查对象。`AiGatewayClient` **零调用**。结束。
5. **`hard[]` 空 → 才调 AI。** core 经 Gateway `POST /internal/v1/ad-check`，带 `X-Dealer-Internal: ${INTERNAL_TOKEN:dealer-internal}`，超时见 §D。
6. **成功（HTTP 200 且 `success=true`）。** INSERT 检查：`recommendation=PASSED`，`aiStatus=SUCCESS`，`ruleFindings`=soft（可空），`aiNotes`=`notes`。回写 `last_check_id`。HTTP **200**。
7. **失败（超时 / 缺 Key / 非 200 / `success≠true`）。** **仍落库**：`recommendation=UNAVAILABLE`，`aiStatus=UNAVAILABLE`，回写 `last_check_id`。禁止当 Pass。
8. **对外。** 步骤 7 之后 HTTP **502** `AI_UNAVAILABLE`。客户端再 GET listing 可见 `checkStatus=AI_UNAVAILABLE`。写库失败则以库为准，整单回滚，下次再检。

---

## C. OMVIC 可执行规则（core，先于 AI）

输入：`listing`（title, body, adKind, medium）、`vehicle` 公开字段、`dealer` 公开四字段。  
`text = listing.title + "\n" + listing.body`。匹配一律 **CASE_INSENSITIVE**。不用 `purchaseCost` 当标价。无 APR 列：只在正文找。

`hard[]` 非空 → `recommendation=BLOCKED`，`aiStatus=SKIPPED`，**不调 AI**。  
`hard[]` 空 → 固定规则侧视为将调 AI（`NEEDS_AI`）。

`ruleId` 用下表标识；HTTP 元素形状见 14 §8.1。

### C.0 共用正则与工具（可复制）

```java
static final Pattern PRICE = Pattern.compile(
    "(?:cad|c\\$|\\$)\\s*\\d[\\d,]*(?:\\.\\d{2})?|\\d[\\d,]*(?:\\.\\d{2})?\\s*(?:cad|dollars?)",
    Pattern.CASE_INSENSITIVE);

static final Pattern PHONE = Pattern.compile("\\d{3}[-.\\s]?\\d{3}[-.\\s]?\\d{4}");
static final Pattern EMAIL = Pattern.compile("\\S+@\\S+\\.\\S+");

static final Pattern APR = Pattern.compile(
    "\\d+(?:\\.\\d+)?\\s*%\\s*(?:apr|annual percentage rate)|apr\\s*[:=]?\\s*\\d+(?:\\.\\d+)?\\s*%",
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

/** 覆盖 15 未写完的 capturedKm：必须能吃 FX-09「15000 km per year」与 FX-16「20,000 km per year」。 */
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
    "police|taxi|cab\\b|uber|lyft|rideshare|daily rental|rental (?:car|fleet)|car[- ]share|"
        + "lease return|ex[- ]lease|former lease|repo(?:ssessed)?|ambulance|driver[- ]ed",
    Pattern.CASE_INSENSITIVE);
static final Pattern PRIOR_USE_DISCLOSURE = Pattern.compile(
    "(?:previously used as|prior use|former(?:ly)? (?:a )?(?:police|taxi|rental)|"
        + "ex[- ](?:police|taxi|rental)|lease return disclosed|disclosed prior use)",
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

/** 15 未定义。正文出现既往用途线索。 */
static boolean mentionsPriorUseCue(String text) {
    return PRIOR_USE_CUE.matcher(text).find();
}

static boolean mentionsPriorUseDisclosure(String text) {
    return PRIOR_USE_DISCLOSURE.matcher(text).find();
}

/** 15 未定义。取第一条年额度数字；「20,000」→ 20000。无匹配 → empty。 */
static OptionalInt capturedKm(String text) {
    Matcher m = LEASE_KM_ALLOWANCE.matcher(text);
    if (!m.find()) return OptionalInt.empty();
    int km = Integer.parseInt(m.group(1).replaceAll("[, ]", ""));
    return OptionalInt.of(km);
}
```

### C.1 规则表（输入 / 判定 / hard vs soft）

对 `text` 跑下列规则。空草稿短路后仍可继续累加，但实现必须 **先** 空草稿 return（与 15 一致）。

| ruleId | 输入 | 判定（写死） | 桶 |
|---|---|---|---|
| `PRICE_MISSING` | `text` | `!PRICE.matcher(text).find()` | **hard** |
| `DEALER_NAME_MISSING` | `text`, `dealer.legalName` | `!containsNormalized(text, legalName)`。「the dealership」不算店名 | **hard** |
| `DEALER_CONTACT_MISSING` | `text`, 店三联系 | 电话：`containsNormalized(text, digits(phone))` **或** `PHONE`；邮箱：包含原文 **或** `EMAIL`；地址：包含 `contactAddress`。**三项全无** | **hard** |
| `DEALER_CONTACT_INCOMPLETE` | 同上 | 三项未齐，但至少有一项 | **soft** |
| `YEAR_NOT_IN_COPY` | `text`, `vehicle.modelYear` | 正文不含 `String.valueOf(modelYear)` | **soft** |
| `YEAR_NEW_USED_CONTRADICTION` | `text`, `modelYear`, 日历年 `Y` | `BRAND_NEW` 命中 **且** `modelYear <= Y - 2`（15 未写函数：本文钉死；**soft**，交给 AI） | **soft** |
| `CONDITION_MISMATCH` | `text`, `conditionCode` | `CERTIFIED` 命中且 `code != CERTIFIED` | **hard** |
| `CONDITION_UNDISCLOSED` | 同上 | `code==UNFIT` 且无 `UNFIT`；或 `IRREPARABLE` 且无 `IRREP`；或 `AS_IS` 且无 `AS_IS`。空草稿也加本码 | **hard** |
| `CERTIFIED_NOT_IN_COPY` | 同上 | `code==CERTIFIED` 且无 `CERTIFIED` 正则 | **soft** |
| `PRIOR_USE_UNCLEAR` | `text` | `mentionsPriorUseCue(text) && !mentionsPriorUseDisclosure(text)` | **soft** |
| `WARRANTY_CLAIM_NEEDS_REVIEW` | `text` | `WARRANTY_BOAST` 命中 | **soft** |
| `FINANCE_APR_MISSING` | `text`, `adKind==FINANCE` | `!APR.matcher(text).find()` | **hard** |
| `FINANCE_TERM_MISSING` | 同上 | 无 `TERM_MO` | **soft** |
| `FINANCE_APR_PROXIMITY` | `adKind==FINANCE` 且 `medium != RADIO_TV_BILLBOARD` | 无法可靠正则并列 → **每条 ONLINE FINANCE 都加**（有无 APR 都加；有 hard 仍加 soft，不改变硬拦） | **soft** |
| `LEASE_APR_MISSING` | `adKind==LEASE` | 无 `APR` | **hard** |
| `LEASE_STATEMENT_MISSING` | 同上 | 无 `LEASE_WORD` | **hard** |
| `LEASE_TERM_MISSING` | 同上 | 无 `\d+\s*(month\|months\|mo)\b` | **soft** |
| `LEASE_RENT_MISSING` | 同上 | 无 `PRICE` 且无 `LEASE_RENT` | **soft** |
| `LEASE_DOWN_MISSING` | 同上 | 无 `LEASE_DOWN` | **soft** |
| `LEASE_EXCESS_KM_MISSING` | 同上 | `capturedKm` 有值 **且** `km < 20000` **且** 无 `LEASE_EXCESS` | **hard** |
| `LEASE_ALLOWANCE_UNSTATED` | 同上 | `capturedKm` 为空 | **soft** |

空草稿（`blank(title) && blank(body)`）**立即** hard += `PRICE_MISSING`, `DEALER_NAME_MISSING`, `CONDITION_UNDISCLOSED`，return Blocked，不调 AI。

### C.2 引擎骨架（可复制）

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
    int calendarYear = Year.now(ZoneOffset.UTC).getValue(); // 实现用 UTC 年，禁止再选时区
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

    if (L.adKind == FINANCE) {
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

    if (!hard.isEmpty()) return blocked(concat(hard, soft)); // SKIPPED, 不调 AI
    return needsAi(soft);
}
```

### C.3 对照 17：FX-01 / 03 / 10 / 11 / 12

店公开四字段与 V-ASIS 以 17 §1 为准。用 §C 规则跑夹具正文，**必须**得到下表，禁止另发明径。

| 夹具 | hard[]（必须含） | soft[]（允许） | 调 AI？ | HTTP / 库态 |
|---|---|---|---|---|
| **FX-01** 缺价 CASH | `PRICE_MISSING` | 无要求 | **否** | **200** `BLOCKED` / `SKIPPED` |
| **FX-03** FINANCE 无 APR | `FINANCE_APR_MISSING` | 可有 `FINANCE_APR_PROXIMITY`（ONLINE），不改变硬拦 | **否** | **200** `BLOCKED` / `SKIPPED` |
| **FX-10** 干净 CASH | **空** | 通常空（年份已在文中） | **是** | 成功 → **200** `PASSED` / `SUCCESS` |
| **FX-11** | 本步**不跑**引擎 | — | **否** | GET `checkStatus=STALE`；Ready/Export → **409** `CHECK_STALE` |
| **FX-12** 正文 = FX-10 | **空**（与 FX-10 同） | 同 FX-10 | **是**（然后失败） | **502** `AI_UNAVAILABLE`；行已写 `UNAVAILABLE`；Ready → **409** `NOT_PASSED` |

FX-11 步骤写死：FX-10 已 `PASSED` 后 PATCH 把价格改为 `$17,900`（或任意不同标价）→ `contentVersion++`，`status=DRAFT`，**不**清空 `lastCheckId` → 派生 `STALE`。不要用硬缺广告冒充 FX-12。

---

## D. 超时（禁止再拆 15s）

**connect 2s + response 13s = 总计 15s。** 两端同一套，不要「只设一个 15000」。

### D.1 Spring / WebClient 配置键（写死）

**core**（`AiGatewayClient` → Gateway）：

```yaml
dealerops:
  ai:
    connect-timeout-ms: 2000
    response-timeout-ms: 13000
    # 合计 15000；禁止改成别的拆法
```

Java：

```java
HttpClient.create()
    .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 2000)
    .responseTimeout(Duration.ofMillis(13000));
WebClient.builder().clientConnector(new ReactorClientHttpConnector(httpClient));
```

**ai-service**（出站打模型；库内 `blockOptional` 无 15s 保证，必须外包一层）：

```yaml
dealerops:
  ai:
    connect-timeout-ms: 2000
    response-timeout-ms: 13000
    timeout-ms: 15000   # 仅作校验：必须等于上两项之和
```

超时 → 内部 **504** `AI_TIMEOUT`（§B.2）。限流队列 **默认关**。CI 不打付费端点。

---

## E. 编码 AI 禁止事项

- 不要改 13–19、BRIEF、README，不要改 `AI-CODING-BACKEND.md`（若他人在写）。
- 不要把规则引擎搬进 ai-service；不要把 OMVIC 硬清单塞进 system prompt。
- 不要对跨店挂车回 400/403；不要对一人两店用 200/500 替代 `DUP_MEMBER`。
- 不要用 `VALIDATION` 表示售价 ≤ 0。
- 不要在硬缺时调用 `/internal/v1/ad-check`。
- 不要写业务 Java 进本仓；本文只裁定协议与规则。
