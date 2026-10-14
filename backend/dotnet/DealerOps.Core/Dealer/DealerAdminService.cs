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
            LegalName = body.LegalName,
            ContactPhone = body.ContactPhone,
            ContactEmail = body.ContactEmail,
            ContactAddress = body.ContactAddress,
            Active = true
        };
        _db.Dealers.Add(dealer);
        _db.SaveChanges();

        _audit.Record("DEALER", dealer.Id, "CREATE", dealer.Id, ActorUsername(),
            new Dictionary<string, object> { ["legalNameChanged"] = true });
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
        if (body.Version != dealer.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

        dealer.LegalName = body.LegalName;
        dealer.ContactPhone = body.ContactPhone;
        dealer.ContactEmail = body.ContactEmail;
        dealer.ContactAddress = body.ContactAddress;
        dealer.Active = body.Active;
        dealer.LogoDataUrl = body.LogoDataUrl;
        _db.SaveChanges();

        _audit.Record("DEALER", dealer.Id, "UPDATE", dealer.Id, ActorUsername(),
            new Dictionary<string, object> { ["contactFieldsChanged"] = true });
        return ToResponse(dealer);
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
