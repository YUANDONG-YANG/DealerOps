using DealerOps.Core.Common;
using DealerOps.Core.Dealer.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Dealer;

/// <summary>Platform admin management of one dealership's staff.</summary>
[ApiController]
[Route("api/v1/admin/dealers/{id}/members")]
[Authorize]
public class AdminMemberController : ControllerBase
{
    private readonly MembershipService _membershipService;

    public AdminMemberController(MembershipService membershipService)
    {
        _membershipService = membershipService;
    }

    /// <summary>Lists the dealership's members, newest membership first.</summary>
    [HttpGet]
    public PageResponse<MemberResponse> List(
        long id,
        [FromQuery] string? q = null,
        [FromQuery] int page = 0,
        [FromQuery] int size = 10) =>
        _membershipService.List(id, q, page, size);

    /// <summary>Binds an existing or new login to the dealership as staff.</summary>
    [HttpPost]
    [ProducesResponseType(201)]
    public IActionResult Add(long id, [FromBody] CreateMemberRequest body) =>
        StatusCode(201, _membershipService.Add(id, body));

    /// <summary>Sets a new DealerOps password for an active member.</summary>
    [HttpPut("{username}/password")]
    public IActionResult ResetPassword(long id, string username, [FromBody] ResetMemberPasswordRequest body)
    {
        _membershipService.ResetPassword(id, username, body);
        return NoContent();
    }

    /// <summary>Promotes staff to manager or demotes a manager.</summary>
    [HttpPut("{username}/role")]
    public IActionResult SetRole(long id, string username, [FromBody] SetDealerRoleRequest body)
    {
        _membershipService.SetRole(id, username, body.DealerRole!.Value);
        return NoContent();
    }

    /// <summary>Soft-unbinds a member from the dealership.</summary>
    [HttpDelete("{username}")]
    public IActionResult Remove(long id, string username)
    {
        _membershipService.Remove(id, username);
        return NoContent();
    }
}
