using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using DealerOps.AiService.Support;

namespace DealerOps.AiService.Adapter;

/// <summary>
/// Sends one chat-completion request to the configured OpenAI-compatible provider.
/// Logs one INFO line per call (dependency, operation, model, duration, outcome) and a WARN for a
/// missing key, a non-success status, a timeout, an unreachable host, or an unusable result.
/// Prompts, ad text, answers and the API key are never logged.
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
    private readonly string _provider;
    private readonly string _model;
    private readonly int _maxTokens;
    private readonly string _apiKey;
    private readonly string _baseUrl;
    private readonly ILogger<AiProviderClient> _logger;

    private bool HasApiKey => !string.IsNullOrWhiteSpace(_apiKey);

    /// <summary>Configured provider name for logs. Not the API key or the base URL.</summary>
    internal string DependencyName => _provider;

    /// <summary>Reads the provider, model, token budget, and API key from configuration.</summary>
    /// <param name="http">Named client whose connect timeout is set at startup.</param>
    /// <param name="config">Application configuration. The API key is read and never logged.</param>
    /// <param name="logger">Logger for one line per model call.</param>
    public AiProviderClient(HttpClient http, IConfiguration config, ILogger<AiProviderClient> logger)
    {
        _http = http;
        _logger = logger;
        _apiKey = FirstNonEmpty(config["AIMANAGER_API_KEY"], config["AiManager:ApiKey"]);
        var provider = FirstNonEmpty(config["AIMANAGER_GATEWAY_PROVIDER"], config["AiManager:Provider"], "groq");
        _provider = provider;
        _model = FirstNonEmpty(config["AIMANAGER_GATEWAY_MODEL"], config["AiManager:Model"], "qwen/qwen3.8-27b");
        var maxTokensStr = FirstNonEmpty(config["AIMANAGER_GATEWAY_MAX_TOKENS"], config["AiManager:MaxTokens"]);
        _maxTokens = int.TryParse(maxTokensStr, out var mt) ? mt : 800;

        // Unknown provider names stay on Groq so a typo cannot select an arbitrary host.
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
    /// <param name="systemPrompt">Fixed system prompt. Never logged.</param>
    /// <param name="userContent">User payload. Never logged; it may contain listing copy or a question.</param>
    /// <param name="ct">Budget token from <see cref="TimedModelCall"/>. Cancellation is a timeout.</param>
    /// <returns>The first choice's text, or empty when the provider returned no content.</returns>
    /// <exception cref="ModelFailureException">The key is missing or the provider answered with an error status.</exception>
    /// <exception cref="OperationCanceledException">The call exceeded the time budget.</exception>
    /// <exception cref="HttpRequestException">The provider host could not be reached.</exception>
    /// <exception cref="JsonException">The provider body was not valid JSON. The body is not logged.</exception>
    public async Task<string?> ChatAsync(string operation, string systemPrompt, string userContent, CancellationToken ct)
    {
        var stopwatch = Stopwatch.StartNew();
        var outcome = "error";
        try
        {
            if (!HasApiKey)
            {
                _logger.LogWarning(
                    "AI provider failed dependency={Dependency} operation={Operation} model={Model} durationMs={DurationMs} status={Status} reason={Reason}",
                    _provider, operation, _model, stopwatch.ElapsedMilliseconds, "skipped", "key_missing");
                throw ModelFailureException.KeyMissingError();
            }

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
            {
                outcome = "provider_status";
                // Status only: the error body can echo the prompt or the listing copy.
                _logger.LogWarning(
                    "AI provider failed dependency={Dependency} operation={Operation} model={Model} durationMs={DurationMs} status={StatusCode} reason={Reason}",
                    _provider, operation, _model, stopwatch.ElapsedMilliseconds, (int)response.StatusCode, "non_success");
                throw ModelFailureException.ProviderFailedError();
            }

            var body = await response.Content.ReadAsStringAsync(ct);
            var parsed = JsonSerializer.Deserialize<ChatResponse>(body, SerializerOptions);
            var text = parsed?.Choices?.FirstOrDefault()?.Message?.Content;
            if (string.IsNullOrWhiteSpace(text))
            {
                outcome = "error";
                _logger.LogWarning(
                    "AI provider failed dependency={Dependency} operation={Operation} model={Model} durationMs={DurationMs} status={StatusCode} reason={Reason}",
                    _provider, operation, _model, stopwatch.ElapsedMilliseconds, (int)response.StatusCode, "empty_result");
                return text;
            }

            outcome = "ok";
            return text;
        }
        catch (OperationCanceledException)
        {
            // Callers pass the AI-02 budget token, so cancellation here is a timeout, not a client abort.
            outcome = "timeout";
            _logger.LogWarning(
                "AI provider timed out dependency={Dependency} operation={Operation} model={Model} durationMs={DurationMs} status={Status} reason={Reason}",
                _provider, operation, _model, stopwatch.ElapsedMilliseconds, "timeout", "deadline_exceeded");
            throw;
        }
        catch (HttpRequestException ex)
        {
            outcome = "unreachable";
            _logger.LogWarning(
                "AI provider unreachable dependency={Dependency} operation={Operation} model={Model} durationMs={DurationMs} status={Status} reason={Reason}",
                _provider, operation, _model, stopwatch.ElapsedMilliseconds, "unreachable", ex.HttpRequestError);
            throw;
        }
        catch (Exception ex) when (ex is not ModelFailureException)
        {
            // Type name only: the exception message can quote the model body.
            outcome = "error";
            _logger.LogWarning(
                "AI provider failed dependency={Dependency} operation={Operation} model={Model} durationMs={DurationMs} status={Status} reason={Reason}",
                _provider, operation, _model, stopwatch.ElapsedMilliseconds, "error", ex.GetType().Name);
            throw;
        }
        finally
        {
            _logger.LogInformation(
                "AI call dependency={Dependency} operation={Operation} model={Model} durationMs={DurationMs} outcome={Outcome}",
                _provider, operation, _model, stopwatch.ElapsedMilliseconds, outcome);
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
