using System.Text.Json;
using DealerOps.AiService.Dto;
using DealerOps.AiService.Support;

namespace DealerOps.AiService.Adapter;

public class AssistantAdapter
{
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

        var userJson = JsonSerializer.Serialize(req, JsonOptions);

        var content = await _timedCall.RequestAsync(async ct =>
            await _client.ChatAsync(SystemPrompts.Assistant, userJson, ct));

        if (string.IsNullOrWhiteSpace(content))
            throw ModelFailureException.ProviderFailedError();

        return new AssistantOkResponse(true, content.Trim());
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };
}
