using System.Net.Http.Json;
using System.Text.Json;
using DealerOps.Core.Compliance.Dto;
using DealerOps.Core.Integration.Dto;

namespace DealerOps.Core.Integration;

public class AiGatewayClient : IAiGatewayClient
{
    private readonly HttpClient _httpClient;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly int _timeoutMs;

    public AiGatewayClient(HttpClient httpClient, IHttpContextAccessor httpContextAccessor, IConfiguration config)
    {
        _httpClient = httpClient;
        _httpContextAccessor = httpContextAccessor;
        _timeoutMs = config.GetValue("AiService:ResponseTimeoutMs", 13000);
    }

    public async Task<List<AiNote>> AdCheckAsync(AdCheckInternalRequest body)
    {
        var node = await PostAsync("/internal/v1/ad-check", body);
        if (node == null || !node.Value.TryGetProperty("success", out var s) || s.ValueKind != JsonValueKind.True)
            throw new AiCallFailed("AI check failed.");

        var notes = new List<AiNote>();
        if (node.Value.TryGetProperty("notes", out var arr) && arr.ValueKind == JsonValueKind.Array)
        {
            foreach (var n in arr.EnumerateArray())
            {
                if (n.ValueKind == JsonValueKind.Object && n.TryGetProperty("message", out var msg) &&
                    msg.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(msg.GetString()))
                    notes.Add(new AiNote(msg.GetString()!));
            }
        }
        return notes;
    }

    public async Task<string> AssistantAsync(AssistantInternalRequest body)
    {
        var node = await PostAsync("/internal/v1/assistant", body);
        if (node == null || !node.Value.TryGetProperty("success", out var s) || s.ValueKind != JsonValueKind.True)
            throw new AiCallFailed("AI assistant failed.");

        if (!node.Value.TryGetProperty("summary", out var sum) || sum.ValueKind != JsonValueKind.String ||
            string.IsNullOrWhiteSpace(sum.GetString()))
            throw new AiCallFailed("AI assistant failed.");

        return sum.GetString()!;
    }

    private async Task<JsonElement?> PostAsync(string path, object body)
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(_timeoutMs));
            using var request = new HttpRequestMessage(HttpMethod.Post, path);

            var requestId = _httpContextAccessor.HttpContext?.Items["RequestId"] as string;
            if (!string.IsNullOrWhiteSpace(requestId))
                request.Headers.TryAddWithoutValidation("X-Request-ID", requestId);

            request.Content = JsonContent.Create(body);
            var response = await _httpClient.SendAsync(request, cts.Token);
            response.EnsureSuccessStatusCode();

            var doc = await JsonDocument.ParseAsync(
                await response.Content.ReadAsStreamAsync(cts.Token), cancellationToken: cts.Token);
            return doc.RootElement;
        }
        catch (Exception ex) when (ex is not AiCallFailed)
        {
            throw new AiCallFailed("AI call failed.", ex);
        }
    }
}
