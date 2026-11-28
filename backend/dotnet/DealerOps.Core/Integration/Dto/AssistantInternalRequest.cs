namespace DealerOps.Core.Integration.Dto;

/// <summary>Body of the internal assistant call: the question and the already retrieved resources.</summary>
public record AssistantInternalRequest(string Question, List<ResourceRef> Resources);
