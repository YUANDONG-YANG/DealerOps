# Audit IP Tracking Review (2026-11-08)

Question: as a platform with financial characteristics, the admin needs to track a user's IP
"as finely as possible", locate the person, and quickly see **all** of that person's operations
on the platform. Why does IP tracking appear "not to work", and what is the smallest set of
changes that meets the goal?

Answer: the capture -> store -> display chain is already wired and correct end to end. Per-person
tracking already works today through the Actor filter on the platform audit log, so no change is
needed for that. The one real gap toward the stated goal is that the audit log cannot be filtered
or drilled down by client IP. Separately, IP geolocation is inherently city/neighbourhood level and
cannot resolve a street address; the code already requests the finest fields the provider returns.
A production "Unavailable" location is an outbound-lookup problem, not a tracking defect.

No code, `design/`, or index files were changed. This file only records findings and the smallest
fix for each, for the implementer to pick up later.

## What already works (no change needed)

- Every audit row carries `actor_username`
  (`backend/dotnet/DealerOps.Core/Audit/AuditEventEntity.cs:22`), and the platform log
  `GET /api/v1/admin/audit` filters by **Actor** (any substring of the username, case-insensitive)
  across the whole platform (`AuditLogFilter.cs:13`, `AuditService.Filtered` at
  `backend/dotnet/DealerOps.Core/Audit/AuditService.cs:112`; UI box at
  `frontend/react/src/components/AuditLogPanel.tsx:59`). Typing a user's username already returns
  "all of this person's operations, newest first". The username is the reliable per-person key;
  IP is a weaker one (it changes, is shared, and can be behind a VPN).
- IP capture is correct and spoof-resistant: the gateway trusts exactly one forwarded hop
  (`DealerOps.Gateway/Program.cs:177`, `ForwardLimit = 1`, known proxies/networks cleared so the
  single hop is honoured), YARP forwards it, and Core reads the first `X-Forwarded-For` segment
  (`AuditService.cs:198`). Do **not** loosen `ForwardLimit`; that would let a caller spoof the IP.
- IP and location are shown on the admin and dealership logs
  (`AuditLogPanel.tsx:93`), stored on every write (`AuditService.Record`,
  `AuditService.cs:58` and `:72`).

## Open issues

| ID | Severity | Where | Issue | Evidence | Smallest fix |
|---|---|---|---|---|---|
| A1 | Gap (feature) | `Audit/Dto/AuditLogFilter.cs`, `AuditService.Filtered` (`AuditService.cs:96`), `AuditLogPanel.tsx` | The admin/dealership log cannot be filtered or drilled down by client IP. `Q` free text only matches action, record type, and the JSON change columns (`AuditService.cs:117`); it does **not** search `ClientIp` or `ClientLocation`. So "show every operation from IP X" is impossible today. | `AuditLogFilter` has no `ClientIp` field; `Filtered` has no `e.ClientIp` predicate. | Add a `ClientIp` field to `AuditLogFilter`; add `query.Where(e => e.ClientIp == filter.ClientIp)` when set; make the "Source IP" table cell clickable to set that filter. Optionally also OR `ClientIp`/`ClientLocation` into the `Q` search. Keep the same page/sort/envelope. |
| A2 | Expectation (not a bug) | `Audit/IpGeolocator.cs:64` | "As fine as possible" cannot reach a home/street address. IP geolocation tops out at city / district / postal, regardless of provider. | The lookup already requests `country,regionName,city,district,zip` and formats the finest available place. | None on precision. Precision gains come from A1 (aggregate by IP), not from the geocoder. If finer-than-free is wanted, a paid provider of the same JSON shape plugs into `IpGeo:ApiKey` (`IpGeolocator.cs:29`), still city-level. |
| A3 | Environment (verify) | Core outbound -> `ip-api.com`; `appsettings.json:16` (`IpGeo:BaseUrl=http://ip-api.com`) | If production shows Location = "Unavailable", the IP was recorded but the geocode failed: the free endpoint is HTTP-only and rate-limited (~45/min), and Core's outbound may be blocked or time out (2s). The IP column is unaffected. | Core log line `IP geolocation lookup failed errorType=...` (`20-Observability.md:251`). | Confirm via the log. If blocked, allow Core egress to the endpoint, or point `IpGeo:BaseUrl`/`IpGeo:ApiKey` at a reachable provider of the same shape. Lookup failure never fails the audited action by design (`AuditService.cs:213`). |
| A4 | By design (not a bug) | `Audit/Dto/AuditItem.cs:3`, `AuditService.ToItem` (`AuditService.cs:368`) | A single record's history panel never shows IP/location; only the admin and dealership logs do. Looking for IP on a record's history is the most common "it isn't working". | `ToItem` does not populate `ClientIp`/`ClientLocation`; only `PageOfLog` (`AuditService.cs:187`) does. | None, unless the product decides a record's history should also show IP. Then populate the two fields in `ToItem`. |

## Not recommended for this project (minimum-spec)

These are typical "financial-grade" audit hardening items. They exceed the graduation-project
spec and are listed so the decision is explicit, not to propose them:

- Tamper-evident hash chaining of audit rows (prove the log was not altered).
- Retention / archival policy for audit rows.
- "Read auditing" (log who viewed or exported audit and customer PII); an `EXPORT` action already
  exists in the UI action list (`AuditLogPanel.tsx:13`) but is not wired to a read path.
- PII minimisation/encryption of the contact values stored in `field_summary` (AUD-04 keeps them
  in clear).

## Recommendation

For the stated goal, A1 is the only functional change worth making, and it is small and local. A3
is an operational check, not code. A2 and A4 are expectation-setting. The per-person requirement
("see all of one person's operations") is already met by the existing Actor filter.
