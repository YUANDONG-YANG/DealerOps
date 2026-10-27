using DealerOps.AiService.Adapter;
using DealerOps.AiService.Dto;
using DealerOps.AiService.Support;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.AiService.Controller;

/// <summary>Internal ad-check endpoint called by Core through the Gateway.</summary>
[ApiController]
[Route("internal/v1")]
public class AdCheckController : ControllerBase
{
    private readonly AdCheckAdapter _adapter;

    /// <summary>Creates the ad-check controller.</summary>
    /// <param name="adapter">Adapter that calls the model and parses notes.</param>
    public AdCheckController(AdCheckAdapter adapter)
    {
        _adapter = adapter;
    }

    /// <summary>Returns AI review notes for one listing.</summary>
    /// <param name="body">Listing copy and the public facts it is checked against.</param>
    /// <returns>A successful body with at most eight notes.</returns>
    /// <exception cref="ModelFailureException">The model call failed or returned no usable note.</exception>
    [HttpPost("ad-check")]
    public async Task<AdCheckOkResponse> AdCheck([FromBody] AdCheckInternalRequest body)
    {
        return await _adapter.RunAsync(body);
    }
}
