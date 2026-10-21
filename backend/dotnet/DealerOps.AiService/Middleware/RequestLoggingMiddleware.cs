using System.Diagnostics;
using DealerOps.Logging;

namespace DealerOps.AiService.Middleware;

/// <summary>
/// Echoes the Gateway's <c>X-Request-ID</c> when it is valid (otherwise generates one) and writes
/// one access line per request.
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

    /// <summary>Runs the rest of the pipeline and logs the access line.</summary>
    public async Task InvokeAsync(HttpContext context)
    {
        var requestId = context.Request.Headers[RequestId.Header].FirstOrDefault();
        if (!RequestId.IsValid(requestId))
            requestId = Guid.NewGuid().ToString();

        context.Response.Headers[RequestId.Header] = requestId;

        var sw = Stopwatch.StartNew();
        try
        {
            await _next(context);
        }
        finally
        {
            sw.Stop();
            _logger.LogInformation(
                "requestId={RequestId} {Method} {Path} status={Status} durationMs={Duration}",
                requestId,
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                sw.ElapsedMilliseconds);
        }
    }
}
