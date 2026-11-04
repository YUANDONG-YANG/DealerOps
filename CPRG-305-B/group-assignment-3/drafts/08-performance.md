# Performance smoke — current .NET gateway

**Status: NOT RUN**

Date of the check: 2026-11-02. This note is a smoke sample plan plus the result of looking for an already-running gateway. It is not a load test, and it records no timings.

## Stated speed requirement

The current requirement is in `design/20-Observability.md` §6 (NFR-07), which `requirements/DealerOps-Requirements.md` (NFR-07) points at for the SLO targets. In short:

- Non-AI calls through the gateway should stay under **1 second at the 95th percentile**.
- An ad compliance check should finish, or come back as `AI_UNAVAILABLE`, within **15 seconds** (AI-02).
- Gateway health (`/actuator/health`, with downstream services up) is an availability target of **99.5% per calendar month**, not a response-time target.
- A signed-in user may send up to **600 requests per minute** before the gateway answers `RATE_LIMITED` (`design/19-Gateway-and-AI-Engineering.md` §1.5.1). That is a rate ceiling, not a latency number.

Section 6 says these are cloud-deployment objectives. It also says no load test has been run, so they are targets, not measured results.

An older archived note, `design/archive/01-Scope-and-Acceptance.md`, set a routine list/save goal of p95 no more than 2 seconds in the team's shared test environment, with AI timed separately. The active SLO used here is the 1-second p95 in `design/20-Observability.md` §6.

## Whether the gateway was already listening

The documented health URL for the current .NET gateway is `GET /actuator/health` on the gateway (`README.md`; mapped in `backend/dotnet/DealerOps.Gateway/Program.cs`). The documented gateway port is `8080` (`GATEWAY_PORT` in `design/15-Data-Auth-and-Gateway.md` and `README.md`).

A local observation on 2026-11-02 found **no listener** on that port and **no gateway process**. The course does not accept a developer machine as the formal environment. This check only answers whether a process was already up. It is not a formal-environment measurement.

The gateway was not started. No request was sent. There is no sample table.

## Samples

| Item | Result |
|---|---|
| Requests sent | 0 |
| HTTP statuses | none |
| `time_total` samples | none |
| Min | not computed (no samples) |
| Max | not computed (no samples) |
| Average | not computed (no samples) |

There is no sum and no division. Twenty sequential health requests, each with its own `time_total` and status, would be a smoke sample only: one request after another, then min, max, and the arithmetic mean of those twenty times. That would not be a load test, and it would not estimate the p95 of non-AI business APIs.

## What this smoke does not cover

No AI provider was called. The 15-second ad-check budget was not measured. Gateway `/actuator/health` only probes the Core and AI service health paths; it does not call a model. That probe was not sent, because the gateway was not already listening.

Timings from the retired Java stack are a different runtime and are not results for this .NET gateway.
