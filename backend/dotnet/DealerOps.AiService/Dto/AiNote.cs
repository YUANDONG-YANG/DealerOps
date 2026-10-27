namespace DealerOps.AiService.Dto;

/// <summary>One advisory AI note; severity is REVIEW or INFO.</summary>
/// <param name="Code">Short note identifier.</param>
/// <param name="Severity">REVIEW or INFO. Notes never block a listing.</param>
/// <param name="Explanation">Why the note was raised.</param>
/// <param name="Message">Human-readable note, capped before it leaves the adapter.</param>
public record AiNote(string? Code, string? Severity, string? Explanation, string Message);
