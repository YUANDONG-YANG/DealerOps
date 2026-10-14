using DealerOps.Core.Compliance.Dto;
using DealerOps.Core.Integration.Dto;

namespace DealerOps.Core.Integration;

public interface IAiGatewayClient
{
    Task<List<AiNote>> AdCheckAsync(AdCheckInternalRequest body);
    Task<string> AssistantAsync(AssistantInternalRequest body);
}
