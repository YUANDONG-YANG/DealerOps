using System.Text.RegularExpressions;
using DealerOps.Core.Assistant.Dto;
using DealerOps.Core.Compliance;
using DealerOps.Core.Data;
using DealerOps.Core.Vehicle;

namespace DealerOps.Core.Assistant;

public class AssistantResourceQuery
{
    private static readonly Regex InStockRx = new(@"\bin[ -]stock\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex SoldRx = new(@"\bsold\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex CustomerWord = new(@"\bcustomers?\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex Filler = new(
        @"\b(?:which|what|who|how|many|show|find|list|search|for|me|the|a|an|all|any|are|is|our|here|please|do|does|we|you|have|has|got|in|of|with|named|called|there|vehicles?|cars?|customers?)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex Punctuation = new(@"[?!,;:""\(\)]", RegexOptions.Compiled);

    private readonly AppDbContext _db;
    private readonly CheckStatusMapper _checkStatusMapper;

    public AssistantResourceQuery(AppDbContext db, CheckStatusMapper checkStatusMapper)
    {
        _db = db;
        _checkStatusMapper = checkStatusMapper;
    }

    public List<ResourceCard> Load(long tenantDealerId, string? text)
    {
        var question = text?.Trim() ?? "";
        var customerQuestion = CustomerWord.IsMatch(question);
        VehicleStatus? status = InStockRx.IsMatch(question) ? VehicleStatus.IN_STOCK
            : SoldRx.IsMatch(question) ? VehicleStatus.SOLD : null;

        var q = InStockRx.Replace(question, " ");
        q = SoldRx.Replace(q, " ");
        q = Filler.Replace(Punctuation.Replace(q, " "), " ");

        var terms = SearchTerms(q);
        var cards = new List<ResourceCard>();

        if (!customerQuestion)
        {
            var vehicles = _db.Vehicles
                .Where(v => v.DealerId == tenantDealerId)
                .Where(v => status == null || v.Status == status)
                .Take(5).ToList();

            foreach (var v in vehicles.Where(v => cards.Count < 5))
            {
                cards.Add(new ResourceCard("VEHICLE", v.Id,
                    $"{v.ModelYear} {v.Make} {v.Model}", v.Status.ToString(), null, null));
            }
        }

        if (customerQuestion || status == null)
        {
            var customers = _db.Customers
                .Where(c => c.DealerId == tenantDealerId)
                .Take(5).ToList();

            foreach (var c in customers.Where(_ => cards.Count < 5))
            {
                cards.Add(new ResourceCard("CUSTOMER", c.Id, c.Name, null, null, null));
            }
        }

        return cards.Count <= 5 ? cards : cards.Take(5).ToList();
    }

    private static List<string> SearchTerms(string q)
    {
        var terms = q.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(w => w.TrimEnd('.'))
            .Where(w => w.Length >= 2)
            .Distinct()
            .Take(5)
            .ToList();
        return terms.Count == 0 ? [""] : terms;
    }
}
