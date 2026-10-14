using DealerOps.Core.Compliance.Dto;
using DealerOps.Core.Listing.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Compliance;

[ApiController]
[Route("api/v1/listings")]
[Authorize]
public class ComplianceCheckController : ControllerBase
{
    private readonly ComplianceCheckService _checkService;

    public ComplianceCheckController(ComplianceCheckService checkService)
    {
        _checkService = checkService;
    }

    [HttpPost("{id}/checks")]
    public CheckResponse Check(long id, [FromBody] VersionBody body)
    {
        return _checkService.Check(id, body);
    }
}
