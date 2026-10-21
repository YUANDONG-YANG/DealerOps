using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using DealerOps.AiService.Support;

namespace DealerOps.AiService.Adapter;

/// <summary>
/// Sends one chat-completion request to the configured OpenAI-compatible provider.
/// Logs one INFO line per call (operation, model, duration, outcome) and a WARN when the provider
/// fails. Prompts, ad text, answers and the API key are never logged.
/// </summary>
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
    private readonly ILogger<AiProviderClient> _logger;

    private bool HasApiKey => !string.IsNullOrWhiteSpace(_apiKey);

    public AiProviderClient(HttpClient http, IConfiguration config, ILogger<AiProviderClient> logger)
    {
        _http = http;
        _logger = logger;
        _apiKey = FirstNonEmpty(config["AIMANAGER_API_KEY"], config["AiManager:ApiKey"]);
        var provider = FirstNonEmpty(config["AIMANAGER_GATEWAY_PROVIDER"], config["AiManager:Provider"], "groq");
        _model = FirstNonEmpty(config["AIMANAGER_GATEWAY_MODEL"], config["AiManager:Model"], "qwen/qwen3.8-27b");
        var maxTokensStr = FirstNonEmpty(config["AIMANAGER_GATEWAY_MAX_TOKENS"], config["AiManager:MaxTokens"]);
        _maxTokens = int.TryParse(maxTokensStr, out var mt) ? mt : 800;

        _baseUrl = ProviderBaseUrls.GetValueOrDefault(provider, ProviderBaseUrls["groq"]);

        _logger.LogInformation("AIMANAGER_API_KEY configured: {HasKey} (provider={Provider}, model={Model})",
            HasApiKey, provider, _model);
    }

    private static string FirstNonEmpty(params string?[] values)
        => values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim() ?? "";

    /// <summary>
    /// Sends the system prompt and user content and returns the first choice's text.
    /// </summary>
    /// <param name="operation">Short name of the calling feature, used only in logs.</param>
    /// <exception cref="ModelFailureException">The key is missing or the provider answered with an error status.</exception>
    public async Task<string?> ChatAsync(string operation, string systemPrompt, string userContent, CancellationToken ct)
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

        var stopwatch = Stopwatch.StartNew();
        var outcome = "error";
        try
        {
            using var response = await _http.SendAsync(request, ct);

            if (!response.IsSuccessStatusCode)
            {
                outcome = "provider_status";
                _logger.LogWarning("AI provider failed operation={Operation} model={Model} status={StatusCode}",
                    operation, _model, (int)response.StatusCode);
                throw ModelFailureException.ProviderFailedError();
            }

            var body = await response.Content.ReadAsStringAsync(ct);
            var parsed = JsonSerializer.Deserialize<ChatResponse>(body, SerializerOptions);

            outcome = "ok";
            return parsed?.Choices?.FirstOrDefault()?.Message?.Content;
        }
        catch (OperationCanceledException)
        {
            outcome = "timeout";
            throw;
        }
        catch (HttpRequestException ex)
        {
            outcome = "unreachable";
            _logger.LogWarning("AI provider unreachable operation={Operation} model={Model} reason={Reason}",
                operation, _model, ex.HttpRequestError);
            throw;
        }
        finally
        {
            _logger.LogInformation(
                "AI call operation={Operation} model={Model} durationMs={DurationMs} outcome={Outcome}",
                operation, _model, stopwatch.ElapsedMilliseconds, outcome);
        }
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
