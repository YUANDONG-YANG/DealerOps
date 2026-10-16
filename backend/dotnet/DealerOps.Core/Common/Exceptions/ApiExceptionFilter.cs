using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Common.Exceptions;

public class ApiExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        // Two saves that both pass a service-level version check still collide on the
        // [ConcurrencyCheck] Version column; report that race as the same 409 the check returns.
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
