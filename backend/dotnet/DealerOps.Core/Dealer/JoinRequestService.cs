using DealerOps.Core.Audit;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer.Dto;
using DealerOps.Core.Notifications;

namespace DealerOps.Core.Dealer;

/// <summary>
/// Google join-request workflow (self-service onboarding). A Google user who has never been
/// bound to a dealership picks one on the sign-in screen; the request lands here and a manager
/// of that dealership approves or rejects it (AUTH-27); the new member joins as staff. Approval creates the membership
/// and clears <see cref="AppUserEntity.RequestedDealerId"/>; rejection just clears the field.
/// Scoped to the caller's tenant throughout, so one dealership's queue is never visible to
/// another.
/// </summary>
public class JoinRequestService
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;
    private readonly NotificationService _notifications;
    private readonly ILogger<JoinRequestService> _logger;

    public JoinRequestService(AppDbContext db, IAuditService audit, NotificationService notifications,
        ILogger<JoinRequestService> logger)
    {
        _db = db;
        _audit = audit;
        _notifications = notifications;
        _logger = logger;
    }

    /// <summary>
    /// Pending join requests for the caller's dealership (manager only), newest first.
    /// </summary>
    public List<JoinRequestResponse> List()
    {
        var tenant = TenantGuard.RequireManager().TenantDealerId!.Value;
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

    /// <summary>
    /// Approves a pending request (manager only): the applicant becomes active staff of the
    /// caller's dealership. Audits the membership and the account binding with its old values,
    /// and resolves the matching inbox notification, all in one transaction.
    /// </summary>
    public void Approve(string username)
    {
        var tenant = TenantGuard.RequireManager().TenantDealerId!.Value;
        var user = LoadRequest(tenant, username);

        // Same rule as the admin bind (AUTH-03): one login, one active dealership. The other
        // dealership is not named, because the approver is a dealer user, not the admin.
        if (_db.Memberships.Any(m => m.Username == username && m.Active && m.DealerId != tenant))
            throw Deny(user.Id, tenant, "already_active_elsewhere", "dup_member",
                new ApiException(ErrorCode.DupMember, $"'{username}' is already active staff at another dealership."));

        var membership = _db.Memberships
            .FirstOrDefault(m => m.DealerId == tenant && m.Username == username)
            ?? new MembershipEntity();

        membership.DealerId = tenant;
        membership.Username = username;
        membership.Active = true;
        membership.DealerRole = DealerRole.Staff;
        membership.CreatedBy = TenantContext.ActorUsername();

        // One transaction from the membership through its audit entry (AUD-07): the flush only
        // assigns the id, nothing is committed until every row below is written too.
        using var tx = _db.Database.CurrentTransaction is null ? _db.Database.BeginTransaction() : null;
        if (membership.Id == 0)
            _db.Memberships.Add(membership);
        _db.SaveChanges();

        user.DealerId = tenant;
        user.RequestedDealerId = null;
        _db.SaveChanges();

        _audit.Record("MEMBERSHIP", membership.Id, "CREATE", tenant, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["username"] = username, ["source"] = "join_request" });
        _audit.Record("APP_USER", user.Id, "UPDATE", tenant, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["dealerId"] = tenant },
            new Dictionary<string, object?> { ["dealerId"] = null, ["requestedDealerId"] = tenant });
        _db.SaveChanges();
        _notifications.ResolveByCorrelation(tenant, "JOIN_REQUEST", "username", username,
            "APPROVED", TenantContext.ActorUsername());
        tx?.Commit();
        _logger.LogInformation(
            "Join request approved username={Username} dealerId={DealerId} membershipId={MembershipId} by {Actor}",
            username, tenant, membership.Id, TenantContext.ActorUsername());
    }

    /// <summary>
    /// Rejects a pending request (manager only) by clearing the applicant's requested
    /// dealership; the audit row keeps the dealership it replaced.
    /// </summary>
    public void Reject(string username)
    {
        var tenant = TenantGuard.RequireManager().TenantDealerId!.Value;
        var user = LoadRequest(tenant, username);

        user.RequestedDealerId = null;
        _audit.Record("APP_USER", user.Id, "UPDATE", tenant, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["username"] = username, ["rejected"] = true },
            new Dictionary<string, object?> { ["requestedDealerId"] = tenant });
        _db.SaveChanges();
        _notifications.ResolveByCorrelation(tenant, "JOIN_REQUEST", "username", username,
            "REJECTED", TenantContext.ActorUsername());
        _logger.LogInformation("Join request rejected username={Username} dealerId={DealerId} by {Actor}",
            username, tenant, TenantContext.ActorUsername());
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
            throw Deny(user.Id, user.DealerId, "already_in_dealership", "forbidden",
                new ApiException(ErrorCode.Forbidden, "This account is already in a dealership."));
        if (user.RequestedDealerId is long existing && existing != dealerId)
            throw Deny(user.Id, existing, "already_requested", "validation",
                new ApiException(ErrorCode.Validation, "This account already requested a dealership."));
        if (!_db.Dealers.Any(d => d.Id == dealerId && d.Active))
            throw Deny(user.Id, dealerId, "dealer_not_found", "not_found",
                new ApiException(ErrorCode.NotFound, "Dealership not found."));
        if (user.RequestedDealerId != dealerId)
            SetRequested(user, dealerId);
        var name = _db.Dealers.Where(d => d.Id == dealerId).Select(d => d.LegalName).FirstOrDefault();
        return new MyJoinRequestResponse(dealerId, name);
    }

    // File() only reaches here while no request is pending, so the old value is always empty.
    // The row carries the requested dealership so it shows in that dealership's audit log.
    private void SetRequested(AppUserEntity user, long dealerId)
    {
        user.RequestedDealerId = dealerId;
        _audit.Record("APP_USER", user.Id, "UPDATE", dealerId, user.Username,
            new Dictionary<string, object> { ["requestedDealerId"] = dealerId },
            new Dictionary<string, object?> { ["requestedDealerId"] = null });
        _db.SaveChanges();
        _notifications.Create(dealerId, "JOIN_REQUEST", new
        {
            username = user.Username,
            displayName = user.DisplayName,
            email = user.Email
        });
        _logger.LogInformation("Join request filed username={Username} dealerId={DealerId}",
            user.Username, dealerId);
    }

    private AppUserEntity LoadCaller()
    {
        var username = TenantContext.ActorUsername();
        var dealerId = TenantContext.Get()?.TenantDealerId;
        if (string.IsNullOrWhiteSpace(username))
            throw Deny(null, dealerId, "missing_actor", "unauthorized",
                new ApiException(ErrorCode.Unauthorized, "Unauthorized"));
        var user = _db.AppUsers.FirstOrDefault(u => u.Username == username && u.Active)
            ?? throw Deny(null, dealerId, "account_not_found", "not_found",
                new ApiException(ErrorCode.NotFound, "Account not found."));
        if (user.Role == AppRole.PlatformAdmin)
            throw Deny(user.Id, user.DealerId ?? dealerId, "platform_admin", "forbidden",
                new ApiException(ErrorCode.Forbidden, "Forbidden"));
        return user;
    }

    private AppUserEntity LoadRequest(long tenant, string username)
    {
        var user = _db.AppUsers.FirstOrDefault(u =>
            u.Username == username && u.RequestedDealerId == tenant && u.DealerId == null && u.Active
            && u.Role == AppRole.DealerUser);
        if (user != null) return user;
        throw Deny(null, tenant, "request_not_found", "not_found",
            new ApiException(ErrorCode.NotFound, "Join request not found."));
    }

    // The filter writes the status and does not log, so each refusal is recorded here.
    // The client message is omitted.
    private ApiException Deny(long? userId, long? dealerId, string reason, string outcome, ApiException error)
    {
        _logger.LogWarning(
            "Join request refused userId={UserId} dealerId={DealerId} reason={Reason} outcome={Outcome}",
            userId, dealerId, reason, outcome);
        return error;
    }

}
