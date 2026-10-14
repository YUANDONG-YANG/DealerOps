using DealerOps.Core.Common;
using DealerOps.Core.Lead.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Lead;

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

    [HttpGet]
    public PageResponse<LeadListItem> List(
        [FromQuery] string? q,
        [FromQuery] LeadStage? stage,
        [FromQuery] string? owner,
        [FromQuery] long? customerId,
        [FromQuery] bool? overdue,
        [FromQuery] int page = 0,
        [FromQuery] int size = 10)
    {
        return _service.List(q, stage, owner, customerId, overdue, page, size);
    }

    [HttpPost]
    [ProducesResponseType(201)]
    public IActionResult Create([FromBody] CreateLeadRequest body)
    {
        return StatusCode(201, _service.Create(body));
    }

    [HttpGet("{id}")]
    public LeadDetail Get(long id) => _service.Get(id);

    [HttpPatch("{id}")]
    public LeadDetail Patch(long id, [FromBody] PatchLeadRequest body)
    {
        return _service.Patch(id, body);
    }

    [HttpPost("{id}/notes")]
    [ProducesResponseType(201)]
    public IActionResult AddNote(long id, [FromBody] AddLeadNoteRequest body)
    {
        return StatusCode(201, _service.AddNote(id, body));
    }
}
