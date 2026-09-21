# AI：已从 GitHub 取到的组件

版本 v6.1 · 2026-09-21

已用本机 `gh` 账号 **YUANDONG-YANG** 只读拉取私有库，不修改、不发布、不调用模型。

- 仓库：https://github.com/YUANDONG-YANG/ai-manager（private）
- 分支 `main`，commit `c07e1f2afe5dd692c20f3567ad3a42a90d31a87a`（2026-03-26）
- Maven：`com.aimanager:aimanager:1.0.0-SNAPSHOT`
- Java 17，Spring Boot parent 3.2.5；plugin `skip=true`，按库 JAR 给下游用
- 发布目标：GitHub Packages `https://maven.pkg.github.com/YUANDONG-YANG/ai-manager`

## 库里有什么

`com.manager.AiManager`：`request(String)`、`startConversation(id, systemMessage)`、`closeConversation`。  
厂商：groq / openai / claude / deepseek。没有 `provider=mock`。  
另有 `com.gateway` 的 `/api/ai/request`、`/chat`、`/credentials`、`/runtime`。**本课不部署、不暴露这些接口。** 那套 Gateway 不是 Dealer Ops 的 `dealer-gateway`。

未见 `src/test`。README 写测试未维护。不能把该库本身当成已经验收过的质量证明。

## 本课怎么用（保持简单）

`ai-service` 依赖这个 JAR，进程内调用，不给组件单独容器。

适配器只包两件事：

1. 广告检查：`startConversation` 用 system 放 OMVIC 清单，user 放广告 JSON；`finally` 里 `closeConversation`。先看 `AIResponse.isSuccess()`，再解析 content。
2. 店内助手：同样新建短会话，只收已过滤的本店资源。

不要扫描 `com.gateway`，不要启动 `AIApplication`。Key 用环境变量/`Key Vault` 的 `AIMANAGER_API_KEY`，只给 ai-service。

超时：源码 OpenAI 路径是 `WebClient...blockOptional()`，**没有现成的 15 秒保证**。适配器必须自己设 connect/response 超时。限流队列默认关掉，避免和课程超时叠在一起。

Sprint 2 必须对该库发一次真实请求。CI 用 stub，不打付费端点。SNAPSHOT 不适合当发布号，实施时从上述 commit 打一个不可改版本再给 ai-service 引用。
