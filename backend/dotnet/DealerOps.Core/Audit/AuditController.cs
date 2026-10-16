using System.ComponentModel.DataAnnotations;
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
        // Nullable so a missing id fails [Required] with 400 instead of binding 0 (404).
        [FromQuery, Required] long? entityId,
        [FromQuery] int page = 0,
        [FromQuery] int size = 10)
    {
        return _service.List(entityType, entityId!.Value, page, size);
    }
}
