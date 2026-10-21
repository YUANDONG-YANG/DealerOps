using System.ComponentModel.DataAnnotations;
using DealerOps.Core.Audit.Dto;
using DealerOps.Core.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Audit;

/// <summary>
/// Audit reads: a record's history and the whole dealership's log for a manager, and the platform
/// log for the admin. Staff read no audit (AUD-17). All lists are newest first.
/// </summary>
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

    /// <summary>One record's history, manager only (AUD-06, AUD-17).</summary>
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

    /// <summary>The platform audit log, admin only (AUD-10).</summary>
    [HttpGet("/api/v1/admin/audit")]
    public PageResponse<AuditItem> Platform([FromQuery] AuditLogFilter filter,
        [FromQuery] int page = 0, [FromQuery] int size = 20)
    {
        return _service.ListPlatform(filter, page, size);
    }

    /// <summary>The caller's dealership audit log, manager only (AUD-11). A dealerId filter is ignored.</summary>
    [HttpGet("/api/v1/dealer/audit")]
    public PageResponse<AuditItem> Dealership([FromQuery] AuditLogFilter filter,
        [FromQuery] int page = 0, [FromQuery] int size = 20)
    {
        return _service.ListDealership(filter, page, size);
    }
}
