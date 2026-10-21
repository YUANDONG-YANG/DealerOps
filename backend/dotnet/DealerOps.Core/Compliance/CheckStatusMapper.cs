using DealerOps.Core.Listing;

namespace DealerOps.Core.Compliance;

/// <summary>Derives the listing-facing check status from the latest check and the current content version.</summary>
public class CheckStatusMapper
{
    public const string Blocked = "BLOCKED";
    public const string NeedsAi = "NEEDS_AI";
    public const string Passed = "PASSED";
    public const string Stale = "STALE";
    public const string AiUnavailable = "AI_UNAVAILABLE";

    /// <summary>Returns the check status; a check of older content is STALE when it had passed, otherwise NEEDS_AI.</summary>
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
