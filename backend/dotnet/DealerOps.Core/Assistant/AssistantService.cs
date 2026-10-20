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
            return new AskResponse(count.Summary, true, CardsNamedBy(count.Summary, cards), count);

        try
        {
            var summary = _aiGatewayClient.AssistantAsync(
                new AssistantInternalRequest(
                    body.Text,
                    // An ad carries its check status in the status field the model sees.
                    cards.Select(c => new ResourceRef(c.Kind, c.Id, c.Label, c.Status ?? c.CheckStatus)).ToList()))
                .GetAwaiter().GetResult();

            return new AskResponse(summary, true, CardsNamedBy(summary, cards));
        }
        catch (AiCallFailed)
        {
            // Retrieval already succeeded. Return those cards and do not write anything (AI-03).
            return new AskResponse(null, false, cards.Take(5).ToList());
        }
    }

    /// <summary>
    /// When the summary names retrieved ids (#12, id 12, vehicle 12), keep only those cards.
    /// A bare number is not a reference. When it names none, keep the retrieval list. At most five.
    /// </summary>
    private static List<ResourceCard> CardsNamedBy(string? summary, List<ResourceCard> cards)
    {
        var capped = cards.Take(5).ToList();
        if (string.IsNullOrWhiteSpace(summary) || capped.Count == 0) return capped;

        var named = capped.Where(card => card.Id != null && SummaryNames(summary, card)).ToList();
        return named.Count > 0 ? named : capped;
    }

    private static bool SummaryNames(string summary, ResourceCard card)
    {
        var id = card.Id!.Value.ToString();
        var kind = card.Kind.ToLowerInvariant();
        var patterns = new[]
        {
            $@"#\s*{id}\b",
            $@"\bid\s+{id}\b",
            $@"\b{kind}\s+(?:id\s+)?{id}\b",
        };
        return patterns.Any(pattern => System.Text.RegularExpressions.Regex.IsMatch(
            summary, pattern, System.Text.RegularExpressions.RegexOptions.IgnoreCase));
    }
}
