using DealerOps.Core.Assistant.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Assistant;

[ApiController]
[Route("api/v1/assistant")]
[Authorize]
public class AssistantController : ControllerBase
{
    private readonly AssistantService _assistantService;

    public AssistantController(AssistantService assistantService)
    {
        _assistantService = assistantService;
    }

    [HttpPost("ask")]
    public AskResponse Ask([FromBody] AskRequest body)
    {
        return _assistantService.Ask(body);
    }
}
