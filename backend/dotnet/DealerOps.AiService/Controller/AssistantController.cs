using DealerOps.AiService.Adapter;
using DealerOps.AiService.Dto;
using DealerOps.AiService.Support;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.AiService.Controller;

/// <summary>Internal assistant endpoint called by Core through the Gateway.</summary>
[ApiController]
[Route("internal/v1")]
public class AssistantController : ControllerBase
{
    private readonly AssistantAdapter _adapter;

    /// <summary>Creates the assistant controller.</summary>
    /// <param name="adapter">Adapter that calls the model with the resource cards.</param>
    public AssistantController(AssistantAdapter adapter)
    {
        _adapter = adapter;
    }

    /// <summary>Returns a short read-only answer from the supplied resource cards.</summary>
    /// <param name="body">The question and at most five resource cards from Core.</param>
    /// <returns>A successful body whose summary is the model answer.</returns>
    /// <exception cref="ModelFailureException">The model call failed or returned an empty answer.</exception>
    [HttpPost("assistant")]
    public async Task<AssistantOkResponse> Assistant([FromBody] AssistantInternalRequest body)
    {
        return await _adapter.RunAsync(body);
    }
}
