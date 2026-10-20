using DealerOps.Core.Compliance.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Compliance;

[ApiController]
[Route("api/v1/admin/compliance-rules")]
[Authorize]
public class ComplianceRuleController : ControllerBase
{
    private readonly ComplianceRuleService _service;

    public ComplianceRuleController(ComplianceRuleService service) => _service = service;

    [HttpGet]
    public IReadOnlyList<RuleOverrideResponse> List() => _service.List();

    [HttpPut("{ruleId}")]
    public RuleOverrideResponse Update(string ruleId, [FromBody] UpdateRuleOverrideRequest body) =>
        _service.Update(ruleId, body);
}
