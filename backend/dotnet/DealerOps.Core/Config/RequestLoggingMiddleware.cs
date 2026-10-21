using System.Diagnostics;
using DealerOps.Logging;

namespace DealerOps.Core.Config;

/// <summary>
/// Assigns or forwards a valid X-Request-ID (see <see cref="RequestId"/>) and writes one access
/// line per request: method, path, status, duration and request id. The query string is never logged, because it can carry
/// search text such as customer names.
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>Runs the rest of the pipeline and logs the request when it finishes.</summary>
    public async Task InvokeAsync(HttpContext context)
    {
        var requestId = context.Request.Headers[RequestId.Header].FirstOrDefault();
        if (!RequestId.IsValid(requestId))
            requestId = Guid.NewGuid().ToString("N")[..12];

        context.Items["RequestId"] = requestId;
        context.Response.Headers[RequestId.Header] = requestId;

        var sw = Stopwatch.StartNew();
        try
        {
            await _next(context);
        }
        finally
        {
            sw.Stop();
            _logger.LogInformation("{Method} {Path} {Status} {ElapsedMs}ms [{RequestId}]",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                sw.ElapsedMilliseconds,
                requestId);
        }
    }
}
