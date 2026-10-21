using DealerOps.Core.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Catalog;

/// <summary>
/// Public dealer directory used by the Google sign-in "pick your dealership" step. Returns only
/// id and legal name — anything else belongs to the admin surface. The id and legal name are
/// already shown in public ad listings, so exposing them here is not new disclosure.
/// </summary>
[ApiController]
[Route("api/v1/catalog")]
public class PublicDealerController : ControllerBase
{
    private readonly AppDbContext _db;

    public PublicDealerController(AppDbContext db) { _db = db; }

    /// <summary>Active dealerships as id and legal name, alphabetical (a picker order, not a record list).</summary>
    [HttpGet("dealers")]
    [AllowAnonymous]
    public Task<List<PublicDealerOption>> Dealers() =>
        _db.Dealers
            .Where(d => d.Active)
            .OrderBy(d => d.LegalName)
            .Select(d => new PublicDealerOption(d.Id, d.LegalName))
            .ToListAsync();
}

/// <summary>One entry of the public dealer directory.</summary>
public record PublicDealerOption(long Id, string LegalName);
