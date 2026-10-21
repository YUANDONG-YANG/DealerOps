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

    /// <summary>Lists pending logins, newest account first.</summary>
    [HttpGet("api/v1/admin/pending-users")]
    public PageResponse<PendingUserResponse> List(
        [FromQuery] string? q = null,
        [FromQuery] int page = 0,
        [FromQuery] int size = 10) =>
        _membershipService.Pending(q, page, size);
}
