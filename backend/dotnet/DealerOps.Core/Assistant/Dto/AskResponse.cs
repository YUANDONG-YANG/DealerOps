using DealerOps.Core.Assistant;

namespace DealerOps.Core.Assistant.Dto;

public record AskResponse(
    string? Summary,
    bool SummaryAvailable,
    List<ResourceCard> Cards,
    CountResult? Count = null);
