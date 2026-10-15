using DealerOps.Logging;

namespace DealerOps.Gateway.Health;

public class DownstreamHealthCheck
{
    private readonly HttpClient _httpClient;
    private readonly string _coreUrl;
    private readonly string _aiUrl;
    private readonly string _gatewayPublishedAt;
    private readonly string _webPublishedAt;

    public DownstreamHealthCheck(IHttpClientFactory httpClientFactory, IConfiguration config)
    {
        _httpClient = httpClientFactory.CreateClient("health");
        _coreUrl = config["CORE_URL"] ?? "http://localhost:8081";
        _aiUrl = config["AI_URL"] ?? "http://localhost:8082";
        _gatewayPublishedAt = ReleaseInfo.Resolve(config["PUBLISHED_AT"]);
        _webPublishedAt = ReleaseInfo.Resolve(config["WEB_PUBLISHED_AT"]);
    }

    public string GatewayPublishedAt => _gatewayPublishedAt;

    public Task<string> CorePublishedAtAsync() => FetchRelease(_coreUrl);

    public async Task<object> CheckAsync()
    {
        var coreOk = await CheckService(_coreUrl);
        var aiOk = await CheckService(_aiUrl);
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

    private async Task<bool> CheckService(string baseUrl)
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            var response = await _httpClient.GetAsync($"{baseUrl}/actuator/health", cts.Token);
            return response.IsSuccessStatusCode;
        }
        catch
        {
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
