using DealerOps.Core.Compliance.Dto;
using DealerOps.Core.Integration.Dto;

namespace DealerOps.Core.Integration;

/// <summary>Server-side client of the internal AI service routes. Every failure throws <see cref="AiCallFailed"/>.</summary>
public interface IAiGatewayClient
{
    /// <summary>Runs the AI ad check and returns its notes.</summary>
    Task<List<AiNote>> AdCheckAsync(AdCheckInternalRequest body);

    /// <summary>Asks the AI service to summarize the retrieved resources for a question.</summary>
    Task<string> AssistantAsync(AssistantInternalRequest body);
}
