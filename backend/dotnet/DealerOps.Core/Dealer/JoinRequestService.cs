using DealerOps.Core.Audit;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer.Dto;
using DealerOps.Core.Notifications;

namespace DealerOps.Core.Dealer;

/// <summary>
/// Google join-request workflow (self-service onboarding). A Google user who has never been
/// bound to a dealership picks one on the sign-in screen; the request lands here and any
/// active member of that dealership can approve or reject it. Approval creates the membership
/// and clears <see cref="AppUserEntity.RequestedDealerId"/>; rejection just clears the field.
/// Scoped to the caller's tenant throughout, so one dealership's queue is never visible to
/// another.
/// </summary>
public class JoinRequestService
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;
    private readonly NotificationService _notifications;

    public JoinRequestService(AppDbContext db, IAuditService audit, NotificationService notifications)
    {
        _db = db;
        _audit = audit;
        _notifications = notifications;
    }

    public List<JoinRequestResponse> List()
    {
        var tenant = TenantGuard.RequireTenantId();
        return _db.AppUsers
            .Where(u => u.RequestedDealerId == tenant && u.DealerId == null && u.Active)
            .OrderByDescending(u => u.CreatedAt).ThenByDescending(u => u.Id)
            .Select(u => new JoinRequestResponse(u.Username, u.DisplayName, u.Email, u.CreatedAt))
            .ToList();
    }

    public void Approve(string username)
    {
        var tenant = TenantGuard.RequireTenantId();
        var user = LoadRequest(tenant, username);

        var membership = _db.Memberships
            .FirstOrDefault(m => m.DealerId == tenant && m.Username == username)
            ?? new MembershipEntity();

        membership.DealerId = tenant;
        membership.Username = username;
        membership.Active = true;
        membership.CreatedBy = ActorUsername();

        // One transaction from the membership through its audit entry (AUD-07): the flush only
        // assigns the id, nothing is committed until every row below is written too.
        using var tx = _db.Database.CurrentTransaction is null ? _db.Database.BeginTransaction() : null;
        if (membership.Id == 0)
            _db.Memberships.Add(membership);
        _db.SaveChanges();

        user.DealerId = tenant;
        user.RequestedDealerId = null;
        _db.SaveChanges();

        _audit.Record("MEMBERSHIP", membership.Id, "CREATE", tenant, ActorUsername(),
            new Dictionary<string, object> { ["username"] = username, ["source"] = "google_request" });
        _db.SaveChanges();
        _notifications.ResolveByCorrelation(tenant, "JOIN_REQUEST", "username", username,
            "APPROVED", ActorUsername());
        tx?.Commit();
    }

    public void Reject(string username)
    {
        var tenant = TenantGuard.RequireTenantId();
        var user = LoadRequest(tenant, username);

        user.RequestedDealerId = null;
        _audit.Record("APP_USER", user.Id, "UPDATE", tenant, ActorUsername(),
            new Dictionary<string, object> { ["username"] = username, ["rejected"] = true });
        _db.SaveChanges();
        _notifications.ResolveByCorrelation(tenant, "JOIN_REQUEST", "username", username,
            "REJECTED", ActorUsername());
    }

    private AppUserEntity LoadRequest(long tenant, string username) =>
        _db.AppUsers.FirstOrDefault(u =>
            u.Username == username && u.RequestedDealerId == tenant && u.DealerId == null && u.Active)
        ?? throw new ApiException(ErrorCode.NotFound, "Join request not found.");

    private static string ActorUsername() => TenantContext.Get()?.Username ?? "";
}
