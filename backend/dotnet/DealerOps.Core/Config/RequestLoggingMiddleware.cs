using System.Diagnostics;

namespace DealerOps.Core.Config;

public class RequestLoggingMiddleware
{
    public const string RequestIdHeader = "X-Request-ID";

    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var requestId = context.Request.Headers[RequestIdHeader].FirstOrDefault()
                        ?? Guid.NewGuid().ToString("N")[..12];

        context.Items["RequestId"] = requestId;
        context.Response.Headers[RequestIdHeader] = requestId;

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
