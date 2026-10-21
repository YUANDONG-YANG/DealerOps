using DealerOps.AiService.Adapter;
using DealerOps.AiService.Dto;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.AiService.Controller;

/// <summary>Internal ad-check endpoint called by Core through the Gateway.</summary>
[ApiController]
[Route("internal/v1")]
public class AdCheckController : ControllerBase
{
    private readonly AdCheckAdapter _adapter;

    public AdCheckController(AdCheckAdapter adapter)
    {
        _adapter = adapter;
    }

    /// <summary>Returns AI review notes for one listing.</summary>
    [HttpPost("ad-check")]
    public async Task<AdCheckOkResponse> AdCheck([FromBody] AdCheckInternalRequest body)
    {
        return await _adapter.RunAsync(body);
    }
}
