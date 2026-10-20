using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;

namespace DealerOps.Core.Security;

/// <summary>
/// Core is not a public entry. The gateway stamps <c>X-Dealer-Internal</c> on the outbound
/// call; a browser or curl that reaches this process without that credential gets 404.
/// </summary>
public class InternalCallerGuard
{
    private const string WellKnownDefaultToken = "dealer-internal";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly RequestDelegate _next;
    private readonly string _headerName;
    private readonly byte[] _expectedTokenBytes;
    private readonly ILogger<InternalCallerGuard> _logger;

    public InternalCallerGuard(RequestDelegate next, IConfiguration config, ILogger<InternalCallerGuard> logger)
    {
        _next = next;
        _logger = logger;
        _headerName = First(config["AiService:InternalHeaderName"]) ?? "X-Dealer-Internal";
        var token = First(config["INTERNAL_TOKEN"], config["AiService:InternalToken"])
                    ?? throw new InvalidOperationException(
                        "Internal service token is not configured. Set INTERNAL_TOKEN or AiService__InternalToken.");

        var jwtMode = config["JWT_MODE"] ?? config["dealerops:jwt:mode"] ?? "dev";
        var devMode = string.Equals(jwtMode.Trim(), "dev", StringComparison.OrdinalIgnoreCase);
        if (token == WellKnownDefaultToken && !devMode)
        {
            throw new InvalidOperationException(
                "Refusing to start: INTERNAL_TOKEN is the well-known default and JWT_MODE is not dev. " +
                "Set a non-default INTERNAL_TOKEN, or set JWT_MODE=dev for classroom/local only.");
        }

        _expectedTokenBytes = Encoding.UTF8.GetBytes(token);
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var header = context.Request.Headers[_headerName].FirstOrDefault();
        if (!TokenMatches(header))
        {
            _logger.LogWarning("Rejecting {Method} {Path} (missing or invalid {Header})",
                context.Request.Method, context.Request.Path.Value, _headerName);
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            var requestId = context.Items["RequestId"] as string ?? "";
            await context.Response.WriteAsJsonAsync(
                new ErrorBody(ErrorCode.NotFound.ToWireCode(), "Not found", requestId), Json);
            return;
        }

        await _next(context);
    }

    private bool TokenMatches(string? header)
    {
        if (string.IsNullOrEmpty(header)) return false;
        var actual = Encoding.UTF8.GetBytes(header);
        return CryptographicOperations.FixedTimeEquals(_expectedTokenBytes, actual);
    }

    private static string? First(params string?[] values)
    {
        foreach (var value in values)
            if (!string.IsNullOrWhiteSpace(value)) return value;
        return null;
    }
}
