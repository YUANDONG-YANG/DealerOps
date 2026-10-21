using DealerOps.Core.Dealer.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Dealer;

/// <summary>Active staff of the caller's dealership, for assignee pickers.</summary>
[ApiController]
[Authorize]
public class MemberDirectoryController : ControllerBase
{
    private readonly MemberDirectoryService _memberDirectoryService;

    public MemberDirectoryController(MemberDirectoryService memberDirectoryService)
    {
        _memberDirectoryService = memberDirectoryService;
    }

    /// <summary>Lists the active members alphabetically by username.</summary>
    [HttpGet("api/v1/members")]
    public List<MemberOption> List() => _memberDirectoryService.ActiveMembers();
}
