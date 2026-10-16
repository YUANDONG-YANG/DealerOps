using System.Text.RegularExpressions;
using DealerOps.Core.Assistant.Dto;
using DealerOps.Core.Compliance;
using DealerOps.Core.Customer;
using DealerOps.Core.Data;
using DealerOps.Core.Listing;
using DealerOps.Core.Vehicle;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Assistant;

public class AssistantResourceQuery
{
    private const int MaxCards = 5;
    private const int MaxTerms = 5;

    private static readonly Regex InStockRx = new(@"\bin[ -]stock\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex SoldRx = new(@"\bsold\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex UnsoldRx = new(@"\bunsold\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex CountRx = new(@"\b(?:how many|count|total|number of|quantity)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex VehicleWord = new(@"\b(?:vehicles?|cars?|inventory|stock|vin)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex CustomerWord = new(@"\b(?:customers?|clients?|buyers?|owners?)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex ListingWord = new(@"\b(?:listings?|ads?|advertis\w*|compliance|checks?|blocked|passed|stale|needs?|ai|unavailable)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex Filler = new(
        @"\b(?:which|what|who|how|many|show|find|list|search|for|me|the|a|an|all|any|are|is|our|here|please|do|does|we|you|have|has|got|in|of|with|named|called|there)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex Punctuation = new(@"[?!,;:""\(\)]", RegexOptions.Compiled);
    private static readonly char[] WordSeparators = [' ', '\t', '\r', '\n'];

    private readonly AppDbContext _db;
    private readonly CheckStatusMapper _checkStatusMapper;

    public AssistantResourceQuery(AppDbContext db, CheckStatusMapper checkStatusMapper)
    {
        _db = db;
        _checkStatusMapper = checkStatusMapper;
    }

    /// <summary>
    /// Read-only keyword retrieval over this dealer's vehicles, customers and ads.
    /// Returns at most five cards and never exposes purchase cost or customer contact data.
    /// </summary>
    public List<ResourceCard> Load(long tenantDealerId, string? text)
    {
        var question = Punctuation.Replace(text?.Trim() ?? "", " ");
        VehicleStatus? status = InStockRx.IsMatch(question) ? VehicleStatus.InStock
            : SoldRx.IsMatch(question) ? VehicleStatus.Sold : null;

        var q = InStockRx.Replace(question, " ");
        q = SoldRx.Replace(q, " ");

        // Words naming a record type steer the ranking only; they are never searched for.
        var vehicleAsked = status != null || VehicleWord.IsMatch(q);
        var customerAsked = CustomerWord.IsMatch(q);
        var listingAsked = ListingWord.IsMatch(q);

        q = VehicleWord.Replace(q, " ");
        q = CustomerWord.Replace(q, " ");
        q = ListingWord.Replace(q, " ");
        q = Filler.Replace(q, " ");

        var terms = SearchTerms(q);
        if (terms.Count == 0)
        {
            // Nothing to search for: return no cards so the answer can ask for a make, VIN or customer name.
            return [];
        }

        var groups = new List<(int Rank, List<ResourceCard> Cards)>
        {
            (vehicleAsked ? 0 : 1, VehicleCards(tenantDealerId, status, terms)),
            (customerAsked ? 0 : 1, CustomerCards(tenantDealerId, terms)),
            (listingAsked ? 0 : 1, ListingCards(tenantDealerId, terms))
        };

        // Record types the question points at come first, but every type that matched
        // keeps one slot so an ad question still shows the vehicle behind it.
        var ranked = groups.OrderBy(g => g.Rank).Select(g => g.Cards).ToList();
        var cards = new List<ResourceCard>();

        foreach (var group in ranked.Where(g => g.Count > 0))
        {
            if (cards.Count == MaxCards) break;
            cards.Add(group[0]);
        }

        foreach (var card in ranked.SelectMany(g => g.Skip(1)))
        {
            if (cards.Count == MaxCards) break;
            cards.Add(card);
        }

        return cards;
    }

    /// <summary>
    /// Computes aggregate answers from the complete, tenant-scoped query instead of
    /// asking the model to count the deliberately truncated resource cards.
    /// </summary>
    public CountResult? Count(long tenantDealerId, string? text)
    {
        var question = Punctuation.Replace(text?.Trim() ?? "", " ");
        if (!CountRx.IsMatch(question)) return null;

        var vehicleStatus = InStockRx.IsMatch(question) || UnsoldRx.IsMatch(question)
            ? VehicleStatus.InStock
            : SoldRx.IsMatch(question) ? VehicleStatus.Sold : (VehicleStatus?)null;
        var checkStatus = CheckStatus(question);
        var vehicleAsked = vehicleStatus != null || VehicleWord.IsMatch(question);
        var customerAsked = CustomerWord.IsMatch(question);
        var listingAsked = checkStatus != null || ListingWord.IsMatch(question);

        // “How many are there?” is intentionally not guessed. The user must name
        // the resource type so a count cannot silently report the wrong dataset.
        if (!vehicleAsked && !customerAsked && !listingAsked) return null;

        var q = question;
        q = InStockRx.Replace(q, " ");
        q = UnsoldRx.Replace(q, " ");
        q = SoldRx.Replace(q, " ");
        q = CountRx.Replace(q, " ");
        q = VehicleWord.Replace(q, " ");
        q = CustomerWord.Replace(q, " ");
        q = ListingWord.Replace(q, " ");
        q = Filler.Replace(q, " ");
        var terms = SearchTerms(q);

        if (vehicleAsked && !customerAsked && !listingAsked)
        {
            IQueryable<VehicleEntity> query = _db.Vehicles.AsNoTracking()
                .Where(v => v.DealerId == tenantDealerId);
            if (vehicleStatus != null) query = query.Where(v => v.Status == vehicleStatus);
            query = ApplyVehicleTerms(query, terms);
            var count = query.Count();
            var (singular, plural) = vehicleStatus == VehicleStatus.InStock
                ? ("vehicle in stock", "vehicles in stock")
                : vehicleStatus == VehicleStatus.Sold ? ("sold vehicle", "sold vehicles")
                : ("vehicle", "vehicles");
            return new CountResult(count, singular, plural);
        }

        if (customerAsked && !listingAsked && !vehicleAsked)
        {
            IQueryable<CustomerEntity> query = _db.Customers.AsNoTracking()
                .Where(c => c.DealerId == tenantDealerId);
            foreach (var term in terms)
            {
                var t = term;
                query = query.Where(c => c.Name.Contains(t));
            }
            var (singular, plural) = terms.Count == 0
                ? ("customer", "customers") : ("matching customer", "matching customers");
            return new CountResult(query.Count(), singular, plural);
        }

        if (listingAsked && !customerAsked && !vehicleAsked)
        {
            var rows = ListingRows(tenantDealerId, terms);
            var count = checkStatus == null
                ? rows.Count
                : rows.Count(x => _checkStatusMapper.Derive(x.l, x.check) == checkStatus);
            var (singular, plural) = checkStatus == null
                ? ("listing", "listings") : ($"{checkStatus} listing", $"{checkStatus} listings");
            return new CountResult(count, singular, plural);
        }

        return null;
    }

    private List<ResourceCard> VehicleCards(long tenantDealerId, VehicleStatus? status, List<string> terms)
    {
        IQueryable<VehicleEntity> vq = _db.Vehicles.AsNoTracking()
            .Where(v => v.DealerId == tenantDealerId);
        if (status != null)
            vq = vq.Where(v => v.Status == status);
        vq = ApplyVehicleTerms(vq, terms);

        // Purchase cost and repair cost are deliberately left off the card.
        return vq.Take(MaxCards).ToList()
            .Select(v => new ResourceCard("VEHICLE", v.Id,
                $"{v.ModelYear} {v.Make} {v.Model}", v.Status.ToString(), null, null))
            .ToList();
    }

    private List<ResourceCard> CustomerCards(long tenantDealerId, List<string> terms)
    {
        IQueryable<CustomerEntity> cq = _db.Customers.AsNoTracking()
            .Where(c => c.DealerId == tenantDealerId);
        foreach (var term in terms)
        {
            var t = term;
            cq = cq.Where(c => c.Name.Contains(t));
        }

        // A customer card carries the name and id only: never phone, email or home address.
        return cq.Take(MaxCards).ToList()
            .Select(c => new ResourceCard("CUSTOMER", c.Id, c.Name, null, null, null))
            .ToList();
    }

    private List<ResourceCard> ListingCards(long tenantDealerId, List<string> terms)
    {
        var rows = ListingRows(tenantDealerId, terms).Take(MaxCards).ToList();

        return rows.Select(x =>
        {
            var label = string.IsNullOrWhiteSpace(x.l.Title)
                ? $"{x.v.ModelYear} {x.v.Make} {x.v.Model}"
                : x.l.Title;
            return new ResourceCard("LISTING", x.l.Id, label, null, x.v.Id,
                _checkStatusMapper.Derive(x.l, x.check));
        }).ToList();
    }

    private IQueryable<VehicleEntity> ApplyVehicleTerms(IQueryable<VehicleEntity> query, List<string> terms)
    {
        foreach (var term in terms)
        {
            var t = term;
            query = query.Where(v =>
                v.Vin.Contains(t) || v.Make.Contains(t) || v.Model.Contains(t)
                || v.ModelYear.ToString() == t);
        }
        return query;
    }

    private List<(ListingEntity l, VehicleEntity v, ComplianceCheckEntity? check)> ListingRows(long tenantDealerId, List<string> terms)
    {
        var lq = from l in _db.Listings.AsNoTracking()
                 join v in _db.Vehicles.AsNoTracking() on l.VehicleId equals v.Id
                 where l.DealerId == tenantDealerId
                 select new { l, v };
        foreach (var term in terms)
        {
            var t = term;
            lq = lq.Where(x => x.l.Title.Contains(t) || x.v.Make.Contains(t)
                || x.v.Model.Contains(t) || x.v.Vin.Contains(t));
        }
        var rows = lq.ToList();
        var checkIds = rows.Where(x => x.l.LastCheckId != null).Select(x => x.l.LastCheckId!.Value).Distinct().ToList();
        var checks = checkIds.Count == 0 ? new Dictionary<long, ComplianceCheckEntity>()
            : _db.ComplianceChecks.AsNoTracking().Where(c => checkIds.Contains(c.Id)).ToDictionary(c => c.Id);
        return rows.Select(x =>
        {
            checks.TryGetValue(x.l.LastCheckId ?? 0, out var check);
            return (x.l, x.v, check);
        }).ToList();
    }

    private static string? CheckStatus(string question)
    {
        if (Regex.IsMatch(question, @"\bblocked\b", RegexOptions.IgnoreCase)) return CheckStatusMapper.Blocked;
        if (Regex.IsMatch(question, @"\bpassed\b", RegexOptions.IgnoreCase)) return CheckStatusMapper.Passed;
        if (Regex.IsMatch(question, @"\bstale\b", RegexOptions.IgnoreCase)) return CheckStatusMapper.Stale;
        if (Regex.IsMatch(question, @"\bneeds?\s+ai\b", RegexOptions.IgnoreCase)) return CheckStatusMapper.NeedsAi;
        if (Regex.IsMatch(question, @"\bai[ -]unavailable\b", RegexOptions.IgnoreCase)) return CheckStatusMapper.AiUnavailable;
        return null;
    }

    private static List<string> SearchTerms(string q)
    {
        return q.Split(WordSeparators, StringSplitOptions.RemoveEmptyEntries)
            .Select(w => w.TrimEnd('.'))
            .Where(w => w.Length >= 2)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(MaxTerms)
            .ToList();
    }
}

public record CountResult(int Count, string SingularLabel, string PluralLabel)
{
    public string Summary => $"There {(Count == 1 ? "is" : "are")} {Count} {(Count == 1 ? SingularLabel : PluralLabel)}.";
}
