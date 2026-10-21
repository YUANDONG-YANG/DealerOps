using DealerOps.Core.Common;
using DealerOps.Core.Dealer.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Dealer;

/// <summary>Platform admin dealership management: list, create, read and edit or deactivate.</summary>
[ApiController]
[Route("api/v1/admin/dealers")]
[Authorize]
public class AdminDealerController : ControllerBase
{
    private readonly DealerAdminService _dealerAdminService;

    public AdminDealerController(DealerAdminService dealerAdminService)
    {
        _dealerAdminService = dealerAdminService;
    }

    /// <summary>Dealerships, newest first, optionally filtered by legal name.</summary>
    [HttpGet]
    public PageResponse<DealerResponse> List(
        [FromQuery] string? q = null,
        [FromQuery] int page = 0,
        [FromQuery] int size = 10) =>
        _dealerAdminService.List(q, page, size);

    /// <summary>Creates an active dealership.</summary>
    [HttpPost]
    [ProducesResponseType(201)]
    public IActionResult Create([FromBody] CreateDealerRequest request) =>
        StatusCode(201, _dealerAdminService.Create(request));

    /// <summary>One dealership.</summary>
    [HttpGet("{id}")]
    public DealerResponse Get(long id) => _dealerAdminService.Get(id);

    /// <summary>Edits a dealership's profile and active status.</summary>
    [HttpPatch("{id}")]
    public DealerResponse Patch(long id, [FromBody] PatchDealerRequest body) =>
        _dealerAdminService.Patch(id, body);
}
