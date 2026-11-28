namespace DealerOps.AiService.Dto;

/// <summary>Failure body returned for every AI error.</summary>
/// <param name="Success">Always false for this body.</param>
/// <param name="Code">Stable error code such as AI_TIMEOUT.</param>
/// <param name="Message">Short message safe to return to Core. No prompts or secrets.</param>
public record AiFailureBody(bool Success, string Code, string Message)
{
    /// <summary>Builds the failure body Core expects, with <c>success</c> false.</summary>
    /// <param name="code">Stable error code.</param>
    /// <param name="message">Short message safe to return to Core. No prompts or secrets.</param>
    /// <returns>The failure body.</returns>
    public static AiFailureBody Of(string code, string message) => new(false, code, message);
}
