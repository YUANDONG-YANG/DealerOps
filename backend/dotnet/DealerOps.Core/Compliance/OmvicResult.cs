using DealerOps.Core.Compliance.Dto;

namespace DealerOps.Core.Compliance;

/// <summary>The OMVIC rule findings for one listing, BLOCK findings first.</summary>
public record OmvicResult(List<RuleFinding> Findings);
