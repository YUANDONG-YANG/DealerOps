using DealerOps.Core.Assistant.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Assistant;

/// <summary>Read-only AI assistant for dealer users: answers questions about the dealership's records.</summary>
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

    /// <summary>
    /// Answers a question with up to five resource cards and an AI summary; counts are computed
    /// from the database. When the AI call fails the cards still return with summaryAvailable false.
    /// </summary>
    [HttpPost("ask")]
    public AskResponse Ask([FromBody] AskRequest body)
    {
        return _assistantService.Ask(body);
    }
}
