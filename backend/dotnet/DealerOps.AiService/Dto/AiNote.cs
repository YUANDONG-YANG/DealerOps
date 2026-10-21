namespace DealerOps.AiService.Dto;

/// <summary>One advisory AI note; severity is REVIEW or INFO.</summary>
public record AiNote(string? Code, string? Severity, string? Explanation, string Message);
