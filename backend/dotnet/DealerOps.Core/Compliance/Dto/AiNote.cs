namespace DealerOps.Core.Compliance.Dto;

public record AiNote(string? Code, string? Severity, string? Explanation, string Message);

public static class AiNoteSeverity
{
    // AI notes are advisory and never block (AD-08): only REVIEW or INFO is kept, anything
    // else (including a model-supplied BLOCK or a note stored before this rule) reads as REVIEW.
    public static string Normalize(string? severity) =>
        string.Equals(severity, "INFO", StringComparison.OrdinalIgnoreCase) ? "INFO" : "REVIEW";
}
