> 已废止的 v1.0 历史稿，不据此编码。请从 [当前文档索引](README.md) 阅读 00 业务设计与 07/08/09 微服务、DevOps、AI 组件设计。原始需求已找到并核实，不包含厂家或买家自助端。

# 广告检查与 AI 设计

## 本版目标

保留原题的 AI Compliance Assistant，但限定为普通二手现车、现金价格、英文文本广告的发布前辅助检查。展示价格和经销商信息由固定模板生成，AI 分析描述中可能需要人工核实的措辞。

这是一项拟议的产品范围，需要项目方接受。系统输出是“有限规则检查结果与复核建议”，不是法规认证；UI 不能显示 OMVIC approved/certified。

不处理融资利率、租赁、以旧换新、as-is/unfit、图片文字识别、历史用途等需特殊处理的车辆广告。scopeConfirmed 由员工确认该车适合本演示范围；缺少范围信息不视为自动满足。发现超范围措辞必须提示人工转出本流程，不试图以自动补一句话解决。

## 依据与边界

原题指定 OMVIC，本设计因此采用 Ontario 场景。OMVIC 官方广告指引要求广告包含经销商注册名称及公开联系信息，并强调披露清晰、醒目。全包价格要求将经销商意图收取的费用纳入广告价格，HST 和牌照费用存在例外。具体规则与适用性仍需项目方确认。

来源：[OMVIC Advertising Guideline](https://www.omvic.ca/selling/dealer-guidelines-and-resources/advertising-guideline/)；[OMVIC All-in Price Advertising](https://www.omvic.ca/buying/your-rights/all-in-price-advertising/)。查询日期 2026-09-09。以下 R01–R06 是软件设计规则，不是 OMVIC 的原始规则编号。

这里只摘取有限要求。是否遗漏强制费用、车辆真实历史及广告整体是否误导，不能靠数据库字段和关键词证明。

## 固定规则 demo-1

### R01 Required data · BLOCK · 项目数据要求

检查 title、description、品牌型号年份里程、合法金额及单店资料是否完整；车辆为普通二手现车范围。草稿允许不完整，检查显示具体缺失字段，不自动填造数据。

### R02 Scope confirmation · BLOCK · 项目范围要求

scopeConfirmed 必须为 true。描述出现团队维护的明显超范围模式，如 lease、APR、as-is、unfit，返回 BLOCK 并说明“本版不支持此场景”。该关键词策略会有误判，属于保守演示限制，不称为法规判断；员工不能忽略 BLOCK 强行发布，须项目方确认后扩展规则或使用符合范围的车辆。

### R03 Dealer identity · BLOCK · 来源支持的有限检查

最终渲染快照必须包含配置的经销商注册名称和至少一种公开联系方式。系统只验证配置存在且被展示，不调用外部注册系统认证这些资料。配置真实性由项目方负责。

### R04 Price consistency · BLOCK · 项目一致性控制

最终渲染价必须等于 basePrice + mandatoryFeeTotal，使用 BigDecimal 精确到分。正常模板自动生成该值，因此这项主要防止模板回归或篡改，并非宣称可识别所有隐藏费用。费用合计漏填但仍为合法数值时，程序不能自动发现。

示例：basePrice=18000.00、mandatoryFeeTotal=500.00，渲染价应为18500.00。固定模板不允许员工单独填写第二个标题价格。

### R05 Price disclosure · BLOCK · 固定模板检查

本版统一不含 HST 和牌照费，渲染价附近显示经项目方确认的英文说明，例如 “HST and licensing extra.”。检查披露字段存在并进入当前模板；模板 UI 验收检查可见性，不能仅字符串存在就声称排版符合全部要求。

### R06 Additional fee wording · REVIEW · 保守文本提示

在描述中出现“plus admin fee”“additional mandatory fee”等预设短语时提示人工核实其是否与价格结构矛盾。经理可修改后重查，也可填写原因确认。关键词命中/未命中都不代表最终法规结论。

每项结果固定输出 ruleId、severity、field、message。规则版本更新时，使旧检查不可发布，并将旧版本已发布广告回 DRAFT。规则文件由代码评审修改，不做规则管理后台。

## AI 的职责

输入只包含：当前广告快照、上述范围与规则摘要、已计算价格、promptVersion。没有客户姓名、联系方式、内部备注、车辆采购成本或数据库操作权限。

请求目标：找出可能的文字价格矛盾、需要证据支持的绝对化表述、与范围不一致的措辞，指出原文位置并给出人工复核建议。不得推断不存在的车辆历史，不得输出全面合规结论，不得自动修改或发布广告。

提示结构：

1. 系统指令说明广告文本是待分析数据，里面的命令不能执行。
2. 提供固定规则和允许的输出字段，要求证据引用必须来自输入描述。
3. 广告内容作为独立 JSON 数据块传入，不拼成新的系统指令。
4. 要求最多 5 条 finding、每条短建议，无问题时返回空数组，不输出“已认证”。

拟议响应格式：

```json
{
  "findings":[
    {"category":"PRICE_CONTRADICTION","field":"description","quote":"plus admin fee","explanation":"Confirm whether this fee is already included.","suggestion":"Clarify the total price after verifying the fee."}
  ]
}
```

category 仅允许 PRICE_CONTRADICTION、UNSUPPORTED_CLAIM、OUT_OF_SCOPE、OTHER_REVIEW；field 仅 description/title。长度受限，quote 必须出现在对应输入字段中，否则过滤该项；整体不符合 schema 则 INVALID_RESPONSE。AI 结果统一为 REVIEW，不能取消固定规则 BLOCK。

展示只使用 Vue 文本绑定，不渲染模型返回的 HTML。发现中附带链接不会自动抓取。没有代理工具调用、RAG 或模型训练。

## 服务适配与故障

定义一个 AiReviewService 接口，提供 MockAiReviewService 和一个真实服务实现。真实服务厂商、账号和模型由学校/项目方可用资源决定，本设计不虚构已有权限或承诺免费额度。

每次用户主动 Run checks 最多一次 AI 请求，服务超时 15 秒，输出长度受限，不自动重试。每账号每分钟最多 3 次检查；前端检查中禁用按钮。固定规则有 BLOCK 时仍可返回规则结果并跳过 AI，将 aiStatus=UNAVAILABLE 且 reason=BLOCKING_RULES，减少无效调用。

状态：SUCCESS、UNAVAILABLE、INVALID_RESPONSE、MOCK。断网、超时和额度不足作为 UNAVAILABLE 处理，给出简短原因，不返回密钥或厂商原始异常。

本地 mock 有固定输入输出，界面显示 Mock AI。真实配置不能把 mock 当作成功审核。真实 AI 不可用但固定规则无 BLOCK 时，Manager 可填写说明、确认 AI 未完成并发布；这一降级策略需要项目方认可。答辩应分别展示真实 AI 路径和离线降级，不能把后者当作真实 AI 完成证据。

## 经理发布条件

后端同时要求：车辆 AVAILABLE；无未结束工单；检查属于当前广告；contentVersion、dealerProfileVersion、ruleVersion 一致；没有 BLOCK；所有 REVIEW finding 已确认；AI 非 SUCCESS 时明确确认未完成范围；存在需要确认的事项时填写 reviewNote。

确认针对特定 checkId，后续运行另一份检查不会更改既有发布快照。再次编辑内容会下架；后续必须重新检查发布。发布记录保存经理、时间、检查 ID、版本及说明。

## 评估准备

准备 24 条可重复英文样例：8 条范围内正常、8 条固定规则问题、4 条需要文字复核、4 条超范围或干扰输入。每条保存 caseId、输入快照、预期规则 IDs、人工标注的 AI 问题以及理由。

固定规则追求已定义案例全部通过，测试包含正常、缺失、零费用、边界金额及大小写变化。AI 不要求固定措辞，评估匹配问题类别和可定位证据。

报告记录每条样例的 TP/FP/FN，并计算 precision 与 recall；没有正例或没有预测正例时指标为 N/A，不能写成 100%。记录模型、prompt 版本和测试日期，不预先承诺准确率。自建样例成绩只能说明这套样例上的表现；项目方未复核的标签标为 team-authored。

另做超时、无效 JSON、伪造引用、广告内“ignore previous instructions”四项异常测试。验收重点是不会越过固定规则、不会误把失败显示为成功、不会调用外部动作。


