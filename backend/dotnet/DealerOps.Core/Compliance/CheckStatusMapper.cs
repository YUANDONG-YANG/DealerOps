using DealerOps.Core.Listing;

namespace DealerOps.Core.Compliance;

/// <summary>Derives the listing-facing check status from the latest check and the current content version.</summary>
public class CheckStatusMapper
{
    /// <summary>Current content has a BLOCK finding. The model was not called.</summary>
    public const string Blocked = "BLOCKED";

    /// <summary>No current pass: no check, a non-pass verdict, or a block or failure on an older content version.</summary>
    public const string NeedsAi = "NEEDS_AI";

    /// <summary>The latest check passed and matches the listing content version.</summary>
    public const string Passed = "PASSED";

    /// <summary>A previous pass no longer matches the listing content version.</summary>
    public const string Stale = "STALE";

    /// <summary>Rules passed, but the model failed or timed out on this content version. Must not be treated as passed.</summary>
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
