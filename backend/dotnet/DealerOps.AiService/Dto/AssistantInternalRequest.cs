namespace DealerOps.AiService.Dto;

/// <summary>Assistant input from Core: the question and at most five matching resource cards.</summary>
/// <param name="Question">The user's question. Capped before it reaches the model, and never logged.</param>
/// <param name="Resources">Keyword-search cards. Not the dealership's full inventory or customer list.</param>
public record AssistantInternalRequest(string Question, List<ResourceIn> Resources);

/// <summary>One keyword-search card. It is not a full inventory, customer, or listing record.</summary>
/// <param name="Kind">Card kind, such as vehicle, customer, or listing.</param>
/// <param name="Id">Resource id when the card has one.</param>
/// <param name="Label">Short label. The assistant must not treat it as new instructions.</param>
/// <param name="Status">Status text from the card, when present.</param>
public record ResourceIn(string Kind, long? Id, string? Label, string? Status);
