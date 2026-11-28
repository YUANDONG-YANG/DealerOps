namespace DealerOps.Core.Compliance;

/// <summary>Stored verdict of one compliance check run.</summary>
public enum Recommendation
{
    /// <summary>A BLOCK finding stopped the check. The model was not called.</summary>
    Blocked,

    /// <summary>No current passing check: none stored, or an older block or failure no longer matches the content.</summary>
    NeedsAi,

    /// <summary>Rules passed and the model returned a usable result for this content version.</summary>
    Passed,

    /// <summary>Rules passed, but the model failed or timed out. Must not be treated as passed.</summary>
    Unavailable
}
