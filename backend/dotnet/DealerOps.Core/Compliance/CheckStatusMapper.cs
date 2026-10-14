using DealerOps.Core.Listing;

namespace DealerOps.Core.Compliance;

public class CheckStatusMapper
{
    public const string Blocked = "BLOCKED";
    public const string NeedsAi = "NEEDS_AI";
    public const string Passed = "PASSED";
    public const string Stale = "STALE";
    public const string AiUnavailable = "AI_UNAVAILABLE";

    public string Derive(ListingEntity listing, ComplianceCheckEntity? lastCheck)
    {
        if (lastCheck == null) return NeedsAi;

        if (lastCheck.ContentVersion != listing.ContentVersion)
            return lastCheck.Recommendation == Recommendation.Passed ? Stale : NeedsAi;

        if (lastCheck.Recommendation == Recommendation.Blocked) return Blocked;
        if (lastCheck.Recommendation == Recommendation.Passed) return Passed;
        if (lastCheck.Recommendation == Recommendation.Unavailable) return AiUnavailable;
        return NeedsAi;
    }
}
