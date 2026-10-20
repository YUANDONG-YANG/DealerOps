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
        var users = _db.AppUsers
            .Where(u => u.RequestedDealerId == tenant && u.DealerId == null && u.Active && u.Role == AppRole.DealerUser)
            .OrderByDescending(u => u.CreatedAt).ThenByDescending(u => u.Id)
            .ToList();
        var sources = AccountSource.For(_db, users.Select(u => u.Username));
        return users
            .Select(u => new JoinRequestResponse(u.Username, u.DisplayName, u.Email, u.CreatedAt,
                sources.GetValueOrDefault(u.Username)))
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
            new Dictionary<string, object> { ["username"] = username, ["source"] = "join_request" });
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

    /// <summary>
    /// The signed-in unbound account's pending request, if it has filed one.
    /// </summary>
    public MyJoinRequestResponse? Current()
    {
        var user = LoadCaller();
        if (user.RequestedDealerId is not long dealerId) return null;
        var name = _db.Dealers.Where(d => d.Id == dealerId).Select(d => d.LegalName).FirstOrDefault();
        return new MyJoinRequestResponse(dealerId, name);
    }

    /// <summary>
    /// An unbound account asks to join one active dealership (AUTH-25). A second, different
    /// dealership is refused; repeating the same request is a no-op.
    /// </summary>
    public MyJoinRequestResponse File(long dealerId)
    {
        var user = LoadCaller();
        if (user.DealerId != null)
            throw new ApiException(ErrorCode.Forbidden, "This account is already in a dealership.");
        if (user.RequestedDealerId is long existing && existing != dealerId)
            throw new ApiException(ErrorCode.Validation, "This account already requested a dealership.");
        if (!_db.Dealers.Any(d => d.Id == dealerId && d.Active))
            throw new ApiException(ErrorCode.NotFound, "Dealership not found.");
        if (user.RequestedDealerId != dealerId)
            SetRequested(user, dealerId);
        var name = _db.Dealers.Where(d => d.Id == dealerId).Select(d => d.LegalName).FirstOrDefault();
        return new MyJoinRequestResponse(dealerId, name);
    }

    private void SetRequested(AppUserEntity user, long dealerId)
    {
        user.RequestedDealerId = dealerId;
        _audit.Record("APP_USER", user.Id, "UPDATE", null, user.Username,
            new Dictionary<string, object> { ["requestedDealerId"] = dealerId });
        _db.SaveChanges();
        _notifications.Create(dealerId, "JOIN_REQUEST", new
        {
            username = user.Username,
            displayName = user.DisplayName,
            email = user.Email
        });
    }

    private AppUserEntity LoadCaller()
    {
        var username = ActorUsername();
        if (string.IsNullOrWhiteSpace(username))
            throw new ApiException(ErrorCode.Unauthorized, "Unauthorized");
        var user = _db.AppUsers.FirstOrDefault(u => u.Username == username && u.Active)
            ?? throw new ApiException(ErrorCode.NotFound, "Account not found.");
        if (user.Role == AppRole.PlatformAdmin)
            throw new ApiException(ErrorCode.Forbidden, "Forbidden");
        return user;
    }

    private AppUserEntity LoadRequest(long tenant, string username) =>
        _db.AppUsers.FirstOrDefault(u =>
            u.Username == username && u.RequestedDealerId == tenant && u.DealerId == null && u.Active
            && u.Role == AppRole.DealerUser)
        ?? throw new ApiException(ErrorCode.NotFound, "Join request not found.");

    private static string ActorUsername() => TenantContext.Get()?.Username ?? "";
}
