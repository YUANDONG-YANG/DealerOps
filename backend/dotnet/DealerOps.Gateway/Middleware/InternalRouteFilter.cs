using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace DealerOps.Gateway.Middleware;

public class InternalRouteFilter
{
    private const string WellKnownDefaultToken = "dealer-internal";

    private readonly RequestDelegate _next;
    private readonly string _headerName;
    private readonly string _expectedToken;
    private readonly bool _devMode;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ILogger<InternalRouteFilter> _logger;

    public InternalRouteFilter(
        RequestDelegate next,
        IConfiguration config,
        ILogger<InternalRouteFilter> logger)
    {
        _next = next;
        _logger = logger;
        _headerName = config["dealerops:internalHeaderName"] ?? "X-Dealer-Internal";
        _expectedToken = First(config["INTERNAL_TOKEN"], config["dealerops:internalToken"])
                         ?? throw new InvalidOperationException(
                             "INTERNAL_TOKEN is not configured. Set INTERNAL_TOKEN or dealerops__internalToken.");

        var jwtMode = config["JWT_MODE"] ?? config["dealerops:jwt:mode"] ?? "dev";
        _devMode = string.Equals(jwtMode.Trim(), "dev", StringComparison.OrdinalIgnoreCase);

        if (_expectedToken == WellKnownDefaultToken && !_devMode)
        {
            throw new InvalidOperationException(
                "Refusing to start: INTERNAL_TOKEN is the well-known default and JWT_MODE is not dev. " +
                "Set a non-default INTERNAL_TOKEN, or set JWT_MODE=dev for classroom/local only.");
        }
    }

    private static string? First(params string?[] values)
    {
        foreach (var value in values)
            if (!string.IsNullOrWhiteSpace(value)) return value;
        return null;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "";
        var header = context.Request.Headers[_headerName].FirstOrDefault();
        var isInternal = path.Equals("/internal", StringComparison.OrdinalIgnoreCase)
                         || path.StartsWith("/internal/", StringComparison.OrdinalIgnoreCase);

        if (!isInternal)
        {
            if (header != null)
            {
                _logger.LogWarning("Rejecting {Method} {Path} (non-internal path carries {Header})",
                    context.Request.Method, path, _headerName);
                await WriteNotFound(context);
                return;
            }

            await _next(context);
            return;
        }

        if (WellKnownDefaultBlocked() || !TokenMatches(header))
        {
            _logger.LogWarning("Rejecting {Method} {Path} (missing or invalid {Header})",
                context.Request.Method, path, _headerName);
            await WriteNotFound(context);
            return;
        }

        await _next(context);
    }

    private static Task WriteNotFound(HttpContext context)
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return context.Response.WriteAsJsonAsync(new { code = "NOT_FOUND", message = "Not found" }, Json);
    }

    private bool WellKnownDefaultBlocked() =>
        _expectedToken == WellKnownDefaultToken && !_devMode;

    private bool TokenMatches(string? header)
    {
        if (string.IsNullOrEmpty(_expectedToken) || string.IsNullOrEmpty(header))
            return false;

        var expected = Encoding.UTF8.GetBytes(_expectedToken);
        var actual = Encoding.UTF8.GetBytes(header);
        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }
}
