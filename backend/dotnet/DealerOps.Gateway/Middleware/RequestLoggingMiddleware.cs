using System.Diagnostics;
using System.Text.Json;
using DealerOps.Logging;

namespace DealerOps.Gateway.Middleware;

/// <summary>
/// Gives every request an <c>X-Request-ID</c> (kept when the caller sent a valid one, so Core logs the
/// same id; an invalid one is replaced before it is forwarded) and writes one access line per
/// request: method, path, user, status and duration. An unhandled exception is logged by type and
/// answered with the internal-error envelope. A client abort is recorded by the access line.
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    /// <summary>Creates the middleware.</summary>
    /// <param name="next">The next pipeline component.</param>
    /// <param name="logger">Receives the access line and unhandled-exception line.</param>
    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>
    /// Assigns <c>X-Request-ID</c>, runs the rest of the pipeline, and writes one access line.
    /// </summary>
    /// <param name="context">The current request.</param>
    /// <returns>A task that completes after the access line is written.</returns>
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
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // The client closed the connection. The access line records the request.
        }
        catch (Exception ex)
        {
            if (!context.Response.HasStarted)
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;

            _logger.LogError(
                "Unhandled exception requestId={RequestId} {Method} {Path} status={Status} reason={Reason}",
                requestId,
                context.Request.Method,
                context.Request.Path.Value,
                context.Response.StatusCode,
                ex.GetType().Name);

            if (!context.Response.HasStarted)
            {
                await context.Response.WriteAsJsonAsync(
                    new { code = "INTERNAL_ERROR", message = "Unexpected server error." },
                    new JsonSerializerOptions(JsonSerializerDefaults.Web));
            }
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
