using System.Diagnostics;

namespace DealerOps.Gateway.Middleware;

public class RequestLoggingMiddleware
{
    private const string RequestIdHeader = "X-Request-ID";

    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var requestId = context.Request.Headers[RequestIdHeader].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(requestId))
        {
            requestId = Guid.NewGuid().ToString();
            context.Request.Headers[RequestIdHeader] = requestId;
        }

        context.Response.Headers[RequestIdHeader] = requestId;

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
