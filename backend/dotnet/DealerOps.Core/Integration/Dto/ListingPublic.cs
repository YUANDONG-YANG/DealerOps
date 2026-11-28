namespace DealerOps.Core.Integration.Dto;

/// <summary>The ad text and kind sent to the AI ad check.</summary>
public record ListingPublic(string? Title, string? Body, string? AdKind, string? Medium);
