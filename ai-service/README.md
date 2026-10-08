# ai-service

Internal AI adapter for Dealer Ops. Port **8082**, no database, not browser-facing. Calls `com.manager.AiManager` in-process. Do **not** scan or start library `com.gateway` / `AIApplication`.

Internal JSON follows `design/AI-PROTOCOL-AND-RULES.md` (not BACKEND T22 `{failed,reason}`).

## GitHub ai-manager

Do not copy this library into DealerOps and do not change its business source. Consume the JAR.

| Item | Value |
|---|---|
| Repo | https://github.com/YUANDONG-YANG/ai-manager (private) |
| Local checkout | sibling directory named `ai-manager` (same parent as this repo) |
| Pinned commit | `827196a` (xAI/Grok provider support) |
| Maven | `com.aimanager:aimanager:1.0.0-SNAPSHOT` |
| Packages | https://maven.pkg.github.com/YUANDONG-YANG/ai-manager |
| Library Java | 17 bytecode / Boot parent 3.2.5 (this service stays Java 21) |
| Public API used | `startConversation(id, systemMessage)`, conversation `request(prompt).send()`, `closeConversation` |

## Local install

Build `ai-manager` with JDK 17, then build this service with JDK 21. The pinned source now includes the xAI/Grok provider used by the local `grok:` key format.

```powershell
git checkout 827196a
JAVA_HOME=/path/to/jdk-17 mvn -DskipTests install
```

Then in `ai-service`:

```powershell
mvn -DskipTests -Dmaven.test.skip=true -Daimanager.real=true package
```

The POM uses the real `com.aimanager:aimanager:1.0.0-SNAPSHOT` dependency directly. There is no stub profile in the local development path, so IntelliJ and Maven compile the same source and cannot silently start a fake AI implementation.

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
- Timeout: connect 2s + response 13s, plus adapter 15s `orTimeout`

Do not configure browser CORS on this process. `dealer-core` calls only through Gateway.
