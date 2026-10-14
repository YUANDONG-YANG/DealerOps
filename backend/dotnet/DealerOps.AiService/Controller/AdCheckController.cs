using DealerOps.AiService.Adapter;
using DealerOps.AiService.Dto;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.AiService.Controller;

[ApiController]
[Route("internal/v1")]
public class AdCheckController : ControllerBase
{
    private readonly AdCheckAdapter _adapter;

    public AdCheckController(AdCheckAdapter adapter)
    {
        _adapter = adapter;
    }

    [HttpPost("ad-check")]
    public async Task<AdCheckOkResponse> AdCheck([FromBody] AdCheckInternalRequest body)
    {
        return await _adapter.RunAsync(body);
    }
}
