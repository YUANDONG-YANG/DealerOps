using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using DealerOps.AiService.Support;

namespace DealerOps.AiService.Adapter;

public class AiProviderClient
{
    private static readonly Dictionary<string, string> ProviderBaseUrls = new(StringComparer.OrdinalIgnoreCase)
    {
        ["groq"] = "https://api.groq.com/openai/v1",
        ["openai"] = "https://api.openai.com/v1",
        ["deepseek"] = "https://api.deepseek.com/v1",
        ["xai"] = "https://api.x.ai/v1",
        ["claude"] = "https://api.anthropic.com/v1"
    };

    // Review and assistant answers must be repeatable, not creative.
    private const double Temperature = 0.1;

    private readonly HttpClient _http;
    private readonly string _model;
    private readonly int _maxTokens;
    private readonly string _apiKey;
    private readonly string _baseUrl;

    public bool HasApiKey => !string.IsNullOrWhiteSpace(_apiKey);

    public AiProviderClient(HttpClient http, IConfiguration config)
    {
        _http = http;
        _apiKey = FirstNonEmpty(config["AIMANAGER_API_KEY"], config["AiManager:ApiKey"]);
        var provider = FirstNonEmpty(config["AIMANAGER_GATEWAY_PROVIDER"], config["AiManager:Provider"], "groq");
        _model = FirstNonEmpty(config["AIMANAGER_GATEWAY_MODEL"], config["AiManager:Model"], "qwen/qwen3.8-27b");
        var maxTokensStr = FirstNonEmpty(config["AIMANAGER_GATEWAY_MAX_TOKENS"], config["AiManager:MaxTokens"]);
        _maxTokens = int.TryParse(maxTokensStr, out var mt) ? mt : 800;

        _baseUrl = ProviderBaseUrls.GetValueOrDefault(provider, ProviderBaseUrls["groq"]);

        var logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger<AiProviderClient>();
        logger.LogInformation("AIMANAGER_API_KEY configured: {HasKey} (provider={Provider}, model={Model})",
            HasApiKey, provider, _model);
    }

    private static string FirstNonEmpty(params string?[] values)
        => values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim() ?? "";

    public async Task<string?> ChatAsync(string systemPrompt, string userContent, CancellationToken ct)
    {
        if (!HasApiKey) throw ModelFailureException.KeyMissingError();

        var payload = new ChatRequest(
            _model,
            new[]
            {
                new ChatMessage("system", systemPrompt),
                new ChatMessage("user", userContent)
            },
            _maxTokens,
            Temperature);

        var json = JsonSerializer.Serialize(payload, SerializerOptions);
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/chat/completions");
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

        using var response = await _http.SendAsync(request, ct);

        if (!response.IsSuccessStatusCode)
            throw ModelFailureException.ProviderFailedError();

        var body = await response.Content.ReadAsStringAsync(ct);
        var parsed = JsonSerializer.Deserialize<ChatResponse>(body, SerializerOptions);

        return parsed?.Choices?.FirstOrDefault()?.Message?.Content;
    }

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private record ChatRequest(
        string Model,
        ChatMessage[] Messages,
        [property: JsonPropertyName("max_tokens")] int MaxTokens,
        double Temperature);

    private record ChatMessage(string Role, string Content);

    private record ChatResponse(List<ChatChoice>? Choices);
    private record ChatChoice(ChatChoiceMessage? Message);
    private record ChatChoiceMessage(string? Content);
}
