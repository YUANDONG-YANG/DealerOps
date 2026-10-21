using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer.Dto;

namespace DealerOps.Core.Dealer;

public class DealerAdminService
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public DealerAdminService(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public PageResponse<DealerResponse> List(string? q, int page, int size)
    {
        TenantGuard.RequireAdmin();
        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);
        IQueryable<DealerEntity> query = _db.Dealers.OrderByDescending(d => d.CreatedAt);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(d => d.LegalName.Contains(q.Trim()));

        var total = query.LongCount();
        var items = query.Skip(p * s).Take(s).ToList().Select(ToResponse).ToList();
        return new PageResponse<DealerResponse>(items, p, s, total);
    }

    public DealerResponse Create(CreateDealerRequest body)
    {
        TenantGuard.RequireAdmin();
        var dealer = new DealerEntity
        {
            LegalName = body.LegalName.Trim(),
            ContactPhone = body.ContactPhone.Trim(),
            ContactEmail = body.ContactEmail.Trim(),
            ContactAddress = body.ContactAddress.Trim(),
            Active = true
        };
        using var tx = _db.Database.BeginTransaction();
        _db.Dealers.Add(dealer);
        _db.SaveChanges();
        _audit.Record("DEALER", dealer.Id, "CREATE", dealer.Id, ActorUsername(),
            new Dictionary<string, object>
            {
                ["legalName"] = dealer.LegalName,
                ["contactPhone"] = dealer.ContactPhone,
                ["contactEmail"] = dealer.ContactEmail,
                ["contactAddress"] = dealer.ContactAddress
            });
        _db.SaveChanges();
        tx.Commit();
        return ToResponse(dealer);
    }

    public DealerResponse Get(long id)
    {
        TenantGuard.RequireAdmin();
        return ToResponse(Load(id));
    }

    public DealerResponse Patch(long id, PatchDealerRequest body)
    {
        TenantGuard.RequireAdmin();
        var dealer = Load(id);
        var changed = ApplyProfile(dealer, body.Version, body.LegalName, body.ContactPhone, body.ContactEmail,
            body.ContactAddress, body.LogoDataUrl);
        if (dealer.Active != body.Active) changed["active"] = body.Active;
        dealer.Active = body.Active;

        _audit.Record("DEALER", dealer.Id, "UPDATE", dealer.Id, ActorUsername(), changed);
        _db.SaveChanges();
        return ToResponse(dealer);
    }

    /// <summary>The caller's own dealership, for its managers' profile form (AUTH-27).</summary>
    public DealerResponse GetOwn() => ToResponse(Load(TenantGuard.RequireManager().TenantDealerId!.Value));

    /// <summary>
    /// A manager edits their own dealership's profile (AUTH-27). Active status stays with the admin.
    /// The profile feeds the ad compliance check, the bill of sale and the buyer site.
    /// </summary>
    public DealerResponse PatchOwn(PatchDealerProfileRequest body)
    {
        var dealer = Load(TenantGuard.RequireManager().TenantDealerId!.Value);
        var changed = ApplyProfile(dealer, body.Version, body.LegalName, body.ContactPhone, body.ContactEmail,
            body.ContactAddress, body.LogoDataUrl);

        _audit.Record("DEALER", dealer.Id, "UPDATE", dealer.Id, ActorUsername(), changed);
        _db.SaveChanges();
        return ToResponse(dealer);
    }

    private static Dictionary<string, object> ApplyProfile(DealerEntity dealer, int version, string legalName,
        string contactPhone, string contactEmail, string contactAddress, string? logoDataUrl)
    {
        if (version != dealer.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

        var changed = new Dictionary<string, object>();
        if (dealer.LegalName != legalName) changed["legalName"] = legalName;
        if (dealer.ContactPhone != contactPhone) changed["contactPhone"] = contactPhone;
        if (dealer.ContactEmail != contactEmail) changed["contactEmail"] = contactEmail;
        if (dealer.ContactAddress != contactAddress) changed["contactAddress"] = contactAddress;

        dealer.LegalName = legalName;
        dealer.ContactPhone = contactPhone;
        dealer.ContactEmail = contactEmail;
        dealer.ContactAddress = contactAddress;
        dealer.LogoDataUrl = logoDataUrl;
        return changed;
    }

    private DealerEntity Load(long id) =>
        _db.Dealers.Find(id) ?? throw new ApiException(ErrorCode.NotFound, "Not found");

    private DealerResponse ToResponse(DealerEntity dealer)
    {
        var staffCount = _db.Memberships.LongCount(m => m.DealerId == dealer.Id && m.Active);
        return new DealerResponse(
            dealer.Id, dealer.LegalName, dealer.ContactPhone, dealer.ContactEmail,
            dealer.ContactAddress, dealer.LogoDataUrl, dealer.Active, staffCount, dealer.Version);
    }

    private static string ActorUsername() => TenantContext.Get()?.Username ?? "";
}
