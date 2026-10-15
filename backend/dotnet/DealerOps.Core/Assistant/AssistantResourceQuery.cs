using System.Text.RegularExpressions;
using DealerOps.Core.Assistant.Dto;
using DealerOps.Core.Compliance;
using DealerOps.Core.Customer;
using DealerOps.Core.Data;
using DealerOps.Core.Listing;
using DealerOps.Core.Vehicle;

namespace DealerOps.Core.Assistant;

public class AssistantResourceQuery
{
    private static readonly Regex InStockRx = new(@"\bin[ -]stock\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex SoldRx = new(@"\bsold\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex CustomerWord = new(@"\bcustomers?\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex ListingWord = new(@"\b(?:listings?|ads?|advertis\w*|compliance|check|blocked|passed|stale)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
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
        var listingQuestion = ListingWord.IsMatch(question);
        VehicleStatus? status = InStockRx.IsMatch(question) ? VehicleStatus.InStock
            : SoldRx.IsMatch(question) ? VehicleStatus.Sold : null;

        var q = InStockRx.Replace(question, " ");
        q = SoldRx.Replace(q, " ");
        q = Filler.Replace(Punctuation.Replace(q, " "), " ");

        var terms = SearchTerms(q);
        var cards = new List<ResourceCard>();

        if (!customerQuestion && !listingQuestion)
        {
            IQueryable<VehicleEntity> vq = _db.Vehicles
                .Where(v => v.DealerId == tenantDealerId);
            if (status != null)
                vq = vq.Where(v => v.Status == status);
            foreach (var term in terms.Where(t => t.Length > 0))
            {
                var t = term;
                vq = vq.Where(v =>
                    v.Vin.Contains(t) || v.Make.Contains(t) || v.Model.Contains(t)
                    || v.ModelYear.ToString() == t);
            }

            foreach (var v in vq.Take(5).ToList())
            {
                cards.Add(new ResourceCard("VEHICLE", v.Id,
                    $"{v.ModelYear} {v.Make} {v.Model}", v.Status.ToString(), null, null));
            }
        }

        if (customerQuestion || (status == null && !listingQuestion && cards.Count < 5))
        {
            IQueryable<CustomerEntity> cq = _db.Customers
                .Where(c => c.DealerId == tenantDealerId);
            foreach (var term in terms.Where(t => t.Length > 0))
            {
                var t = term;
                cq = cq.Where(c => c.Name.Contains(t));
            }

            foreach (var c in cq.Take(5 - cards.Count).ToList())
            {
                cards.Add(new ResourceCard("CUSTOMER", c.Id, c.Name, null, null, null));
            }
        }

        if (listingQuestion || cards.Count < 5)
        {
            var remaining = 5 - cards.Count;
            if (remaining > 0)
            {
                var lq = from l in _db.Listings
                         join v in _db.Vehicles on l.VehicleId equals v.Id
                         where l.DealerId == tenantDealerId
                         select new { l, v };

                foreach (var term in terms.Where(t => t.Length > 0))
                {
                    var t = term;
                    lq = lq.Where(x =>
                        x.l.Title.Contains(t) || x.v.Make.Contains(t) || x.v.Model.Contains(t)
                        || x.v.Vin.Contains(t));
                }

                foreach (var x in lq.Take(remaining).ToList())
                {
                    var lastCheck = x.l.LastCheckId != null
                        ? _db.ComplianceChecks.Find(x.l.LastCheckId)
                        : null;
                    var checkStatus = _checkStatusMapper.Derive(x.l, lastCheck);
                    cards.Add(new ResourceCard("LISTING", x.l.Id,
                        string.IsNullOrWhiteSpace(x.l.Title) ? $"{x.v.ModelYear} {x.v.Make} {x.v.Model}" : x.l.Title,
                        null, x.v.Id, checkStatus));
                }
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
