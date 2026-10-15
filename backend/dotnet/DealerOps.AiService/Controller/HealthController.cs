using DealerOps.Logging;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.AiService.Controller;

[ApiController]
[Route("actuator")]
public class HealthController : ControllerBase
{
    private readonly IConfiguration _config;

    public HealthController(IConfiguration config) => _config = config;

    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new { status = "UP" });
    }

    [HttpGet("release")]
    public IActionResult Release() =>
        Ok(new { service = "ai", publishedAt = ReleaseInfo.Resolve(_config["PUBLISHED_AT"]) });
}
