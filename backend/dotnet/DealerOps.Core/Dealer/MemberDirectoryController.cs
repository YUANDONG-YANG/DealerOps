using DealerOps.Core.Dealer.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Dealer;

[ApiController]
[Authorize]
public class MemberDirectoryController : ControllerBase
{
    private readonly MemberDirectoryService _memberDirectoryService;

    public MemberDirectoryController(MemberDirectoryService memberDirectoryService)
    {
        _memberDirectoryService = memberDirectoryService;
    }

    [HttpGet("api/v1/members")]
    public List<MemberOption> List() => _memberDirectoryService.ActiveMembers();
}
