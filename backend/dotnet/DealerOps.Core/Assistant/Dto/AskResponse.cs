using DealerOps.Core.Assistant;

namespace DealerOps.Core.Assistant.Dto;

/// <summary>The assistant's answer.</summary>
/// <param name="Summary">AI or count summary; null when the AI service failed.</param>
/// <param name="SummaryAvailable">False when the AI service failed and only the cards are returned.</param>
/// <param name="Cards">At most five matching records.</param>
/// <param name="Count">The exact count when the question asked how many.</param>
public record AskResponse(
    string? Summary,
    bool SummaryAvailable,
    List<ResourceCard> Cards,
    CountResult? Count = null);
