using DealerOps.Core.Common;
using DealerOps.Core.Dealer.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Dealer;

/// <summary>Platform admin view of dealer-user logins that belong to no dealership yet.</summary>
[ApiController]
[Authorize]
public class AdminPendingUserController : ControllerBase
{
    private readonly MembershipService _membershipService;

    public AdminPendingUserController(MembershipService membershipService)
    {
        _membershipService = membershipService;
    }

    /// <summary>Lists pending logins, newest account first unless <c>sort=createdAt,asc|desc</c> is given.</summary>
    [HttpGet("api/v1/admin/pending-users")]
    public PageResponse<PendingUserResponse> List(
        [FromQuery] string? q = null,
        [FromQuery] int page = 0,
        [FromQuery] int size = 10,
        [FromQuery] string? sort = null) =>
        _membershipService.Pending(q, page, size, sort);

    /// <summary>Edits a pending login's username, email and phone.</summary>
    [HttpPatch("api/v1/admin/pending-users/{username}")]
    public PendingUserResponse Update(string username, [FromBody] UpdatePendingUserRequest body) =>
        _membershipService.UpdatePending(username, body);

    /// <summary>Soft-deletes a pending login.</summary>
    [HttpDelete("api/v1/admin/pending-users/{username}")]
    public IActionResult Delete(string username)
    {
        _membershipService.DeletePending(username);
        return NoContent();
    }
}
