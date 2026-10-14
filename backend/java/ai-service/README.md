# ai-service

Internal AI adapter for Dealer Ops. Port **8082**, no database, not browser-facing. Calls `com.manager.AiManager` in-process. Do **not** scan or start library `com.gateway` / `AIApplication`.

Internal JSON follows `design/AI-PROTOCOL-AND-RULES.md` (not BACKEND T22 `{failed,reason}`).

## Vendored ai-manager sources

The `ai-manager` library is vendored as source under `src/main/java/com/manager` (plus `src/main/resources/models.json`), so the build needs no private repository, token, or local `mvn install`. Only the classes reachable from `AiManager` are copied; the library's own Spring Boot app (`com.gateway`, `AIApplication`) and its configuration files are not.

| Item | Value |
|---|---|
| Upstream repo | https://github.com/YUANDONG-YANG/ai-manager (private) |
| Vendored commit | `827196a` (xAI/Grok provider support) |
| Package | `com.manager` (unchanged; Lombok compiles it) |
| Public API used | `startConversation(id, systemMessage)`, conversation `request(prompt).send()`, `closeConversation` |

Do not edit the vendored sources for DealerOps behavior; put adapters in `ca.sait.dealerops.aiservice`. To take an upstream fix, copy the changed classes from a newer upstream commit and update the commit above.

## Build

```bash
mvn -DskipTests package
```

Use JDK 21, the same as the other Java services.

## Environment

| Variable | Default | Who |
|---|---|---|
| `AI_PORT` | `8082` | this service |
| `INTERNAL_TOKEN` | `dealer-internal` | `X-Dealer-Internal` (PROTOCOL §B.1). Accepted only when the Spring profile is `dev` or `local`; otherwise set a non-default token shared with gateway and dealer-core. |
| `SPRING_PROFILES_ACTIVE` | unset | Local classroom: `dev`. Do not set `dev` on Azure. |
| `AIMANAGER_API_KEY` | empty | this service only |
| `AIMANAGER_GATEWAY_PROVIDER` | `groq` | `groq` / `xai` / `openai` / `claude` / `deepseek` |
| `AIMANAGER_GATEWAY_MODEL` | `qwen/qwen3.8-27b` | this service |
| `AIMANAGER_GATEWAY_MAX_TOKENS` | `800` | Keep below free-tier provider output limits |

For an xAI/Grok key, set `AIMANAGER_GATEWAY_PROVIDER=xai`. Use an explicit supported model such as `grok-3-mini` when the account does not accept the `current` alias. Do not label an xAI key as `openai` or `groq`; those providers use different vendor endpoints.

If `src/main/resources/ai-key.md` exists locally, it holds whichever provider key you are using (e.g. `GROQ_API_KEY=...` or `XAI_API_KEY=...`). It is ignored by Git and must never be committed. IntelliJ should map it to the variables consumed by this service.

Default (Groq free tier):
```text
AIMANAGER_API_KEY=$GROQ_API_KEY
AIMANAGER_GATEWAY_PROVIDER=groq
AIMANAGER_GATEWAY_MODEL=qwen/qwen3.8-27b
```

Alternate (xAI/Grok):
```text
AIMANAGER_API_KEY=$XAI_API_KEY
AIMANAGER_GATEWAY_PROVIDER=xai
AIMANAGER_GATEWAY_MODEL=grok-3-mini
```

Missing key: immediate **503** `{ "success": false, "code": "AI_KEY_MISSING", "message": "AIMANAGER_API_KEY is missing or invalid." }` (do not wait 15s).

## Internal HTTP

- `POST /internal/v1/ad-check` — success `{ "success": true, "notes": [{ "message" }] }`
- `POST /internal/v1/assistant` — success `{ "success": true, "summary" }`
- Header `X-Dealer-Internal: ${INTERNAL_TOKEN}`; missing or wrong → **404**
- Failure: **504** `AI_TIMEOUT` / **503** `AI_KEY_MISSING` / **502** `AI_PROVIDER_FAILED`, body `{ "success": false, "code", "message" }`
- Timeout: hard cap of connect 2s + response 13s = 15s, enforced by `TimedModelCall` around the library call (the vendored providers set no HTTP timeout of their own); over the cap → **504** `AI_TIMEOUT`

Do not configure browser CORS on this process. `dealer-core` calls only through Gateway.
