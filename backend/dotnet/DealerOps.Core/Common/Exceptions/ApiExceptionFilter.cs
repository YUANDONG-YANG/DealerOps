using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Common.Exceptions;

/// <summary>
/// Maps a known <see cref="ApiException"/> or a lost update onto the error envelope.
/// Anything else stays unhandled so the request pipeline can log it once.
/// </summary>
public class ApiExceptionFilter : IExceptionFilter
{
    private readonly ILogger<ApiExceptionFilter> _logger;

    public ApiExceptionFilter(ILogger<ApiExceptionFilter> logger) => _logger = logger;

    /// <summary>Writes the envelope for a handled failure and leaves every other exception to the pipeline.</summary>
    public void OnException(ExceptionContext context)
    {
        // Two saves that both pass a service-level version check still collide on the
        // [ConcurrencyCheck] Version column; report that race as the same 409 the check returns.
        // Domain services already log the version check they throw themselves, so only this
        // collision is logged here. The exception text is omitted: it can echo row values.
        if (context.Exception is DbUpdateConcurrencyException)
        {
            var raceRequestId = context.HttpContext.Items["RequestId"] as string ?? "";
            _logger.LogWarning(
                "Version conflict method={Method} path={Path} [{RequestId}]",
                context.HttpContext.Request.Method,
                context.HttpContext.Request.Path,
                raceRequestId);
        }

        var ex = context.Exception switch
        {
            ApiException api => api,
            DbUpdateConcurrencyException => new ApiException(ErrorCode.VersionConflict,
                "The record was changed by someone else. Refresh and try again."),
            _ => null,
        };
        if (ex is null) return;

        var statusCode = ex.Code.HttpStatus();
        var requestId = context.HttpContext.Items["RequestId"] as string ?? "";

        context.Result = new ObjectResult(new ErrorBody(ex.Code.ToWireCode(), ex.Message, requestId, ex.FieldErrors))
        {
            StatusCode = statusCode
        };
        context.ExceptionHandled = true;
    }
}
