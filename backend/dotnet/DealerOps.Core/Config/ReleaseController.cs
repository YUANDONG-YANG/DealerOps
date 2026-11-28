using DealerOps.Logging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Config;

/// <summary>Anonymous release probe: reports when this Core build was published.</summary>
[ApiController]
[Route("actuator")]
public class ReleaseController : ControllerBase
{
    private readonly IConfiguration _config;

    public ReleaseController(IConfiguration config) => _config = config;

    /// <summary>Returns the service name and its publish time.</summary>
    [HttpGet("release")]
    [AllowAnonymous]
    public object Release() =>
        new { service = "core", publishedAt = ReleaseInfo.Resolve(_config["PUBLISHED_AT"]) };
}
