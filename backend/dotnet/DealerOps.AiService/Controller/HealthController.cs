using DealerOps.Logging;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.AiService.Controller;

/// <summary>Liveness and release endpoints probed by the Gateway.</summary>
[ApiController]
[Route("actuator")]
public class HealthController : ControllerBase
{
    private readonly IConfiguration _config;

    public HealthController(IConfiguration config) => _config = config;

    /// <summary>Always UP while the process serves requests.</summary>
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new { status = "UP" });
    }

    /// <summary>Release time of the running AI service build.</summary>
    [HttpGet("release")]
    public IActionResult Release() =>
        Ok(new { service = "ai", publishedAt = ReleaseInfo.Resolve(_config["PUBLISHED_AT"]) });
}
