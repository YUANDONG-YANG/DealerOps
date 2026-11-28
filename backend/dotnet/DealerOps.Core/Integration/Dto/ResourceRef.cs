namespace DealerOps.Core.Integration.Dto;

/// <summary>A retrieved record as the AI assistant sees it: kind, id, label and status only.</summary>
public record ResourceRef(string Kind, long? Id, string? Label, string? Status);
