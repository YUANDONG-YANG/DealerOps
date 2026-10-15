using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Config;

[ApiController]
[Route("api/v1/release")]
public class ReleaseController : ControllerBase
{
    private readonly IConfiguration _config;

    public ReleaseController(IConfiguration config) => _config = config;

    [HttpGet]
    public object Get() => new { publishedAt = _config["PUBLISHED_AT"] ?? "local" };

    [HttpGet("core")]
    public object Core() => new { publishedAt = _config["PUBLISHED_AT"] ?? "local" };

    [HttpGet("ai")]
    public object Ai() => new { publishedAt = _config["PUBLISHED_AT"] ?? "local" };
}
