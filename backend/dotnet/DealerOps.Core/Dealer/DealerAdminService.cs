using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer.Dto;

namespace DealerOps.Core.Dealer;

/// <summary>
/// Dealership records: the platform admin creates, edits and deactivates any dealership, and a
/// manager edits their own dealership's profile (AUTH-27). Every change writes a DEALER audit row.
/// </summary>
public class DealerAdminService
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;
    private readonly ILogger<DealerAdminService> _logger;

    public DealerAdminService(AppDbContext db, IAuditService audit, ILogger<DealerAdminService> logger)
    {
        _db = db;
        _audit = audit;
        _logger = logger;
    }

    /// <summary>Admin dealership list, newest first, optionally filtered by legal name.</summary>
    public PageResponse<DealerResponse> List(string? q, int page, int size)
    {
        TenantGuard.RequireAdmin();
        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);
        IQueryable<DealerEntity> query = _db.Dealers;
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(d => d.LegalName.Contains(q.Trim()));

        var total = query.LongCount();
        var items = query.OrderByDescending(d => d.CreatedAt).ThenByDescending(d => d.Id)
            .Skip(p * s).Take(s).ToList().Select(ToResponse).ToList();
        return new PageResponse<DealerResponse>(items, p, s, total);
    }

    /// <summary>The admin creates an active dealership and records its profile in the audit row.</summary>
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
        _audit.Record("DEALER", dealer.Id, "CREATE", dealer.Id, TenantContext.ActorUsername(),
            new Dictionary<string, object>
            {
                ["legalName"] = dealer.LegalName,
                ["contactPhone"] = dealer.ContactPhone,
                ["contactEmail"] = dealer.ContactEmail,
                ["contactAddress"] = dealer.ContactAddress
            });
        _db.SaveChanges();
        tx.Commit();
        _logger.LogInformation("Dealer created dealerId={DealerId} by {Actor}", dealer.Id, TenantContext.ActorUsername());
        return ToResponse(dealer);
    }

    /// <summary>One dealership for the admin.</summary>
    public DealerResponse Get(long id)
    {
        TenantGuard.RequireAdmin();
        return ToResponse(Load(id));
    }

    /// <summary>The admin edits a dealership's profile and active status; inactive deactivates it.</summary>
    public DealerResponse Patch(long id, PatchDealerRequest body)
    {
        TenantGuard.RequireAdmin();
        var dealer = Load(id);
        ApplyProfile(dealer, body.Version, body.LegalName, body.ContactPhone, body.ContactEmail,
            body.ContactAddress, body.LogoDataUrl, body.Active);
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
        ApplyProfile(dealer, body.Version, body.LegalName, body.ContactPhone, body.ContactEmail,
            body.ContactAddress, body.LogoDataUrl, null);
        return ToResponse(dealer);
    }

    /// <summary>
    /// Applies a profile edit, records the DEALER UPDATE audit row and saves both together (AUD-07).
    /// Every changed field carries its old value in previous. The logo is recorded only as a flag (whether
    /// one is set); the image itself is never copied. A null active leaves it unchanged.
    /// </summary>
    private void ApplyProfile(DealerEntity dealer, int version, string legalName, string contactPhone,
        string contactEmail, string contactAddress, string? logoDataUrl, bool? active)
    {
        if (version != dealer.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

        var changed = new Dictionary<string, object>();
        var previous = new Dictionary<string, object?>();
        if (dealer.LegalName != legalName)
        {
            changed["legalName"] = legalName;
            previous["legalName"] = dealer.LegalName;
        }
        if (dealer.ContactPhone != contactPhone)
        {
            changed["contactPhone"] = contactPhone;
            previous["contactPhone"] = dealer.ContactPhone;
        }
        if (dealer.ContactEmail != contactEmail)
        {
            changed["contactEmail"] = contactEmail;
            previous["contactEmail"] = dealer.ContactEmail;
        }
        if (dealer.ContactAddress != contactAddress)
        {
            changed["contactAddress"] = contactAddress;
            previous["contactAddress"] = dealer.ContactAddress;
        }
        if (dealer.LogoDataUrl != logoDataUrl)
        {
            changed["logo"] = logoDataUrl != null;
            previous["logo"] = dealer.LogoDataUrl != null;
        }
        if (active != null && dealer.Active != active.Value)
        {
            changed["active"] = active.Value;
            previous["active"] = dealer.Active;
        }

        dealer.LegalName = legalName;
        dealer.ContactPhone = contactPhone;
        dealer.ContactEmail = contactEmail;
        dealer.ContactAddress = contactAddress;
        dealer.LogoDataUrl = logoDataUrl;
        if (active != null) dealer.Active = active.Value;

        _audit.Record("DEALER", dealer.Id, "UPDATE", dealer.Id, TenantContext.ActorUsername(), changed, previous);
        _db.SaveChanges();
        _logger.LogInformation("Dealer updated dealerId={DealerId} fields={Fields} by {Actor}",
            dealer.Id, string.Join(",", changed.Keys), TenantContext.ActorUsername());
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

}
