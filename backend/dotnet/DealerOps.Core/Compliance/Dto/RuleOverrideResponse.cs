namespace DealerOps.Core.Compliance.Dto;

public record RuleOverrideResponse(string RuleId, bool Enabled, string Severity, string Message, string UpdatedBy, DateTime? UpdatedAt);

public record UpdateRuleOverrideRequest(bool Enabled, string? Severity, string? Message);
