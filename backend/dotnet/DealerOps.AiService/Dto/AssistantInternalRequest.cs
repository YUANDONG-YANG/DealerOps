namespace DealerOps.AiService.Dto;

public record AssistantInternalRequest(string Question, List<ResourceIn> Resources);

public record ResourceIn(string Kind, long? Id, string? Label, string? Status);
