using DealerOps.Core.Common;
using DealerOps.Core.Lead.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Lead;

/// <summary>Sales lead endpoints for dealer users; all business rules and auditing live in <see cref="LeadService"/>.</summary>
[ApiController]
[Route("api/v1/leads")]
[Authorize]
public class LeadController : ControllerBase
{
    private readonly LeadService _service;

    public LeadController(LeadService service)
    {
        _service = service;
    }

    /// <summary>Sales funnel report: counts per stage, win rate and monthly stage history.</summary>
    [HttpGet("report/funnel")]
    public SalesFunnelReport Funnel() => _service.Funnel();

    /// <summary>Filtered page of leads, newest first unless <c>sort=field,asc|desc</c> names a column.</summary>
    [HttpGet]
    public PageResponse<LeadListItem> List(
        [FromQuery] string? q,
        [FromQuery] string? vehicle,
        [FromQuery] LeadStage? stage,
        [FromQuery] string? owner,
        [FromQuery] long? customerId,
        [FromQuery] long? vehicleId,
        [FromQuery] bool? overdue,
        [FromQuery] string? sort,
        [FromQuery] int page = 0,
        [FromQuery] int size = 10)
    {
        return _service.List(q, vehicle, stage, owner, customerId, vehicleId, overdue, sort, page, size);
    }

    /// <summary>Creates a lead; returns 201 with the lead detail.</summary>
    [HttpPost]
    [ProducesResponseType(201)]
    public IActionResult Create([FromBody] CreateLeadRequest body)
    {
        return StatusCode(201, _service.Create(body));
    }

    /// <summary>One lead with its notes, newest first.</summary>
    [HttpGet("{id}")]
    public LeadDetail Get(long id) => _service.Get(id);

    /// <summary>Updates an open lead (optimistic locking via version).</summary>
    [HttpPatch("{id}")]
    public LeadDetail Patch(long id, [FromBody] PatchLeadRequest body)
    {
        return _service.Patch(id, body);
    }

    /// <summary>Reopens a won or lost lead to an open stage (L4).</summary>
    [HttpPost("{id}/reopen")]
    public LeadDetail Reopen(long id, [FromBody] ReopenLeadRequest body)
    {
        return _service.Reopen(id, body);
    }

    /// <summary>Adds a note to a lead; returns 201 with the note.</summary>
    [HttpPost("{id}/notes")]
    [ProducesResponseType(201)]
    public IActionResult AddNote(long id, [FromBody] AddLeadNoteRequest body)
    {
        return StatusCode(201, _service.AddNote(id, body));
    }
}
