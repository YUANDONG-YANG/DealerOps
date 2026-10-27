using System.Text.Json;
using DealerOps.AiService.Dto;
using DealerOps.AiService.Support;

namespace DealerOps.AiService.Adapter;

/// <summary>
/// Read-only dealership assistant: answers a question from the resource cards Core supplies.
/// </summary>
public class AssistantAdapter
{
    // The question is user input, so its length is capped before it reaches the model.
    private const int MaxQuestionChars = 1000;

    private readonly AiProviderClient _client;
    private readonly TimedModelCall _timedCall;

    /// <summary>Creates the assistant adapter.</summary>
    /// <param name="client">Outbound model client.</param>
    /// <param name="timedCall">Applies the time budget and the concurrency cap.</param>
    public AssistantAdapter(AiProviderClient client, TimedModelCall timedCall)
    {
        _client = client;
        _timedCall = timedCall;
    }

    /// <summary>Answers the question in one or two sentences.</summary>
    /// <param name="req">The question and at most five resource cards from Core.</param>
    /// <returns>A successful body whose summary is the trimmed model answer.</returns>
    /// <exception cref="ModelFailureException">The model call failed or returned an empty answer.</exception>
    public async Task<AssistantOkResponse> RunAsync(AssistantInternalRequest req)
    {
        var userJson = JsonSerializer.Serialize(
            req with { Question = Capped(req.Question) }, JsonOptions);

        var content = await _timedCall.RequestAsync(async ct =>
            await _client.ChatAsync("assistant", SystemPrompts.Assistant, userJson, ct));

        if (string.IsNullOrWhiteSpace(content))
            throw ModelFailureException.ProviderFailedError();

        return new AssistantOkResponse(true, content.Trim());
    }

    private static string Capped(string? question)
    {
        var text = (question ?? string.Empty).Trim();
        return text.Length > MaxQuestionChars ? text[..MaxQuestionChars] : text;
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };
}
