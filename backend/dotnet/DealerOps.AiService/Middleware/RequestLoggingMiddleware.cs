using System.Diagnostics;

namespace DealerOps.AiService.Middleware;

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
            requestId = Guid.NewGuid().ToString();

        context.Response.Headers[RequestIdHeader] = requestId;

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
