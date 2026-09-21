# 追踪与 Scrum（课程要留痕，过程从简）

版本 v6.0 · 2026-09-21

业务：[DealerOps-Specification.pdf](DealerOps-Specification.pdf)  
硬要求：[Non-Negotiable-Project-Requirements.pptx](Non-Negotiable-Project-Requirements.pptx)

改范围必须客户/instructor 书面同意。不做的东西：自研模型 SDK、队列、第二库、工单、线索、买家站。助手复用 GitHub 现成库。

| ID | 要演示什么 | 来源 | 谁 | 哪次 Review |
|---|---|---|---|---|
| NN-01 | 四仓库四流水线，能单发 ai-service | PPT 1 | B/C | S1 |
| NN-02 | 请求都走 Gateway，直连失败 | PPT 1 | C | S1 |
| NN-03 | 讲清 07 那张图 | PPT 1 | 全员 | S1 |
| NN-04–07 | Azure 上跑；Docker；Bicep；自动发布 | PPT 2 | B | S2 |
| NN-08–11 | Entra + JWT；Admin/店隔离；无明文密钥；HTTPS | PPT 3 | C | S2 |
| NN-12 | 开两家店、绑人 | 规格 | C | S3 |
| NN-13 | DMS 字段与出售 | 规格 | A | S3 |
| NN-14 | CRM 四字段 + 挂车 | 规格 | C | S3 |
| NN-15/18 | 清单 + GitHub 组件真实调用 | 规格 + PPT 5 | B | S2+ |
| NN-17 | 店内助手页，同一组件 | GitHub 组件 | A/B | S3 |
| NN-16 | 改车/客有审计 | 规格 | C | S3 |
| NN-19/20 | 关键测试 + 客户走通签字 | PPT 4 | 全员 | S3 |
| NN-21–24 | 看板、课后 1–2 段、Review 人人开口、双周客户纪要 | PPT 6 | 轮值 | 全程 |

## 课上怎么做（不要加重流程）

- 一个看板：To do / Doing / Done，卡片写上表 ID。
- 每次 3 小时课：开头 10 分钟同步，下课每人一段进度。
- 三次 Review 每人必须讲自己的运行证据，不许一人包讲。
- 客户会两周一次，纪要只记决定和谁做什么。
