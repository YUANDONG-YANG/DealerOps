namespace DealerOps.Core.Compliance;

/// <summary>Outcome of the AI ad check stored on a compliance check.</summary>
public enum AiStatus
{
    /// <summary>A BLOCK finding stopped the check, so the model was not called.</summary>
    Skipped,

    /// <summary>The model returned a usable ad-check result.</summary>
    Success,

    /// <summary>
    /// The model responded, but the result was not a success. This check path stores
    /// <see cref="Unavailable"/> for that result and must not be treated as passed.
    /// </summary>
    Failed,

    /// <summary>
    /// The model timed out, could not be reached, or returned an unusable result.
    /// Must not be treated as passed.
    /// </summary>
    Unavailable
}
