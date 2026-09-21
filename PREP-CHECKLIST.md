# 编码前缺口（只有你能提供）

标了「缺」的不能开始对应模块。没有密码请发到对话里，配好环境变量即可。

## 必须先有（卡住开工）

| 项 | 现状 | 你要做什么 |
|---|---|---|
| JDK 17 或 21 | **缺**。本机是 JDK 11，Spring Boot 3 编不过 | 安装 Temurin 17 或 21，并让 `JAVA_HOME` 指向它 |
| Docker Desktop | **缺** | 安装后才能本地起 MySQL，以及后面打容器 |
| 组员 A/B/C 姓名 | **缺** | 三人名字和谁做 web / AI / core |
| Azure 订阅 | **缺** | 学生/学校订阅，能建 Container Apps、MySQL、ACR、Key Vault |
| Entra 权限 | **缺** | 能建 App Registration，加 `Platform.Admin`、`Dealer.User`，能绑用户 |
| 模型 Key | **缺** | ai-manager 要 `AIMANAGER_API_KEY`（groq/openai/claude/deepseek 其一）。课程演示首选能稳定调用的真实 Key |
| ai-manager 包 | **未发布固定版** | 从 commit `c07e1f2` 打不可改版本到 GitHub Packages，或允许本机 `mvn install` |

## Sprint 1 前最好有

| 项 | 说明 |
|---|---|
| 两个演示用 Entra 账号 + 一个管理员账号 | 用来演示两家店隔离 |
| 本机或 Azure 回调 URL | 先用 `http://localhost:5173` |
| Azure DevOps 或 GitHub Actions | 课程要独立 CI/CD；你定用哪边 |
| 预算上限 | MySQL + Container Apps 会一直产生费用 |

## 已具备

- 业务规格 PDF、课程硬要求 PPT、最简设计文档
- GitHub 账号 `YUANDONG-YANG` 与私有库 `ai-manager`
- Node 20 / npm、Maven 3.6、Git
- 本目录五个空仓库骨架、建表 SQL、API 清单、`.env.example`

## 不要提供到聊天里的东西

订阅密码、Entra client secret（SPA 本来就不该有）、模型 Key 正文。配进本机环境变量或 Key Vault 即可。
