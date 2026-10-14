using DealerOps.Core.Compliance;

namespace DealerOps.Core.Compliance.Dto;

public record CheckResponse(
    long Id,
    long ListingId,
    int ContentVersion,
    List<RuleFinding> RuleFindings,
    AiStatus AiStatus,
    List<AiNote> AiNotes,
    Recommendation Recommendation,
    string? CheckStatus,
    DateTime CreatedAt);
