using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using DealerOps.Core.Compliance.Dto;
using DealerOps.Core.Integration.Dto;

namespace DealerOps.Core.Integration;

/// <summary>
/// Calls the internal AI service routes with the internal token header (set on the typed client)
/// and the caller's X-Request-ID. A failed call is logged as WARN with route, HTTP status and
/// duration only: never the prompt, ad text or token.
/// </summary>
public class AiGatewayClient : IAiGatewayClient
{
    private readonly HttpClient _httpClient;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<AiGatewayClient> _logger;
    private readonly int _timeoutMs;

    public AiGatewayClient(HttpClient httpClient, IHttpContextAccessor httpContextAccessor, IConfiguration config,
        ILogger<AiGatewayClient> logger)
    {
        _httpClient = httpClient;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
        // Past the provider's 15s budget so the failure response can be persisted (AI-02).
        _timeoutMs = config.GetValue("AiService:ResponseTimeoutMs", 16000);
    }

    /// <inheritdoc />
    public async Task<List<AiNote>> AdCheckAsync(AdCheckInternalRequest body)
    {
        var node = await PostAsync("/internal/v1/ad-check", body);
        var notes = new List<AiNote>();
        if (node.TryGetProperty("notes", out var arr) && arr.ValueKind == JsonValueKind.Array)
        {
            foreach (var n in arr.EnumerateArray())
            {
                if (n.ValueKind != JsonValueKind.Object) continue;
                var message = NoteText(n, "message");
                if (string.IsNullOrWhiteSpace(message)) continue;
                notes.Add(new AiNote(
                    NoteText(n, "code") ?? "NOTE",
                    AiNoteSeverity.Normalize(NoteText(n, "severity")),
                    NoteText(n, "explanation") ?? message,
                    message));
            }
        }
        return notes;
    }

    /// <inheritdoc />
    public async Task<string> AssistantAsync(AssistantInternalRequest body)
    {
        const string path = "/internal/v1/assistant";
        var node = await PostAsync(path, body);
        if (!node.TryGetProperty("summary", out var sum) || sum.ValueKind != JsonValueKind.String ||
            string.IsNullOrWhiteSpace(sum.GetString()))
        {
            _logger.LogWarning("AI call returned no summary path={Path}", path);
            throw new AiCallFailed("AI assistant failed.");
        }

        return sum.GetString()!;
    }

    private static string? NoteText(JsonElement node, string name) =>
        node.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    /// <summary>Posts to an internal AI route and returns the body when it reports success.</summary>
    private async Task<JsonElement> PostAsync(string path, object body)
    {
        var sw = Stopwatch.StartNew();
        int? status = null;
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(_timeoutMs));
            using var request = new HttpRequestMessage(HttpMethod.Post, path);

            var requestId = _httpContextAccessor.HttpContext?.Items["RequestId"] as string;
            if (!string.IsNullOrWhiteSpace(requestId))
                request.Headers.TryAddWithoutValidation("X-Request-ID", requestId);

            request.Content = JsonContent.Create(body);
            var response = await _httpClient.SendAsync(request, cts.Token);
            status = (int)response.StatusCode;
            response.EnsureSuccessStatusCode();

            var doc = await JsonDocument.ParseAsync(
                await response.Content.ReadAsStreamAsync(cts.Token), cancellationToken: cts.Token);
            var node = doc.RootElement;
            if (node.ValueKind == JsonValueKind.Object && node.TryGetProperty("success", out var s)
                && s.ValueKind == JsonValueKind.True)
                return node;

            _logger.LogWarning("AI call reported failure path={Path} status={Status} elapsedMs={ElapsedMs}",
                path, status, sw.ElapsedMilliseconds);
            throw new AiCallFailed("AI call failed.");
        }
        catch (Exception ex) when (ex is not AiCallFailed)
        {
            _logger.LogWarning("AI call failed path={Path} status={Status} error={Error} elapsedMs={ElapsedMs}",
                path, status, ex.GetType().Name, sw.ElapsedMilliseconds);
            throw new AiCallFailed("AI call failed.", ex);
        }
    }
}
