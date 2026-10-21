using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace DealerOps.AiService.Middleware;

/// <summary>
/// Requires the Gateway's internal credential on every path, so a direct call to the AI service
/// gets 404.
/// </summary>
public class InternalGuardFilter : IMiddleware
{
    private const string WellKnownDefaultToken = "dealer-internal";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly string _headerName;
    private readonly string _token;
    private readonly byte[] _expectedTokenBytes;
    private readonly ILogger<InternalGuardFilter> _logger;

    public InternalGuardFilter(IConfiguration config, ILogger<InternalGuardFilter> logger)
    {
        _headerName = config["AiService:InternalHeaderName"]
                      ?? config["INTERNAL_HEADER_NAME"]
                      ?? "X-Dealer-Internal";
        _token = First(config["INTERNAL_TOKEN"], config["AiService:InternalToken"])
                 ?? throw new InvalidOperationException(
                     "INTERNAL_TOKEN is not configured. Set INTERNAL_TOKEN or AiService__InternalToken.");
        _expectedTokenBytes = Encoding.UTF8.GetBytes(_token);
        _logger = logger;

        var jwtMode = config["JWT_MODE"] ?? config["dealerops:jwt:mode"] ?? "dev";
        var devMode = string.Equals(jwtMode.Trim(), "dev", StringComparison.OrdinalIgnoreCase);

        if (_token == WellKnownDefaultToken && !devMode)
        {
            throw new InvalidOperationException(
                "Refusing to start: INTERNAL_TOKEN is the well-known default and JWT_MODE is not dev. " +
                "Set a non-default INTERNAL_TOKEN, or set JWT_MODE=dev for classroom/local only.");
        }
    }

    /// <summary>Rejects the request with 404 or passes it on.</summary>
    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        // Every path, including health and OpenAPI. A direct 8082 call has no gateway credential.
        if (!PresentedTokenMatches(context))
        {
            _logger.LogWarning("Rejecting {Method} {Path} (missing or invalid {Header})",
                context.Request.Method, context.Request.Path.Value, _headerName);
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await context.Response.WriteAsJsonAsync(new { code = "NOT_FOUND", message = "Not found" }, Json);
            return;
        }

        await next(context);
    }

    private bool PresentedTokenMatches(HttpContext context)
    {
        var header = context.Request.Headers[_headerName].FirstOrDefault();
        return !string.IsNullOrEmpty(header) && ConstantTimeEquals(header);
    }

    private static string? First(params string?[] values)
    {
        foreach (var value in values)
            if (!string.IsNullOrWhiteSpace(value)) return value;
        return null;
    }

    private bool ConstantTimeEquals(string presented)
    {
        var presentedBytes = Encoding.UTF8.GetBytes(presented);
        return CryptographicOperations.FixedTimeEquals(_expectedTokenBytes, presentedBytes);
    }
}
