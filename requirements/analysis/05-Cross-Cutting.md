# 05 Cross-Cutting Requirements

## 1. Audit (PDF §6)

Source: every modification to a DMS or CRM record is stamped with the acting user, the action, and a timestamp, and kept as that record's change history.

| ID | Requirement | Source | Priority |
|---|---|---|---|
| AUD-01 | Vehicle create / edit / sell writes audit | PDF §6 | Must |
| AUD-02 | Customer create / edit / link vehicle / unlink writes audit | PDF §6 | Must |
| AUD-03 | Each entry holds: acting user, action (CREATE / UPDATE / SELL / LINK / UNLINK), timestamp (stored UTC, shown local), object type and id | PDF §6 | Must |
| AUD-04 | Record which fields changed (name + before/after summary); for customer phone / email / address, record the field name only, not values | Derived / SCOPE | Should |
| AUD-05 | Audit is append-only; entries cannot be edited or deleted | Derived | Must |
| AUD-06 | Vehicle and customer detail pages show change history, newest first | PDF §6 | Must |
| AUD-07 | Audit is written in the same transaction as the business write; if the write succeeds, the audit exists | Derived | Must |
| AUD-08 | Admin dealer / login operations are also audited | Derived | Could |
| AUD-09 | Ad check results are kept as check history (see AD-10), not as separate audit entries | Derived | Should |

## 2. Architecture (PDF §6, SCOPE)

| ID | Requirement | Source | Priority |
|---|---|---|---|
| ARC-01 | DMS, CRM, and ad compliance are three front-end entries over one back end and one database, not three applications | PDF §6 | Must |
| ARC-02 | The ad check reads DMS vehicle and dealer data directly; no re-entry | PDF §1 | Must |
| ARC-03 | The browser reaches the back end only through the Gateway; direct calls to core / ai-service must fail | SCOPE | Must |
| ARC-04 | Repo split: `dealer-web` / `dealer-gateway` / `dealer-core` / `ai-service` + `dealer-platform` (IaC) | SCOPE | Must |
| ARC-05 | Synchronous REST + single database; no message queue | SCOPE | Must |
| ARC-06 | APIs under `/api/v1`; error body `{code, message}` | SCOPE | Must |
| ARC-07 | Deploy to Azure: Docker + Bicep + CI/CD | SCOPE (PPT) | Must |

## 3. Security (PDF §8, SCOPE)

| ID | Requirement | Source | Priority |
|---|---|---|---|
| SEC-01 | No home-grown username/password; sign in with Entra ID; the front end never handles passwords | PDF §8, SCOPE | Must |
| SEC-02 | The back end validates JWT signature, audience, and expiry, and authorizes by role | SCOPE | Must |
| SEC-03 | HTTPS everywhere | SCOPE | Must |
| SEC-04 | Secrets (DB connection string, AI key) live in Key Vault, never in the repo | SCOPE | Must |
| SEC-05 | Every business query enforces the dealer filter at the data layer (row-level isolation) | PDF §6 | Must |
| SEC-06 | Ad body text is passed to AI as data, guarding against prompt injection changing the verdict | Derived | Should |
| SEC-07 | Customer personal data is never sent to AI or written as audit values | SCOPE | Must |

## 4. AI (DOC, SCOPE)

| ID | Requirement | Source | Priority |
|---|---|---|---|
| AI-01 | Ad compliance uses a real LLM review (not a rule simulation) | DOC, SCOPE | Must |
| AI-02 | AI call timeout is 15 s; a failure is never shown as a pass | SCOPE | Must |
| AI-03 | In-dealer read-only Q&A assistant: answers questions such as inventory or customer counts; never writes to the database | SCOPE erratum 2 | Must |
| AI-04 | The assistant sees only its own dealer's data; answers never include purchase cost or customer phone / email / address | SCOPE | Must |
| AI-05 | AI output is structured (issue code + severity + explanation) for display | Derived | Should |

## 5. Non-functional

| ID | Requirement | Source | Priority |
|---|---|---|---|
| NFR-01 | Lists default to 10 per page | SCOPE | Must |
| NFR-02 | Money in CAD with two decimals; dates shown as `YYYY-MM-DD` | Derived | Should |
| NFR-03 | UI language is English (Ontario dealers) | Derived | Should |
| NFR-04 | Database backup strategy | PDF §8 | Should |
| NFR-05 | Own domain for deployment | PDF §8 | Should |
| NFR-06 | Desktop browser first; usable at phone width | Derived | Could |
| NFR-07 | Rate limits, throughput SLOs, PIPEDA retention | SCOPE | Won't |
