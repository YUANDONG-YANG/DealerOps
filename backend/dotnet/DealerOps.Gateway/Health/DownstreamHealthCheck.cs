using DealerOps.Logging;

namespace DealerOps.Gateway.Health;

/// <summary>
/// Probes Core and the AI service for the Gateway's <c>/actuator/health</c> and
/// <c>/actuator/release</c> endpoints, using the server-side "health" client.
/// </summary>
public class DownstreamHealthCheck
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<DownstreamHealthCheck> _logger;
    private readonly string _coreUrl;
    private readonly string _aiUrl;
    private readonly string _gatewayPublishedAt;
    private readonly string _webPublishedAt;

    public DownstreamHealthCheck(IHttpClientFactory httpClientFactory, IConfiguration config,
        ILogger<DownstreamHealthCheck> logger)
    {
        _httpClient = httpClientFactory.CreateClient("health");
        _logger = logger;
        _coreUrl = config["CORE_URL"] ?? "http://localhost:8081";
        _aiUrl = config["AI_URL"] ?? "http://localhost:8082";
        _gatewayPublishedAt = ReleaseInfo.Resolve(config["PUBLISHED_AT"]);
        // The Gateway cannot infer the web build time; without an explicit stamp say so rather
        // than reporting the Gateway's own binary timestamp as the web app's.
        var webStamp = config["WEB_PUBLISHED_AT"];
        _webPublishedAt = string.IsNullOrWhiteSpace(webStamp) ? "unavailable" : webStamp.Trim();
    }

    /// <summary>Release time of the running Gateway build.</summary>
    public string GatewayPublishedAt => _gatewayPublishedAt;

    /// <summary>Release time reported by Core, or <c>unavailable</c>.</summary>
    public Task<string> CorePublishedAtAsync() => FetchRelease(_coreUrl);

    /// <summary>Aggregated UP/DOWN status of Core and the AI service.</summary>
    public async Task<object> CheckAsync()
    {
        var coreOk = await CheckService("core", _coreUrl);
        var aiOk = await CheckService("ai", _aiUrl);
        return new
        {
            status = coreOk && aiOk ? "UP" : "DOWN",
            components = new
            {
                core = new { status = coreOk ? "UP" : "DOWN" },
                ai = new { status = aiOk ? "UP" : "DOWN" }
            }
        };
    }

    /// <summary>Release times of the web app, Gateway, Core and AI service.</summary>
    public async Task<object> ReleaseAsync()
    {
        var coreTime = await FetchRelease(_coreUrl);
        var aiTime = await FetchRelease(_aiUrl);
        return new
        {
            web = _webPublishedAt,
            gateway = _gatewayPublishedAt,
            core = coreTime,
            ai = aiTime
        };
    }

    private async Task<bool> CheckService(string service, string baseUrl)
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            using var response = await _httpClient.GetAsync($"{baseUrl}/actuator/health", cts.Token);
            if (response.IsSuccessStatusCode) return true;

            _logger.LogWarning("Downstream health check failed service={Service} status={Status}",
                service, (int)response.StatusCode);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Downstream health check failed service={Service} reason={Reason}",
                service, ex.GetType().Name);
            return false;
        }
    }

    private async Task<string> FetchRelease(string baseUrl)
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            var response = await _httpClient.GetAsync($"{baseUrl}/actuator/release", cts.Token);
            if (!response.IsSuccessStatusCode) return "unavailable";

            var json = await response.Content.ReadFromJsonAsync<Dictionary<string, System.Text.Json.JsonElement>>(
                cancellationToken: cts.Token);
            if (json != null && json.TryGetValue("publishedAt", out var published))
                return published.GetString() ?? "unavailable";
            return "unavailable";
        }
        catch
        {
            return "unavailable";
        }
    }
}
