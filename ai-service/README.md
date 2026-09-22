# ai-service

Internal AI adapter for Dealer Ops. Port **8082**, no database, not browser-facing. Calls `com.manager.AiManager` in-process. Do **not** scan or start library `com.gateway` / `AIApplication`.

Internal JSON follows `design/AI-PROTOCOL-AND-RULES.md` (not BACKEND T22 `{failed,reason}`).

## GitHub ai-manager

Do not copy this library into DealerOps and do not change its business source. Consume the JAR.

| Item | Value |
|---|---|
| Repo | https://github.com/YUANDONG-YANG/ai-manager (private) |
| Local checkout | sibling directory named `ai-manager` (same parent as this repo) |
| Pinned commit | `c07e1f2afe5dd692c20f3567ad3a42a90d31a87a` |
| Maven | `com.aimanager:aimanager:1.0.0-SNAPSHOT` |
| Packages | https://maven.pkg.github.com/YUANDONG-YANG/ai-manager |
| Library Java | 17 bytecode / Boot parent 3.2.5 (this service stays Java 21) |
| Public API used | `startConversation(id, systemMessage)`, conversation `request(prompt).send()`, `closeConversation` |

## Local install

Use JDK 21 for this service. In the sibling `ai-manager` checkout (do not edit that repo):

```powershell
git checkout c07e1f2afe5dd692c20f3567ad3a42a90d31a87a
mvn -DskipTests install
```

Then in `ai-service`:

```powershell
mvn -DskipTests compile
```

The default Maven profile `aimanager` resolves `com.aimanager:aimanager:1.0.0-SNAPSHOT` from the local `.m2` (or GitHub Packages if configured).

## CI stub (no paid model)

```powershell
mvn "-Pstub,!aimanager" "-Daimanager.stub=true" test
```

That compile path uses `src/main/java-stub` only. A stub call with a key still returns **502** `AI_PROVIDER_FAILED`. Do not treat stub success as Sprint 2 real AI.

## Environment

| Variable | Default | Who |
|---|---|---|
| `AI_PORT` | `8082` | this service |
| `INTERNAL_TOKEN` | `dealer-internal` | `X-Dealer-Internal` (PROTOCOL §B.1) |
| `AIMANAGER_API_KEY` | empty | this service only |
| `AIMANAGER_GATEWAY_PROVIDER` | `openai` | `groq` / `openai` / `claude` / `deepseek` |
| `AIMANAGER_GATEWAY_MODEL` | empty → `current` | this service |

Missing key: immediate **503** `{ "success": false, "code": "AI_KEY_MISSING", "message": "AIMANAGER_API_KEY is missing or invalid." }` (do not wait 15s).

## Internal HTTP

- `POST /internal/v1/ad-check` — success `{ "success": true, "notes": [{ "message" }] }`
- `POST /internal/v1/assistant` — success `{ "success": true, "summary" }`
- Header `X-Dealer-Internal: ${INTERNAL_TOKEN}`; missing or wrong → **404**
- Failure: **504** `AI_TIMEOUT` / **503** `AI_KEY_MISSING` / **502** `AI_PROVIDER_FAILED`, body `{ "success": false, "code", "message" }`
- Timeout: connect 2s + response 13s, plus adapter 15s `orTimeout`

Do not configure browser CORS on this process. `dealer-core` calls only through Gateway.
