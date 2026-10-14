using DealerOps.Core.Audit.Dto;
using DealerOps.Core.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Audit;

[ApiController]
[Route("api/v1/audit")]
[Authorize]
public class AuditController : ControllerBase
{
    private readonly AuditService _service;

    public AuditController(AuditService service)
    {
        _service = service;
    }

    [HttpGet]
    public PageResponse<AuditItem> List(
        [FromQuery] string entityType,
        [FromQuery] long entityId,
        [FromQuery] int page = 0,
        [FromQuery] int size = 10)
    {
        return _service.List(entityType, entityId, page, size);
    }
}
