using System.Diagnostics;
using DealerOps.Logging;

namespace DealerOps.Gateway.Middleware;

/// <summary>
/// Gives every request an <c>X-Request-ID</c> (kept when the caller sent a valid one, so Core logs the
/// same id; an invalid one is replaced before it is forwarded) and writes one access line per
/// request: method, path, user, status and duration.
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
        {
            requestId = Guid.NewGuid().ToString();
            context.Request.Headers[RequestId.Header] = requestId;
        }

        context.Response.Headers[RequestId.Header] = requestId;

        var stopwatch = Stopwatch.StartNew();
        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();
            var user = context.User?.Identity?.Name ?? "anonymous";
            _logger.LogInformation(
                "requestId={RequestId} {Method} {Path} user={User} status={Status} durationMs={Duration}",
                requestId,
                context.Request.Method,
                context.Request.Path.Value,
                user,
                context.Response.StatusCode,
                stopwatch.ElapsedMilliseconds);
        }
    }
}
