using DealerOps.Core.Dealer.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Dealer;

/// <summary>
/// Dealer-user endpoints for approving or rejecting Google join requests. The service enforces
/// that the queue belongs to the caller's own dealership, so cross-tenant access is impossible
/// even though both routes live under the shared /api/v1 prefix.
/// </summary>
[ApiController]
[Route("api/v1/dealer/join-requests")]
[Authorize]
public class JoinRequestController : ControllerBase
{
    private readonly JoinRequestService _service;

    public JoinRequestController(JoinRequestService service) { _service = service; }

    /// <summary>Pending join requests for the caller's dealership, newest first.</summary>
    [HttpGet]
    public List<JoinRequestResponse> List() => _service.List();

    /// <summary>Approves a pending request; the applicant joins as staff.</summary>
    [HttpPost("{username}/approve")]
    public IActionResult Approve(string username)
    {
        _service.Approve(username);
        return NoContent();
    }

    /// <summary>Rejects a pending request and clears the applicant's requested dealership.</summary>
    [HttpPost("{username}/reject")]
    public IActionResult Reject(string username)
    {
        _service.Reject(username);
        return NoContent();
    }
}
