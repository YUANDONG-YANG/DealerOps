namespace DealerOps.Gateway.Health;

public class DownstreamHealthCheck
{
    private readonly HttpClient _httpClient;
    private readonly string _coreUrl;
    private readonly string _aiUrl;

    public DownstreamHealthCheck(IHttpClientFactory httpClientFactory, IConfiguration config)
    {
        _httpClient = httpClientFactory.CreateClient("health");
        _coreUrl = config["CORE_URL"] ?? "http://localhost:8081";
        _aiUrl = config["AI_URL"] ?? "http://localhost:8082";
    }

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
            gateway = Environment.GetEnvironmentVariable("PUBLISHED_AT") ?? "local",
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
            var response = await _httpClient.GetAsync($"{baseUrl}/actuator/info", cts.Token);
            if (!response.IsSuccessStatusCode) return "unavailable";

            var json = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(cancellationToken: cts.Token);
            if (json != null && json.TryGetValue("release", out var release) && release is System.Text.Json.JsonElement el)
            {
                if (el.TryGetProperty("publishedAt", out var pub))
                    return pub.GetString() ?? "unavailable";
            }
            return "unavailable";
        }
        catch
        {
            return "unavailable";
        }
    }
}
