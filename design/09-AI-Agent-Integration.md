# AI: component already retrieved from GitHub

Version v6.1 · 2026-09-21

The local `gh` account **YUANDONG-YANG** was used to pull the private repository read-only. No changes, no publish, no model calls.

- Repository: https://github.com/YUANDONG-YANG/ai-manager (private)
- Branch `main`, commit `c07e1f2afe5dd692c20f3567ad3a42a90d31a87a` (2026-03-26)
- Maven: `com.aimanager:aimanager:1.0.0-SNAPSHOT`
- Java 17, Spring Boot parent 3.2.5; plugin `skip=true`; consumed downstream as a library JAR
- Publish target: GitHub Packages `https://maven.pkg.github.com/YUANDONG-YANG/ai-manager`

## What is in the library

`com.manager.AiManager`: `request(String)`, `startConversation(id, systemMessage)`, `closeConversation`.  
Vendors: groq / openai / claude / deepseek. There is no `provider=mock`.  
There is also `com.gateway` with `/api/ai/request`, `/chat`, `/credentials`, `/runtime`. **This course does not deploy or expose those endpoints.** That Gateway is not Dealer Ops `dealer-gateway`.

No `src/test` was found. The README says tests are not maintained. The library itself cannot be treated as already-accepted quality evidence.

## How this course uses it (keep it simple)

`ai-service` depends on this JAR and calls it in-process. The component does not get its own container.

The adapter wraps only two jobs:

1. Advertisement check: `startConversation` puts the OMVIC checklist in system and the advertisement JSON in user; `closeConversation` in `finally`. Check `AIResponse.isSuccess()` first, then parse content.
2. In-store assistant: likewise start a short conversation and accept only already-filtered resources for this dealership.

Do not scan `com.gateway`. Do not start `AIApplication`. The key is environment variable / `Key Vault` `AIMANAGER_API_KEY`, given only to ai-service.

Timeout: the source OpenAI path is `WebClient...blockOptional()` and **has no ready-made 15-second guarantee**. The adapter must set its own connect/response timeouts. Leave the rate-limit queue off by default so it does not stack with the course timeout.

Sprint 2 must send one real request to this library. CI uses a stub and does not hit paid endpoints. SNAPSHOT is not a suitable release number; at implementation, cut an immutable version from the commit above and have ai-service depend on that.
