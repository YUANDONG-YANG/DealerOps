using Microsoft.AspNetCore.Mvc;

namespace DealerOps.AiService.Controller;

[ApiController]
[Route("actuator")]
public class HealthController : ControllerBase
{
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new { status = "UP" });
    }
}
