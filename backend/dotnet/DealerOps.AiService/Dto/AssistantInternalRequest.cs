namespace DealerOps.AiService.Dto;

/// <summary>Assistant input from Core: the question and at most five matching resource cards.</summary>
public record AssistantInternalRequest(string Question, List<ResourceIn> Resources);

public record ResourceIn(string Kind, long? Id, string? Label, string? Status);
