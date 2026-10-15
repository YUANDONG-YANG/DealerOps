using DealerOps.Logging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Config;

[ApiController]
[Route("actuator")]
public class ReleaseController : ControllerBase
{
    private readonly IConfiguration _config;

    public ReleaseController(IConfiguration config) => _config = config;

    [HttpGet("release")]
    [AllowAnonymous]
    public object Release() =>
        new { service = "core", publishedAt = ReleaseInfo.Resolve(_config["PUBLISHED_AT"]) };
}
