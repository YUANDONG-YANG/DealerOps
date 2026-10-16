# DealerOps Requirements — Open Questions and Coverage Gaps

**Date:** 2026-10-15
**Trigger:** Full re-verification of all 199 requirement rows in `requirements/DealerOps-Requirements-zh.html` against the current working tree, followed by a cross-check of that document against the original client sources.
**Method:** Static source review of `backend/dotnet/**` and `frontend/react/src/**` (20 parallel review passes, one per requirement block), then a reading of the client sources: `requirements/DealerOps-Specification.pdf`, `requirements/Dos Car dealership.docx`, `requirements/Dos Car dealership2.docx`. No automated tests were written or run, and no service was started — this is a document-and-code audit only.
**Status outcome recorded in the requirements document:** 182 implemented, 8 partial, 2 not implemented, 7 out of scope.

This file records only what is **unresolved**: coverage the requirements document never derived from the client sources, deviations that are not written down as errata, internal document inconsistencies, and questions that need a decision from the client or the instructor. Per-row implementation gaps already carry an inline note in the requirements document and are not duplicated here, except for the summary in §4.

---

## 0. Priority — business behaviour first

Project owner's ruling, 2026-10-15: **finish the business requirements first; everything else is secondary.** The items below are ordered on that basis, so a reader does not have to weigh all 24 findings equally.

| Rank | Item | Why it is business behaviour |
|---|---|---|
| **1** | **G-01** — no rule requires an ad to state used/new status | A disclosure the specification PDF §5 lists as always required. An OMVIC compliance hole in the product's headline feature. |
| **2** | **G-02** — credit ads not required to disclose a cash price or cost of borrowing | Same section, same feature. Today a "$299/month" ad passes the price check while disclosing neither. |
| **3** | **AUTH-08** — an admin JWT still reaches `/api/v1/ai/**` | A "must" tenancy rule: the platform admin is required to get 403 on every business interface. Core enforces it; the Gateway and AI service do not. |
| **4** | **AUD-07** — membership row commits before its audit row | Audit completeness is a business rule (`AUD-01`…`AUD-09`), though this is a narrow admin-path edge case. |
| — | Everything else | Documentation tracking (**G-03**, **G-04**, **D-01**, **D-03**…**D-06**), infrastructure and delivery (`ARC-03`/`06`/`07`, `NFR-05`, `AT-23`), presentation (`NFR-02`). Not business behaviour; defer. |
| — | **Exception, not deferrable:** §6 credential exposure | Not a feature, but the only finding that worsens with time, since the keys are already in pushed history. Rotation is independent of the business work. |

Closed by the same ruling: **D-02** / **OQ-04** — Firebase dropped. Google one-click sign-in was then requested and delivered on 2026-10-15 as `AUTH-23`, outside this ranking; it is additive and touches none of the four items above.

---

## 1. Coverage gaps against the original client sources

These are requirements present in the client material that the requirements document never turned into a requirement row, so no implementation could be expected.

| ID | Source | Gap | Impact |
|---|---|---|---|
| **G-01** | Specification PDF §5, "Always required" list: *"Status (used/new) and year"* | The rule engine requires the **year** to appear in the copy (`YEAR_NOT_IN_COPY`) and flags a **contradiction** when the copy claims "brand new" on a vehicle two or more model years old (`YEAR_NEW_USED_CONTRADICTION`). Nothing requires the ad to state whether the vehicle is **used or new** at all. An ad that simply never mentions it passes. None of the 23 reason codes in `backend/dotnet/DealerOps.Core/Compliance/OmvicRuleEngine.cs` covers this, and no requirement row asks for it. | A disclosure the PDF lists as always required is not checked. Highest-value gap of this audit. |
| **G-02** | Specification PDF §5, financing section: *"Cash price / cost of borrowing"* | Row `AD-R13` records the decision "price is covered by R07, no separate cost-of-borrowing rule". But `PRICE_MISSING` is satisfied by **any** dollar amount in the copy, so a credit ad reading only "$299 per month" passes the price check while disclosing neither a cash price nor the cost of borrowing. The recorded decision therefore does not deliver what the PDF asks for. | The implementation matches the requirement row, but the requirement row under-delivers against the PDF. Needs an explicit accept-or-implement decision. |
| **G-03** | Client data in `Dos Car dealership2.docx` | The DOCX specifies a **public landing page** (branding, navigation, login button, hero, dashboard preview, feature cards, VIN decoder section, responsive design, CTA). It is fully implemented at `frontend/react/src/pages/LandingPage.tsx` and routed at `/`, but there is **no requirement row for it** — the only occurrence of "Landing" in the requirements document is an implementation note on `UI-02`. PDF §7 lists only "Login — Public" as a public page. | Implemented but untracked: no acceptance criterion, and a reviewer reading the requirements document would not know the page is in scope. |
| **G-04** | Client data in `Dos Car dealership2.docx`; `design/21-Feature-Extensions.md` | VIN decode via the NHTSA vPIC API, lead follow-up (`LEAD-01`–`09`), reconditioning work orders (`WO-01`–`07`) and Image Studio (`IMG-01`–`05`) are implemented in code but live **only** in `design/21-Feature-Extensions.md`. The requirements document references them without carrying them: `AD-17` points at "IMG-01–05" and `CRM-15` points at "LEAD-01–09", and neither target exists in that document, so neither has a verifiable status. | 21 extension requirements have no status tracking in the signed-off requirements artifact. |

## 2. Deviations from the client sources that are not recorded as errata

The requirements document's §1 names exactly two errata (login by email/username/phone; Terraform plus App Service instead of containers). The following substantive deviations are visible only inline, or not at all.

| ID | Deviation | Where it is acknowledged today |
|---|---|---|
| **D-01** | PDF §5 opens with *"the salesperson completes a checklist"*. The delivered behaviour is a **display-only** checklist that collects no answers, so a prior use or warranty the copy never mentions cannot be inferred. | Stated inline in the `AD-02` row text and in `requirements/DealerOps-Requirements.md` §5 prose, but it is not in the errata list despite changing the nature of the feature. |
| **D-02** | The client data in `Dos Car dealership2.docx` describes a **Firebase** login system with email/password **and Google sign-in**. **Resolved 2026-10-15, split in two.** *Firebase: dropped.* It was a team technology sketch ("Firebase = authentication/database services") describing a teammate's starter prototype against Firebase project `dealer-ops-c0851`; the authoritative specification PDF never mentions it, PDF §8 asks only that production hash and salt passwords server-side (BCrypt plus JWT already exceeds that), and adopting it would contradict `ARC-01` / `ARC-05` (one backend, one MySQL database) and the row-level isolation in `SEC-05` / `AUTH-07`. *Google one-click sign-in: implemented* the same day as `AUTH-23`, using Google's ID-token flow directly — no Firebase, no client secret, no schema change, and no change to tenancy. | Closed. Erratum 1 (`AUTH-11` / `AUTH-12`) still governs password sign-in; Google is an additional authentication method that grants no role and no dealership. This also supersedes `AUTH-19` in `design/21-Feature-Extensions.md`, which had ruled out all social providers. |

## 3. Internal document inconsistencies

| ID | Inconsistency | Correct state |
|---|---|---|
| **D-03** | `requirements/DealerOps-Requirements.md:226` says the exported TXT holds the vehicle's "year / make / model / VIN / condition / **source**". The export builder in `backend/dotnet/DealerOps.Core/Listing/ListingService.cs` deliberately omits `source`, and the HTML row for `AD-13` says only "vehicle public fields". | Omitting `source` is the intended behaviour (acquisition source is internal, not public ad content). The Markdown row is stale and should drop `source`. |
| **D-04** | Rows `ARC-04` and `ARC-07` describe "three .NET **8** services". Every project file sets `<TargetFramework>net10.0</TargetFramework>`, while `deploy/terraform/main.tf` declares `dotnet_version = "8.0"` for the App Service apps. | The documents and the Terraform runtime version disagree with the actual build output. The Terraform mismatch is a deployment risk, not just a wording issue. |
| **D-05** | Acceptance row `AT-37` expects a dealer profile that is "missing phone and email" to yield `DEALER_CONTACT_INCOMPLETE` (REVIEW). All four dealer contact fields are `[Required]` on create and patch, so that profile state cannot be produced. The reason code itself **is** reachable — it fires when the ad **copy** carries some but not all of phone/email/address — so the earlier note claiming the branch was dead was wrong. | The scenario's precondition is unsettable and the row needs rewording to drive the rule from ad copy rather than from the dealer record. |
| **D-06** | `requirements/analysis/07-Open-Questions-and-Assumptions.md` Q-15 and `requirements/analysis/08-Design-Review.md` A7 were previously recorded as contradicting each other on whether OMVIC rules are config-driven. The code is unambiguous: rules are hard-coded regexes and branches in `OmvicRuleEngine.cs`, matching the `Q-15` answer "not in this version" and the `AD-15` "won't do". | Resolved in favour of hard-coded rules; the stale analysis note should be reconciled so a future reader does not reopen it. |

## 4. Residual implementation gaps

Carried with an inline note in `requirements/DealerOps-Requirements-zh.html`; listed here only so this file is self-contained.

| Row | Status | Substance |
|---|---|---|
| `SEC-04` | Not implemented | Database password, JWT dev secret and internal service token are committed; a live AI provider key sits in a tracked file. See §6. |
| `NFR-05` | Not implemented | No custom hostname, DNS zone or certificate anywhere; every URL is an `azurewebsites.net` default. |
| `AUTH-08` | Partial | The Gateway proxies a `Platform.Admin` JWT straight to `/api/v1/ai/**`, and the AI service's controllers carry no role check, so an admin reaches the assistant and ad-check routes instead of a 403. |
| `ARC-03`, `AT-23` | Partial | `DealerOps.Core` has no gateway-only or internal-token guard and registers `AllowAnyOrigin` CORS, so a browser holding a valid JWT can call Core directly. Only the Azure IP restriction blocks it; local and classroom runs have no equivalent. The AI service, by contrast, is genuinely code-guarded. |
| `ARC-06` | Partial | Three different error envelopes: Gateway `{code,message}`, Core `{code,message,requestId,fieldErrors?}`, AI `{success,code,message}`, and a YARP 502 carries no body at all. |
| `ARC-07` | Partial | The SPA runs as a fourth App Service app with `pm2 serve`, not on Azure Static Web Apps. All five CI workflows are build-only and their path filters point at the retired `backend/java/**` and `dealer-web/**` trees, so CI never builds the active .NET or React code and never deploys. |
| `AUD-07` | Partial | `MembershipService.Add` commits the membership row before the transaction that writes its audit row, so a failure in between leaves a membership with no audit record. Work-order completion, previously reported as the offender, is now correctly atomic. |
| `NFR-02` | Partial | Three sites still render a raw backend `DateTime` instead of the shared helper: `PendingAccounts.tsx:83`, `LeadsPage.tsx:384`, `WorkOrderPanel.tsx:271`. |

## 5. Questions requiring a client or instructor decision

| ID | Question | Why it matters |
|---|---|---|
| **OQ-01** | Must an ad state used/new status explicitly, and should a missing statement BLOCK or REVIEW? | Resolves **G-01**. PDF §5 lists it as always required; nothing checks it today. |
| **OQ-02** | For credit ads, do we accept that any dollar amount satisfies the price rule, or do we add a distinct cash-price / cost-of-borrowing rule? | Resolves **G-02**. Affects whether a "$299/month" ad should block. |
| **OQ-03** | Is a display-only checklist accepted as satisfying "the salesperson completes a checklist"? | Confirms **D-01** and, if accepted, should become a numbered erratum. |
| ~~**OQ-04**~~ | ~~Is dropping the client's Firebase and Google sign-in direction accepted?~~ **Closed 2026-10-15, then partly reopened and delivered the same day.** Firebase stays dropped; **Google one-click sign-in was implemented** on request as `AUTH-23`, without Firebase. | See **D-02**. |
| **OQ-05** | Should the landing page and the 21 extension requirements be folded into the requirements document, or does `design/21-Feature-Extensions.md` remain their system of record? | Resolves **G-03** and **G-04**, and decides whether `AD-17` and `CRM-15` keep pointing at rows that do not exist where they point. |
| **OQ-06** | Is a Groq **preview** model acceptable for the graded demo? | `AI-01` is satisfied by `qwen/qwen3.8-27b`, which Groq serves but labels "intended for evaluation purposes only; should not be used in production environments", and which may be withdrawn. An earlier review pass wrongly reported the id as non-existent; it is valid. |
| **OQ-07** | Does the course require direct access to Core to fail in the local and classroom environment, or is the Azure IP restriction sufficient evidence? | Decides whether `ARC-03` / `AT-23` must be fixed in code before the defence. |
| **OQ-08** | Is a single uniform `{code, message}` envelope required across all three services, or is the current per-service shape acceptable given the frontend tolerates it? | Decides whether `ARC-06` is a real defect or a documentation correction. |

## 6. Credential exposure found during this audit

Recorded here because it blocks `SEC-04` and because the repository rules require reporting rather than fixing. No value is reproduced in this file.

- **Git history already contains full-length provider keys.** Commit `189cfba` carries them in `backend/java/ai-service/src/main/resources/ai-key.md` and `deploy/terraform/terraform.tfvars`; `38a11ae` carries one in `deploy/terraform/terraform.tfstate`. Commit `6fb2643` additionally holds a Terraform state with the MySQL administrator password and Key Vault secret values in plain form. History is permanent until rewritten, so **the keys must be rotated — deleting the files is not sufficient.**
- **The working tree currently holds live keys in two tracked files:** `backend/dotnet/DealerOps.AiService/appsettings.json` and `backend/java/ai-service/src/main/resources/ai-key.md`. Both are tracked, so `.gitignore` does not protect them and a `git commit -a` would publish them.
- **Committed non-AI secrets:** connection-string password, JWT dev secret and internal service token in `backend/dotnet/DealerOps.Core/appsettings.json`, plus the internal token and JWT dev secret in `backend/dotnet/DealerOps.Gateway/appsettings.json`.
- **Client-supplied credentials inside a source document:** `requirements/Dos Car dealership2.docx` embeds a Firebase web configuration and a test account. A Firebase web API key is public by design, but the document itself instructs the reader to keep it in an uncommitted `.env.local`, and it is committed inside the DOCX.
- Suggested sequence: rotate the AI key and the database password, move both to environment variables or `dotnet user-secrets`, `git rm --cached` the two tracked key files, then decide separately whether the history warrants a rewrite.

## 7. Corrections to the previous review pass

The status marks that existed before this audit were materially out of date; 58 of 199 rows changed. Recording the pattern so the next reviewer does not trust stale notes:

- **26 rows marked "Partial" were already fixed** by then-uncommitted frontend work (required-field asterisks, paging reset on filter change, status in the vehicle detail drawer, searchable link picker, assistant read-only notice, Image Studio original/enhanced rendering, and others).
- **`CRM-13` was marked "not implemented"** although a warn-only duplicate-email check exists at `frontend/react/src/pages/CrmPage.tsx:282-295`.
- **`NFR-04` was marked "not implemented"** although `deploy/terraform/main.tf` sets `backup_retention_days = 7` on the MySQL flexible server.
- **`AD-R02` and `AT-37` rested on a wrong premise** — that `DEALER_CONTACT_INCOMPLETE` was unreachable because dealer contact fields are mandatory. The rule reads the **ad copy**, not the dealer record, so it is reachable; see **D-05**.
- **`AI-01` was questioned on the model id.** The configured `qwen/qwen3.8-27b` is a real, Groq-served model; the open issue is its preview status, not its existence (**OQ-06**).
- Two review passes in this audit contradicted each other on that model id, and one asserted a documentation page that does not support its claim. Model-id and provider-capability claims should be verified against the provider's own catalogue before being recorded.
