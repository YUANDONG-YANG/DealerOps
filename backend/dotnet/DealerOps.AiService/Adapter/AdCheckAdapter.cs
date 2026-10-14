using System.Text.Json;
using DealerOps.AiService.Dto;
using DealerOps.AiService.Support;

namespace DealerOps.AiService.Adapter;

public class AdCheckAdapter
{
    private readonly AiProviderClient _client;
    private readonly TimedModelCall _timedCall;

    public AdCheckAdapter(AiProviderClient client, TimedModelCall timedCall)
    {
        _client = client;
        _timedCall = timedCall;
    }

    public async Task<AdCheckOkResponse> RunAsync(AdCheckInternalRequest req)
    {
        if (!_client.HasApiKey)
            throw ModelFailureException.KeyMissingError();

        var userJson = JsonSerializer.Serialize(req, JsonOptions);

        var content = await _timedCall.RequestAsync(async ct =>
            await _client.ChatAsync(SystemPrompts.AdCheck, userJson, ct));

        var notes = NotesFrom(content);
        if (notes.Count == 0)
            throw ModelFailureException.ProviderFailedError();

        return new AdCheckOkResponse(true, notes);
    }

    internal static List<AiNote> NotesFrom(string? content)
    {
        var notes = new List<AiNote>();
        if (string.IsNullOrEmpty(content)) return notes;

        foreach (var line in content.Split('\n'))
        {
            var trimmed = line.Trim();
            if (!string.IsNullOrEmpty(trimmed))
                notes.Add(new AiNote(trimmed));
        }
        return notes;
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };
}
