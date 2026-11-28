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

    /// <summary>
    /// Builds the probes from <c>CORE_URL</c>, <c>AI_URL</c>, <c>PUBLISHED_AT</c> and <c>WEB_PUBLISHED_AT</c>.
    /// </summary>
    /// <param name="httpClientFactory">Factory for the server-side "health" client.</param>
    /// <param name="config">Application configuration.</param>
    /// <param name="logger">Receives a warning when a probe fails.</param>
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
    /// <returns>Core's <c>publishedAt</c>, or <c>unavailable</c> when the probe fails.</returns>
    public Task<string> CorePublishedAtAsync() => FetchRelease("core", _coreUrl);

    /// <summary>Aggregated UP/DOWN status of Core and the AI service.</summary>
    /// <returns>An object with an overall status and a status for Core and the AI service.</returns>
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
    /// <returns>An object with the web, Gateway, Core and AI release times. A failed probe is <c>unavailable</c>.</returns>
    public async Task<object> ReleaseAsync()
    {
        var coreTime = await FetchRelease("core", _coreUrl);
        var aiTime = await FetchRelease("ai", _aiUrl);
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

    private async Task<string> FetchRelease(string service, string baseUrl)
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            using var response = await _httpClient.GetAsync($"{baseUrl}/actuator/release", cts.Token);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Downstream release check failed service={Service} status={Status}",
                    service, (int)response.StatusCode);
                return "unavailable";
            }

            var json = await response.Content.ReadFromJsonAsync<Dictionary<string, System.Text.Json.JsonElement>>(
                cancellationToken: cts.Token);
            if (json != null && json.TryGetValue("publishedAt", out var published))
            {
                var publishedAt = published.GetString();
                if (!string.IsNullOrWhiteSpace(publishedAt)) return publishedAt;
            }

            _logger.LogWarning("Downstream release check returned no publishedAt service={Service}", service);
            return "unavailable";
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Downstream release check failed service={Service} reason={Reason}",
                service, ex.GetType().Name);
            return "unavailable";
        }
    }
}
