using DealerOps.Core.Assistant.Dto;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Integration;
using DealerOps.Core.Integration.Dto;

namespace DealerOps.Core.Assistant;

public class AssistantService
{
    private readonly AssistantResourceQuery _resourceQuery;
    private readonly IAiGatewayClient _aiGatewayClient;

    public AssistantService(AssistantResourceQuery resourceQuery, IAiGatewayClient aiGatewayClient)
    {
        _resourceQuery = resourceQuery;
        _aiGatewayClient = aiGatewayClient;
    }

    public AskResponse Ask(AskRequest body)
    {
        TenantGuard.RequireDealerUser();
        var tenant = TenantGuard.RequireTenantId();
        var cards = _resourceQuery.Load(tenant, body.Text);
        var count = _resourceQuery.Count(tenant, body.Text);
        if (count != null)
        {
            return new AskResponse(count.Summary, true, cards, count);
        }

        try
        {
            var summary = _aiGatewayClient.AssistantAsync(
                new AssistantInternalRequest(
                    body.Text,
                    // An ad carries its check status in the status field the model sees.
                    cards.Select(c => new ResourceRef(c.Kind, c.Id, c.Label, c.Status ?? c.CheckStatus)).ToList()))
                .GetAwaiter().GetResult();

            // The model writes the prose only: the retrieved cards are always returned,
            // whether or not the reply mentions them.
            return new AskResponse(summary, true, cards);
        }
        catch (AiCallFailed)
        {
            return new AskResponse(null, false, cards);
        }
    }
}
