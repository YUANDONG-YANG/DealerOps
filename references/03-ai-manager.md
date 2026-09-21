# 本团队 AI 库（已用 gh 只读核实）

私有库，不要在公开 README 贴密钥或把库当已验收质量证明。

## 核实结果

| 项 | 值 |
|----|-----|
| 仓库 | https://github.com/YUANDONG-YANG/ai-manager （private） |
| 账号 | 本机 `gh`：**YUANDONG-YANG**；只读，不改库、不发布、不在调研阶段打模型 |
| 提交 | `c07e1f2afe5dd692c20f3567ad3a42a90d31a87a`（`main`，约 2026-03-26） |
| Maven | `com.aimanager:aimanager:1.0.0-SNAPSHOT` |
| Java | 17；Spring Boot parent 3.2.5 |
| 发布 | GitHub Packages `https://maven.pkg.github.com/YUANDONG-YANG/ai-manager` |
| 插件 | `skip=true`，按 JAR 给下游用 |

## 编码只准用的 API

`com.manager.AiManager`：

- `request(String)`
- `startConversation(id, systemMessage)`
- `closeConversation`

厂商：groq / openai / claude / deepseek。**没有** `provider=mock`。

适配器约定（与 `09-AI-Agent-Integration.md` 一致）：

1. 广告检查：`startConversation` 的 system 放 OMVIC/本课清单，user 放广告 JSON；`finally` 里 `closeConversation`。先 `AIResponse.isSuccess()`，再解析 content。
2. 店内助手：新建短会话，只收已过滤的本店资源。
3. 进程内调用，**不为该库单独起容器**。Key：`AIMANAGER_API_KEY`（环境变量 / Key Vault），只给 `ai-service`。

## 不要暴露 `com.gateway`

库内另有 `com.gateway`：`/api/ai/request`、`/chat`、`/credentials`、`/runtime`。  
那是 **ai-manager 自带的网关演示**，**不是**本课 `dealer-gateway`。

- 不要扫描、不要启动 `AIApplication`
- 不要把这些接口暴露到浏览器或公网
- 不要在 `dealer-gateway` 里转发到 `com.gateway`

## 质量与超时

- 未见可用 `src/test`；README 写测试未维护。不能把「引用了此库」当成 Sprint 验收。
- OpenAI 路径 `WebClient...blockOptional()` **没有现成 15 秒保证**。`ai-service` 必须自设 connect/response 超时。
- 限流队列默认关掉，避免和课程超时叠在一起。
- SNAPSHOT 不宜当发布号：实施时从上述 commit **打不可改版本**再给 `ai-service`。
- Sprint 2 对该库发一次真实请求；CI 用 stub，不打付费端点。

完整设计见：`DealerOS-Design/09-AI-Agent-Integration.md`。
