using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DealerOps.Logging;

namespace DealerOps.Gateway.Middleware;

/// <summary>
/// Keeps the internal credential server-side: a browser request that carries the internal header
/// on a public path, or an <c>/internal/**</c> request without the right credential, gets 404.
/// </summary>
public class InternalRouteFilter
{
    private const string WellKnownDefaultToken = "dealer-internal";

    private readonly RequestDelegate _next;
    private readonly string _headerName;
    private readonly string _expectedToken;
    private readonly bool _devMode;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ILogger<InternalRouteFilter> _logger;

    /// <summary>Reads the internal header name and credential from configuration.</summary>
    /// <param name="next">The next pipeline component.</param>
    /// <param name="config">Application configuration.</param>
    /// <param name="logger">Receives one warning for each rejected request.</param>
    /// <exception cref="InvalidOperationException">
    /// The internal credential is missing, or it is the well-known default while JWT mode is not dev.
    /// </exception>
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

    /// <summary>Rejects a request that exposes or omits the internal credential, or passes it on.</summary>
    /// <param name="context">The current request.</param>
    /// <returns>A task that completes when the request has been rejected or the rest of the pipeline has finished.</returns>
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
                _logger.LogWarning(
                    "Rejecting requestId={RequestId} {Method} {Path} (non-internal path carries {Header})",
                    CurrentRequestId(context), context.Request.Method, path, _headerName);
                await WriteNotFound(context);
                return;
            }

            await _next(context);
            return;
        }

        if (WellKnownDefaultBlocked() || !TokenMatches(header))
        {
            _logger.LogWarning(
                "Rejecting requestId={RequestId} {Method} {Path} (missing or invalid {Header})",
                CurrentRequestId(context), context.Request.Method, path, _headerName);
            await WriteNotFound(context);
            return;
        }

        await _next(context);
    }

    private static string CurrentRequestId(HttpContext context)
    {
        var requestId = context.Request.Headers[RequestId.Header].FirstOrDefault();
        return RequestId.IsValid(requestId) ? requestId : "";
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
