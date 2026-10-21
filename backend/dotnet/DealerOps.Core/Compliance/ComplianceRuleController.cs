using DealerOps.Core.Compliance.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Compliance;

[ApiController]
[Route("api/v1/admin/compliance-rules")]
[Authorize]
/// <summary>Platform-admin endpoints that list and edit ad compliance rule overrides.</summary>
public class ComplianceRuleController : ControllerBase
{
    private readonly ComplianceRuleService _service;

    public ComplianceRuleController(ComplianceRuleService service) => _service = service;

    /// <summary>Lists every rule with its effective settings.</summary>
    [HttpGet]
    public IReadOnlyList<RuleOverrideResponse> List() => _service.List();

    /// <summary>Saves one rule's override; audited as RULE_OVERRIDE.</summary>
    [HttpPut("{ruleId}")]
    public RuleOverrideResponse Update(string ruleId, [FromBody] UpdateRuleOverrideRequest body) =>
        _service.Update(ruleId, body);
}
