using DealerOps.Core.Common;
using DealerOps.Core.Dealer.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Dealer;

/// <summary>Platform admin management of one dealership's members.</summary>
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

    /// <summary>
    /// Binds an existing or new login directly as the dealership's first owner while it has no
    /// active owner (201, the member); otherwise files a join request for the owner to approve (202).
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(MemberResponse), 201)]
    [ProducesResponseType(typeof(JoinRequestSentResponse), 202)]
    public IActionResult Add(long id, [FromBody] CreateMemberRequest body)
    {
        var result = _membershipService.Add(id, body);
        return result.Member != null ? StatusCode(201, result.Member) : StatusCode(202, result.JoinRequest);
    }

    /// <summary>Sets a new DealerOps password for an active member.</summary>
    [HttpPut("{username}/password")]
    public IActionResult ResetPassword(long id, string username, [FromBody] ResetMemberPasswordRequest body)
    {
        _membershipService.ResetPassword(id, username, body);
        return NoContent();
    }

    /// <summary>Sets a member to OWNER, MANAGER or SALES; the platform admin is the only caller that can set OWNER.</summary>
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

    /// <summary>Edits a member's sign-in email and phone.</summary>
    [HttpPatch("{username}")]
    public MemberResponse UpdateContact(long id, string username, [FromBody] PatchMemberContactRequest body) =>
        _membershipService.UpdateContact(id, username, body);

    /// <summary>Soft-deletes a member's account.</summary>
    [HttpDelete("{username}/account")]
    public IActionResult DeleteAccount(long id, string username)
    {
        _membershipService.DeleteAccount(id, username);
        return NoContent();
    }
}
