using DealerOps.AiService.Adapter;
using DealerOps.AiService.Dto;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.AiService.Controller;

/// <summary>Internal assistant endpoint called by Core through the Gateway.</summary>
[ApiController]
[Route("internal/v1")]
public class AssistantController : ControllerBase
{
    private readonly AssistantAdapter _adapter;

    public AssistantController(AssistantAdapter adapter)
    {
        _adapter = adapter;
    }

    /// <summary>Returns a short read-only answer from the supplied resource cards.</summary>
    [HttpPost("assistant")]
    public async Task<AssistantOkResponse> Assistant([FromBody] AssistantInternalRequest body)
    {
        return await _adapter.RunAsync(body);
    }
}
