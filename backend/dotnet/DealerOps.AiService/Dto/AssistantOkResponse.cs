namespace DealerOps.AiService.Dto;

/// <summary>Successful assistant answer.</summary>
/// <param name="Success">Always true for this body.</param>
/// <param name="Summary">One or two sentences from the model. Not logged.</param>
public record AssistantOkResponse(bool Success, string Summary);
