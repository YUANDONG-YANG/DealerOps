using System.Text.Json;
using DealerOps.AiService.Dto;
using DealerOps.AiService.Support;

namespace DealerOps.AiService.Adapter;

public class AssistantAdapter
{
    // The question is user input, so its length is capped before it reaches the model.
    private const int MaxQuestionChars = 1000;

    private readonly AiProviderClient _client;
    private readonly TimedModelCall _timedCall;

    public AssistantAdapter(AiProviderClient client, TimedModelCall timedCall)
    {
        _client = client;
        _timedCall = timedCall;
    }

    public async Task<AssistantOkResponse> RunAsync(AssistantInternalRequest req)
    {
        if (!_client.HasApiKey)
            throw ModelFailureException.KeyMissingError();

        var userJson = JsonSerializer.Serialize(
            req with { Question = Capped(req.Question) }, JsonOptions);

        var content = await _timedCall.RequestAsync(async ct =>
            await _client.ChatAsync(SystemPrompts.Assistant, userJson, ct));

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
