namespace DealerOps.Core.Assistant.Dto;

public record AskResponse(string? Summary, bool SummaryAvailable, List<ResourceCard> Cards);
