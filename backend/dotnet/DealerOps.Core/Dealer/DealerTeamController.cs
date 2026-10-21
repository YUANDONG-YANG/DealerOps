using DealerOps.Core.Dealer.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Dealer;

/// <summary>
/// The caller's own dealership: its profile and its staff (AUTH-27). Every route needs the
/// MANAGER dealer role. The tenant comes from the caller's membership, never from the route.
/// </summary>
[ApiController]
[Route("api/v1/dealer")]
[Authorize]
public class DealerTeamController : ControllerBase
{
    private readonly DealerAdminService _dealers;
    private readonly MembershipService _memberships;

    public DealerTeamController(DealerAdminService dealers, MembershipService memberships)
    {
        _dealers = dealers;
        _memberships = memberships;
    }

    /// <summary>The caller's dealership profile.</summary>
    [HttpGet("profile")]
    public DealerResponse Profile() => _dealers.GetOwn();

    /// <summary>Edits the caller's dealership profile; active status stays with the admin.</summary>
    [HttpPatch("profile")]
    public DealerResponse PatchProfile([FromBody] PatchDealerProfileRequest body) => _dealers.PatchOwn(body);

    /// <summary>Removes a staff member from the caller's dealership.</summary>
    [HttpDelete("members/{username}")]
    public IActionResult RemoveMember(string username)
    {
        _memberships.RemoveFromOwnDealership(username);
        return NoContent();
    }
}
