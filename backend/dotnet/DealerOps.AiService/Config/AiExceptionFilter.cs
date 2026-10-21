using DealerOps.AiService.Dto;
using DealerOps.AiService.Support;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace DealerOps.AiService.Config;

/// <summary>
/// Maps a <see cref="ModelFailureException"/> to its status code and the
/// <c>{success:false, code, message}</c> body Core expects.
/// </summary>
public class AiExceptionFilter : IExceptionFilter
{
    private readonly ILogger<AiExceptionFilter> _logger;

    public AiExceptionFilter(ILogger<AiExceptionFilter> logger)
    {
        _logger = logger;
    }

    /// <summary>Writes the failure body; other exceptions are left to the framework.</summary>
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is ModelFailureException ex)
        {
            // An expected, handled failure: WARN without a stack trace.
            _logger.LogWarning("AI request failed code={Code} status={Status} {Path}",
                ex.Code, ex.StatusCode, context.HttpContext.Request.Path.Value);

            context.Result = new ObjectResult(AiFailureBody.Of(ex.Code, ex.Message))
            {
                StatusCode = ex.StatusCode
            };
            context.ExceptionHandled = true;
        }
    }
}
