using DealerOps.Core.Data;
using DealerOps.Core.Dealer;
using DealerOps.Core.Vehicle;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Catalog;

/// <summary>
/// Public dealer directory used by the Google sign-in "pick your dealership" step and the buyer
/// site. Returns only id, legal name, the buyer-site slug derived from it, whether a logo is
/// published at the public logo route, and the in-stock and sold vehicle counts the buyer site
/// shows on each card — anything else belongs to the admin surface. The id and legal name are already shown in public ad listings,
/// so exposing them here is not new disclosure.
/// </summary>
[ApiController]
[Route("api/v1/catalog")]
public class PublicDealerController : ControllerBase
{
    private readonly AppDbContext _db;

    public PublicDealerController(AppDbContext db) { _db = db; }

    /// <summary>Active dealerships with slug, logo flag and vehicle counts, alphabetical (a picker order, not a record list).</summary>
    [HttpGet("dealers")]
    [AllowAnonymous]
    public async Task<List<PublicDealerOption>> Dealers()
    {
        var dealers = await _db.Dealers
            .Where(d => d.Active)
            .OrderBy(d => d.LegalName)
            .Select(d => new { d.Id, d.LegalName, HasLogo = d.LogoDataUrl != null })
            .ToListAsync();
        var slugs = DealerSlug.Assign(dealers.Select(d => (d.Id, d.LegalName)));
        // Counts span every dealership, so the tenant filter is bypassed; deleted vehicles are left out.
        var counts = await _db.Vehicles.IgnoreQueryFilters()
            .Where(v => v.DeletedAt == null && v.DealerId != null)
            .GroupBy(v => new { v.DealerId, v.Status })
            .Select(g => new { g.Key.DealerId, g.Key.Status, Count = g.Count() })
            .ToListAsync();
        int CountOf(long id, VehicleStatus status) =>
            counts.Where(c => c.DealerId == id && c.Status == status).Sum(c => c.Count);
        return dealers.Select(d => new PublicDealerOption(d.Id, d.LegalName, slugs[d.Id], d.HasLogo,
            CountOf(d.Id, VehicleStatus.InStock), CountOf(d.Id, VehicleStatus.Sold))).ToList();
    }
}

/// <summary>
/// One entry of the public dealer directory; <c>Slug</c> names it in the buyer-site URL and
/// <c>HasLogo</c> says whether <c>GET /api/v1/public/dealers/{id}/logo</c> returns an image.
/// <c>InStockCount</c> and <c>SoldCount</c> count the dealership's vehicles that are not deleted.
/// </summary>
public record PublicDealerOption(long Id, string LegalName, string Slug, bool HasLogo, int InStockCount, int SoldCount);
