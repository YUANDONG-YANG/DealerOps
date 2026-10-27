using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer.Dto;
using DealerOps.Core.Notifications;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Dealer;

/// <summary>
/// Dealership staff memberships: the admin binds, unbinds, promotes and resets passwords for
/// staff, and a manager removes staff from their own dealership. Every change is audited on
/// MEMBERSHIP or APP_USER in the same unit of work as the change (AUD-07).
/// </summary>
public class MembershipService
{
    private readonly AppDbContext _db;
    private readonly NewAccountRules _accountRules;
    private readonly IAuditService _audit;
    private readonly NotificationService _notifications;
    private readonly ILogger<MembershipService> _logger;

    public MembershipService(AppDbContext db, NewAccountRules accountRules, IAuditService audit,
        NotificationService notifications, ILogger<MembershipService> logger)
    {
        _db = db;
        _accountRules = accountRules;
        _audit = audit;
        _notifications = notifications;
        _logger = logger;
    }

    /// <summary>
    /// Admin staff list of one dealership, active and unbound members alike, newest membership
    /// first. <paramref name="q"/> matches name, username, email or phone.
    /// </summary>
    public PageResponse<MemberResponse> List(long dealerId, string? q, int page, int size)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);

        var all = _db.Memberships
            .Where(m => m.DealerId == dealerId)
            .OrderByDescending(m => m.CreatedAt)
            .ThenByDescending(m => m.Id)
            .ToList()
            .Select(m =>
            {
                var user = _db.AppUsers.FirstOrDefault(u => u.Username == m.Username);
                return new MemberResponse(m.Username, user?.DisplayName ?? "", AppRole.DealerUser.Value, m.Active,
                    SignInMethod(user), user?.Email, user?.Phone, m.DealerRole);
            })
            .Where(item => Matches(item, q))
            .ToList();

        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);
        var from = Math.Min(p * s, all.Count);
        var to = Math.Min(from + s, all.Count);
        return new PageResponse<MemberResponse>(all.GetRange(from, to - from), p, s, all.Count);
    }

    private static ApiException DuplicateMember(string username, string message) =>
        new(ErrorCode.DupMember, message, new Dictionary<string, string> { ["username"] = message });

    /// <summary>
    /// Binds a login to the dealership as staff, creating the login first when the username is
    /// new. A login is active staff at one dealership at most (AUTH-03).
    /// </summary>
    /// <param name="dealerId">The dealership that gains the staff member.</param>
    /// <param name="body">The login to bind. A password is required only when the login is new, and it is never logged.</param>
    /// <returns>The bound member.</returns>
    /// <exception cref="ApiException">Forbidden when the caller is not the platform admin, NotFound when the dealership is missing, or a conflict when the login cannot be bound.</exception>
    public MemberResponse Add(long dealerId, CreateMemberRequest body)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);
        var username = body.Username.Trim();

        var existing = _db.AppUsers.FirstOrDefault(u => u.Username == username);
        if (existing != null && existing.Role == AppRole.PlatformAdmin)
        {
            _logger.LogWarning(
                "Member bind rejected dealerId={DealerId} username={Username} reason={Reason} outcome={Outcome} by {Actor}",
                dealerId, username, "platform_admin", "dup_member", TenantContext.ActorUsername());
            throw DuplicateMember(username,
                $"'{username}' is the platform admin account and cannot be dealership staff. Choose a different username.");
        }

        // Admin-only endpoint, so naming the other dealership reveals nothing across tenants and
        // tells the admin exactly where the login already lives (AUTH-03: one login, one dealership).
        var activeAt = _db.Memberships.Where(m => m.Username == username && m.Active)
            .Join(_db.Dealers, m => m.DealerId, d => d.Id, (m, d) => new { d.Id, d.LegalName })
            .FirstOrDefault();
        if (activeAt != null)
            throw DuplicateMember(username, activeAt.Id == dealerId
                ? $"'{username}' is already active staff at {activeAt.LegalName}. It is listed in this dealership's staff table."
                : $"'{username}' is already active staff at {activeAt.LegalName}. A login can belong to only one dealership: "
                  + $"choose a different username, or unbind '{username}' from {activeAt.LegalName} first.");

        NewAccountRules.Contact? contact = null;
        if (existing == null)
        {
            RequireNewUserFields(body);
            contact = _accountRules.CanonicalContact(body.Email, body.Phone);
            _accountRules.RequireAvailable(username, body.DisplayName!.Trim(), contact);
        }

        var membership = _db.Memberships
            .FirstOrDefault(m => m.DealerId == dealerId && m.Username == username)
            ?? new MembershipEntity();

        membership.DealerId = dealerId;
        membership.Username = username;
        membership.Active = true;
        // Every bind starts as staff; the admin promotes managers separately (AUTH-26).
        membership.DealerRole = DealerRole.Staff;
        membership.CreatedBy = TenantContext.ActorUsername();

        // One transaction from the membership row through its audit entry (AUD-07): the flush
        // below only assigns the id, so nothing is committed until the audit row is written too.
        using var tx = _db.Database.CurrentTransaction is null ? _db.Database.BeginTransaction() : null;

        if (membership.Id == 0)
            _db.Memberships.Add(membership);
        _db.SaveChanges();

        AppUserEntity user;
        Dictionary<string, object?>? previousLogin = null;
        if (existing == null)
        {
            user = new AppUserEntity
            {
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password!),
                DisplayName = body.DisplayName!.Trim(),
                Email = contact!.Email,
                Phone = contact.Phone,
                Role = AppRole.DealerUser,
                DealerId = dealerId,
                Active = true
            };
            _db.AppUsers.Add(user);
        }
        else
        {
            user = existing;
            previousLogin = new Dictionary<string, object?>
            {
                ["dealerId"] = user.DealerId, ["active"] = user.Active, ["requestedDealerId"] = user.RequestedDealerId
            };
            user.Role = AppRole.DealerUser;
            user.DealerId = dealerId;
            user.Active = true;
            // An admin bind settles any pending join request, so it cannot resurface in that
            // dealership's queue after a later unbind.
            if (user.RequestedDealerId is { } requested)
            {
                user.RequestedDealerId = null;
                _notifications.ResolveByCorrelation(requested, "JOIN_REQUEST", "username", username,
                    requested == dealerId ? "APPROVED" : "CANCELLED", TenantContext.ActorUsername());
            }
        }

        try { _db.SaveChanges(); }
        catch (DbUpdateException ex) { ThrowConflict(ex, dealerId, user.Id); }

        // First creation of the login (AUTH-22). The actor is the new username. The password
        // is never written into the summary. The membership row below stays as well.
        if (existing == null)
            _audit.Record("APP_USER", user.Id, "CREATE", null, username,
                new Dictionary<string, object> { ["username"] = username, ["registration"] = "admin" });
        else
            // An existing login is moved into this dealership: record the account-level change too.
            _audit.Record("APP_USER", user.Id, "UPDATE", dealerId, TenantContext.ActorUsername(),
                new Dictionary<string, object>
                {
                    ["username"] = username, ["dealerId"] = dealerId, ["active"] = true, ["requestedDealerId"] = ""
                },
                previousLogin);

        _audit.Record("MEMBERSHIP", membership.Id, "CREATE", dealerId, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["username"] = username, ["dealerRole"] = EnumWireName.Of(membership.DealerRole) });
        _db.SaveChanges();
        tx?.Commit();
        _logger.LogInformation("Member bound dealerId={DealerId} username={Username} newLogin={NewLogin} by {Actor}",
            dealerId, username, existing == null, TenantContext.ActorUsername());

        return new MemberResponse(membership.Username, user.DisplayName, AppRole.DealerUser.Value, membership.Active,
            SignInMethod(user), user.Email, user.Phone, membership.DealerRole);
    }

    /// <summary>Only the platform admin promotes staff to manager or demotes a manager (AUTH-26).</summary>
    public void SetRole(long dealerId, string username, DealerRole role)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);
        var membership = ActiveMembership(dealerId, username);
        if (membership.DealerRole == role) return;
        var previousRole = membership.DealerRole;
        membership.DealerRole = role;
        _audit.Record("MEMBERSHIP", membership.Id, "UPDATE", dealerId, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["username"] = username, ["dealerRole"] = EnumWireName.Of(role) },
            new Dictionary<string, object?> { ["dealerRole"] = EnumWireName.Of(previousRole) });
        _db.SaveChanges();
        _logger.LogInformation("Member role changed dealerId={DealerId} username={Username} from {PreviousRole} to {Role} by {Actor}",
            dealerId, username, EnumWireName.Of(previousRole), EnumWireName.Of(role), TenantContext.ActorUsername());
    }

    /// <summary>
    /// Sets a new password for an active staff member who forgot theirs. Only accounts with a
    /// DealerOps password qualify: Google and Firebase accounts sign in with a password that
    /// lives at that provider, so the person must reset it there.
    /// </summary>
    /// <param name="dealerId">The dealership whose staff member is updated.</param>
    /// <param name="username">The staff login. The new password is never logged.</param>
    /// <param name="body">The replacement password.</param>
    /// <exception cref="ApiException">Forbidden when the caller is not the platform admin, NotFound when the member is missing, or Validation when the account has no DealerOps password.</exception>
    public void ResetPassword(long dealerId, string username, ResetMemberPasswordRequest body)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);

        ActiveMembership(dealerId, username);
        var user = _db.AppUsers.FirstOrDefault(u => u.Username == username && u.Active)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");

        var method = SignInMethod(user);
        if (method != "password")
        {
            _logger.LogWarning(
                "Password reset rejected dealerId={DealerId} username={Username} reason={Reason} outcome={Outcome} by {Actor}",
                dealerId, username, "external_provider", "validation", TenantContext.ActorUsername());
            var provider = method == "firebase" ? "Firebase" : "Google";
            var message = $"'{username}' signs in with {provider}, so the password is managed by {provider}, "
                          + $"not DealerOps. Ask them to use the {provider} password recovery for their email.";
            throw new ApiException(ErrorCode.Validation, message,
                new Dictionary<string, string> { ["password"] = message });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password);
        // The password itself is never written to the audit trail.
        _audit.Record("APP_USER", user.Id, "UPDATE", dealerId, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["username"] = username, ["passwordReset"] = true });
        _db.SaveChanges();
        _logger.LogInformation("Member password reset dealerId={DealerId} username={Username} by {Actor}",
            dealerId, username, TenantContext.ActorUsername());
    }

    /// <summary>
    /// How the account signs in. A Google or Firebase sign-in linked to an account that already
    /// had a DealerOps password still counts as <c>password</c>: that password keeps working.
    /// </summary>
    private static string SignInMethod(AppUserEntity? user) =>
        !string.IsNullOrEmpty(user?.PasswordHash) ? "password"
        : user?.FirebaseUid != null ? "firebase"
        : "google";

    /// <summary>Admin soft unbind of any member, staff or manager, from the dealership.</summary>
    public void Remove(long dealerId, string username)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);
        Unbind(dealerId, username);
    }

    /// <summary>
    /// A manager removes a staff member from their own dealership (AUTH-27); same soft unbind as
    /// the admin. Managers, the caller included, are removed only by the admin.
    /// </summary>
    public void RemoveFromOwnDealership(string username)
    {
        var tenant = TenantGuard.RequireManager().TenantDealerId!.Value;
        if (ActiveMembership(tenant, username).DealerRole != DealerRole.Staff)
        {
            _logger.LogWarning("Manager removal rejected dealerId={DealerId} username={Username} by {Actor}",
                tenant, username, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.Forbidden, "Only the platform admin can remove a manager.");
        }
        Unbind(tenant, username);
    }

    /// <summary>
    /// Soft unbind: the membership row stays for history with <c>active = false</c> and the login
    /// loses its dealership.
    /// </summary>
    private void Unbind(long dealerId, string username)
    {
        var membership = ActiveMembership(dealerId, username);

        membership.Active = false;

        var user = _db.AppUsers.FirstOrDefault(u => u.Username == username);
        if (user != null)
            user.DealerId = null;

        _audit.Record("MEMBERSHIP", membership.Id, "UPDATE", dealerId, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["username"] = username, ["unbound"] = true },
            new Dictionary<string, object?> { ["unbound"] = false });
        _db.SaveChanges();
        _logger.LogInformation("Member unbound dealerId={DealerId} username={Username} by {Actor}",
            dealerId, username, TenantContext.ActorUsername());
    }

    /// <summary>
    /// Admin queue of active dealer-user logins with no active membership, newest account first.
    /// </summary>
    public PageResponse<PendingUserResponse> Pending(string? q, int page, int size)
    {
        TenantGuard.RequireAdmin();
        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);

        var query = _db.AppUsers
            .Where(u => u.Role == AppRole.DealerUser && u.Active)
            .Where(u => !_db.Memberships.Any(m => m.Username == u.Username && m.Active));

        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.Trim();
            query = query.Where(u =>
                u.Username.Contains(needle) ||
                u.DisplayName.Contains(needle));
        }

        query = query.OrderByDescending(u => u.CreatedAt).ThenByDescending(u => u.Id);

        var total = query.LongCount();
        var items = query.Skip(p * s).Take(s)
            .AsEnumerable()
            .Select(u => new PendingUserResponse(u.Username, u.DisplayName, u.Email, u.Phone,
                DateTime.SpecifyKind(u.CreatedAt, DateTimeKind.Utc)))
            .ToList();

        return new PageResponse<PendingUserResponse>(items, p, s, total);
    }

    // A duplicate key is an expected conflict. Any other save failure is still returned as a
    // conflict, so it is logged here. The database message can contain an email or phone, so
    // only the exception type is recorded.
    private void ThrowConflict(DbUpdateException ex, long dealerId, long userId)
    {
        if (!DuplicateKey.Is(ex))
            _logger.LogError(
                "Member save failed userId={UserId} dealerId={DealerId} reason={Reason} outcome={Outcome}",
                userId, dealerId, ex.InnerException?.GetType().Name ?? ex.GetType().Name, "error");
        throw _accountRules.Conflict(ex);
    }

    private static void RequireNewUserFields(CreateMemberRequest body)
    {
        var missing = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(body.DisplayName))
            missing["displayName"] = "Full name is required for a new user.";
        if (string.IsNullOrWhiteSpace(body.Password))
            missing["password"] = "Password is required for a new user.";
        if (missing.Count > 0)
            throw new ApiException(ErrorCode.Validation, missing.Values.First(), missing);
    }

    private MembershipEntity ActiveMembership(long dealerId, string username) =>
        _db.Memberships.FirstOrDefault(m => m.DealerId == dealerId && m.Username == username && m.Active)
        ?? throw new ApiException(ErrorCode.NotFound, "Not found");

    private void RequireDealer(long dealerId)
    {
        if (!_db.Dealers.Any(d => d.Id == dealerId))
            throw new ApiException(ErrorCode.NotFound, "Not found");
    }

    private static bool Matches(MemberResponse item, string? q)
    {
        if (string.IsNullOrWhiteSpace(q)) return true;
        var needle = q.Trim().ToLowerInvariant();
        return (item.DisplayName ?? "").ToLowerInvariant().Contains(needle)
               || (item.Username ?? "").ToLowerInvariant().Contains(needle)
               || (item.Email ?? "").ToLowerInvariant().Contains(needle)
               || (item.Phone ?? "").Contains(needle);
    }

}
