# OMVIC 合规参考（无代码可抄）

## 调研结论

- GitHub / 公开课设里 **没有**「现成的 OMVIC 刊登检查器」可 fork。
- **规则看官网**，由本课自写固定规则 + AI 复核（见设计 `00` / `09`，历史稿 `05` 不作为编码范围）。
- **Pierre** 是 OMVIC 面向公众的**聊天机器人**，用来问答购车/经销商常识，**不是**广告清单引擎，不要接进本课、不要当合规 API。

系统输出只能是「规则命中 + 人工复核建议」，**不能**在 UI 写 OMVIC approved / certified。

## 必须打开的官网

- [OMVIC Advertising Guideline](https://www.omvic.ca/selling/dealer-guidelines-and-resources/advertising-guideline/)
- 价格披露相关：[All-in Price Advertising](https://www.omvic.ca/buying/your-rights/all-in-price-advertising/)

查询日期以设计文档为准（约 2026-09-09）。官网修订后以官网为准，更新规则版本并使旧检查 stale。

## 对编码的含义

| 可做 | 不可做 |
|------|--------|
| 读指引后实现**本课自己的**固定规则与文案模板 | 抄别人的「合规评分」或宣称合法认证 |
| 清单随广告类型变化；总状态仅 Blocked / Needs AI review / Passed / Stale / AI unavailable | 把 Pierre、外部注册查询、OCR、融资租赁检查当范围 |
| AI 失败不得显示 Pass；仅 Passed 且非 Stale 才能 Export TXT | 在仓库里寻找 OMVIC SDK / 检查器依赖 |

规则细节、字段、状态机以 `DealerOS-Design` 有效文档为准，本文件只锁定：**无第三方检查代码可复用**。
