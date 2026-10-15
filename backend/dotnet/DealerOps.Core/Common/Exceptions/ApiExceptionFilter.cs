using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace DealerOps.Core.Common.Exceptions;

public class ApiExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is not ApiException ex) return;

        var statusCode = ex.Code.HttpStatus();
        var requestId = context.HttpContext.Items["RequestId"] as string ?? "";

        context.Result = new ObjectResult(new ErrorBody(ex.Code.ToWireCode(), ex.Message, requestId, ex.FieldErrors))
        {
            StatusCode = statusCode
        };
        context.ExceptionHandled = true;
    }
}
