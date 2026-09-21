# This team's AI library (verified read-only with gh)

Private repo. Do not paste secrets in a public README or treat the library as accepted quality proof.

## Verification

| Item | Value |
|----|-----|
| Repo | https://github.com/YUANDONG-YANG/ai-manager (private) |
| Account | Local `gh`: **YUANDONG-YANG**; read-only; do not change the repo, publish, or hit models during research |
| Commit | `c07e1f2afe5dd692c20f3567ad3a42a90d31a87a` (`main`, about 2026-03-26) |
| Maven | `com.aimanager:aimanager:1.0.0-SNAPSHOT` |
| Java | 17; Spring Boot parent 3.2.5 |
| Publish | GitHub Packages `https://maven.pkg.github.com/YUANDONG-YANG/ai-manager` |
| Plugin | `skip=true`; give downstream a JAR |

## Only these APIs may be used in coding

`com.manager.AiManager`:

- `request(String)`
- `startConversation(id, systemMessage)`
- `closeConversation`

Vendors: groq / openai / claude / deepseek. There is **no** `provider=mock`.

Adapter contract (same as `design/09-AI-Agent-Integration.md`):

1. Ad check: put the OMVIC/course checklist in `startConversation` system, listing JSON in user; `closeConversation` in `finally`. Check `AIResponse.isSuccess()` first, then parse content.
2. In-store assistant: start a short conversation and send only already-filtered dealership resources.
3. In-process call. **Do not start a separate container for this library.** Key: `AIMANAGER_API_KEY` (env / Key Vault), `ai-service` only.

## Do not expose `com.gateway`

The library also has `com.gateway`: `/api/ai/request`, `/chat`, `/credentials`, `/runtime`.  
That is **ai-manager's own gateway demo**. It is **not** this course's `dealer-gateway`.

- Do not scan or start `AIApplication`
- Do not expose those endpoints to the browser or the public internet
- Do not proxy them from `dealer-gateway` to `com.gateway`

## Quality and timeouts

- No usable `src/test` was found. The README says tests are unmaintained. Citing this library is not Sprint acceptance.
- The OpenAI path `WebClient...blockOptional()` has **no ready-made 15-second guarantee**. `ai-service` must set its own connect/response timeouts.
- Keep the rate-limit queue off by default so it does not stack with the course timeout.
- SNAPSHOT is a poor release number. At implementation time, **cut an immutable version** from the commit above and give it to `ai-service`.
- In Sprint 2, send one real request to this library. CI uses a stub and does not hit paid endpoints.

Full design: `design/09-AI-Agent-Integration.md`.
