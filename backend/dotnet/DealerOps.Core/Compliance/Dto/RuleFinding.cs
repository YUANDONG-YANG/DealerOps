namespace DealerOps.Core.Compliance.Dto;

public record RuleFinding(string RuleId, string Severity, bool Passed, string Message);
