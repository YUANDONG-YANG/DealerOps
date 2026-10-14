using DealerOps.AiService.Dto;
using DealerOps.AiService.Support;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace DealerOps.AiService.Config;

public class AiExceptionFilter : IExceptionFilter
{
    private readonly ILogger<AiExceptionFilter> _logger;

    public AiExceptionFilter(ILogger<AiExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        if (context.Exception is ModelFailureException ex)
        {
            if (ex.StatusCode >= 500)
                _logger.LogError("AI model call failed: {Code} ({Message})", ex.Code, ex.Message);
            else
                _logger.LogWarning("AI model call rejected: {Code} ({Message})", ex.Code, ex.Message);

            context.Result = new ObjectResult(AiFailureBody.Of(ex.Code, ex.Message))
            {
                StatusCode = ex.StatusCode
            };
            context.ExceptionHandled = true;
        }
    }
}
