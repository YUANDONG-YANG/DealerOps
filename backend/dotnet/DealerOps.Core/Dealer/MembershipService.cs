using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer.Dto;
using DealerOps.Core.Notifications;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Dealer;

public class MembershipService
{
    private readonly AppDbContext _db;
    private readonly NewAccountRules _accountRules;
    private readonly IAuditService _audit;
    private readonly NotificationService _notifications;

    public MembershipService(AppDbContext db, NewAccountRules accountRules, IAuditService audit,
        NotificationService notifications)
    {
        _db = db;
        _accountRules = accountRules;
        _audit = audit;
        _notifications = notifications;
    }

    public PageResponse<MemberResponse> List(long dealerId, string? q, int page, int size)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);

        var all = _db.Memberships
            .Where(m => m.DealerId == dealerId)
            .OrderBy(m => m.Username)
            .ToList()
            .Select(m =>
            {
                var user = _db.AppUsers.FirstOrDefault(u => u.Username == m.Username);
                return new MemberResponse(m.Username, user?.DisplayName ?? "", AppRole.DealerUser.Value, m.Active,
                    SignInMethod(user));
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

    public MemberResponse Add(long dealerId, CreateMemberRequest body)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);
        var username = body.Username.Trim();

        var existing = _db.AppUsers.FirstOrDefault(u => u.Username == username);
        if (existing != null && existing.Role == AppRole.PlatformAdmin)
            throw DuplicateMember(username,
                $"'{username}' is the platform admin account and cannot be dealership staff. Choose a different username.");

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
        membership.CreatedBy = ActorUsername();

        // One transaction from the membership row through its audit entry (AUD-07): the flush
        // below only assigns the id, so nothing is committed until the audit row is written too.
        using var tx = _db.Database.CurrentTransaction is null ? _db.Database.BeginTransaction() : null;

        if (membership.Id == 0)
            _db.Memberships.Add(membership);
        _db.SaveChanges();

        AppUserEntity user;
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
            user.Role = AppRole.DealerUser;
            user.DealerId = dealerId;
            user.Active = true;
            // An admin bind settles any pending join request, so it cannot resurface in that
            // dealership's queue after a later unbind.
            if (user.RequestedDealerId is { } requested)
            {
                user.RequestedDealerId = null;
                _notifications.ResolveByCorrelation(requested, "JOIN_REQUEST", "username", username,
                    requested == dealerId ? "APPROVED" : "CANCELLED", ActorUsername());
            }
        }

        try { _db.SaveChanges(); }
        catch (DbUpdateException ex) { throw _accountRules.Conflict(ex); }

        _audit.Record("MEMBERSHIP", membership.Id, "CREATE", dealerId, ActorUsername(),
            new Dictionary<string, object> { ["username"] = username });
        _db.SaveChanges();
        tx?.Commit();

        return new MemberResponse(membership.Username, user.DisplayName, AppRole.DealerUser.Value, membership.Active,
            SignInMethod(user));
    }

    /// <summary>
    /// Sets a new password for an active staff member who forgot theirs. Only accounts with a
    /// DealerOps password qualify: Google and Firebase accounts sign in with a password that
    /// lives at that provider, so the person must reset it there.
    /// </summary>
    public void ResetPassword(long dealerId, string username, ResetMemberPasswordRequest body)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);

        if (!_db.Memberships.Any(m => m.DealerId == dealerId && m.Username == username && m.Active))
            throw new ApiException(ErrorCode.NotFound, "Not found");
        var user = _db.AppUsers.FirstOrDefault(u => u.Username == username && u.Active)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");

        var method = SignInMethod(user);
        if (method != "password")
        {
            var provider = method == "firebase" ? "Firebase" : "Google";
            var message = $"'{username}' signs in with {provider}, so the password is managed by {provider}, "
                          + $"not DealerOps. Ask them to use the {provider} password recovery for their email.";
            throw new ApiException(ErrorCode.Validation, message,
                new Dictionary<string, string> { ["password"] = message });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password);
        // The password itself is never written to the audit trail.
        _audit.Record("APP_USER", user.Id, "UPDATE", dealerId, ActorUsername(),
            new Dictionary<string, object> { ["username"] = username, ["passwordReset"] = true });
        _db.SaveChanges();
    }

    /// <summary>
    /// How the account signs in. A Google or Firebase sign-in linked to an account that already
    /// had a DealerOps password still counts as <c>password</c>: that password keeps working.
    /// </summary>
    private static string SignInMethod(AppUserEntity? user) =>
        !string.IsNullOrEmpty(user?.PasswordHash) ? "password"
        : user?.FirebaseUid != null ? "firebase"
        : "google";

    public void Remove(long dealerId, string username)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);

        var membership = _db.Memberships
            .FirstOrDefault(m => m.DealerId == dealerId && m.Username == username && m.Active)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");

        membership.Active = false;

        var user = _db.AppUsers.FirstOrDefault(u => u.Username == username);
        if (user != null)
            user.DealerId = null;

        _audit.Record("MEMBERSHIP", membership.Id, "UPDATE", dealerId, ActorUsername(),
            new Dictionary<string, object> { ["username"] = username, ["unbound"] = true });
        _db.SaveChanges();
    }

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
               || (item.Username ?? "").ToLowerInvariant().Contains(needle);
    }

    private static string ActorUsername() => TenantContext.Get()?.Username ?? "";
}
