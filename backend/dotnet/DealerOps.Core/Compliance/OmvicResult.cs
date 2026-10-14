using DealerOps.Core.Compliance.Dto;

namespace DealerOps.Core.Compliance;

public record OmvicResult(List<RuleFinding> Findings, bool HardBlocked);
