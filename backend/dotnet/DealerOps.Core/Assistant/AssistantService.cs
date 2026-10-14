using System.Text.RegularExpressions;
using DealerOps.Core.Assistant.Dto;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Integration;
using DealerOps.Core.Integration.Dto;

namespace DealerOps.Core.Assistant;

public class AssistantService
{
    private static readonly Regex IdReference = new(
        @"(?:\b(vehicle|customer|listing)\s*(?:id\s*)?[:#]?\s*|\bid\s*[:#]?\s*|#\s*)(\d+)(?!\d)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

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

        try
        {
            var summary = _aiGatewayClient.AssistantAsync(
                new AssistantInternalRequest(
                    body.Text,
                    cards.Select(c => new ResourceRef(c.Kind, c.Id, c.Label, c.Status)).ToList()))
                .GetAwaiter().GetResult();

            var referenced = ReferencedCards(summary, cards);
            return new AskResponse(summary, true, referenced.Count == 0 ? cards : referenced);
        }
        catch (AiCallFailed)
        {
            return new AskResponse(null, false, cards);
        }
    }

    private static List<ResourceCard> ReferencedCards(string summary, List<ResourceCard> cards)
    {
        var kindIds = new HashSet<string>();
        var bareIds = new HashSet<string>();

        foreach (Match m in IdReference.Matches(summary))
        {
            if (m.Groups[1].Success)
                kindIds.Add(m.Groups[1].Value.ToUpperInvariant() + ":" + m.Groups[2].Value);
            else
                bareIds.Add(m.Groups[2].Value);
        }

        return cards.Where(c => c.Id != null && c.Kind != null)
            .Where(c =>
                kindIds.Contains(c.Kind + ":" + c.Id) ||
                (bareIds.Contains(c.Id.ToString()!) &&
                 cards.Count(other => c.Id.Equals(other.Id)) == 1))
            .ToList();
    }
}
