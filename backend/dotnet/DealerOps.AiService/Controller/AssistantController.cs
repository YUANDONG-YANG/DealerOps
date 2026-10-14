using DealerOps.AiService.Adapter;
using DealerOps.AiService.Dto;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.AiService.Controller;

[ApiController]
[Route("internal/v1")]
public class AssistantController : ControllerBase
{
    private readonly AssistantAdapter _adapter;

    public AssistantController(AssistantAdapter adapter)
    {
        _adapter = adapter;
    }

    [HttpPost("assistant")]
    public async Task<AssistantOkResponse> Assistant([FromBody] AssistantInternalRequest body)
    {
        return await _adapter.RunAsync(body);
    }
}
