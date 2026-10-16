using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer.Dto;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Dealer;

public class MembershipService
{
    private readonly AppDbContext _db;
    private readonly NewAccountRules _accountRules;
    private readonly IAuditService _audit;

    public MembershipService(AppDbContext db, NewAccountRules accountRules, IAuditService audit)
    {
        _db = db;
        _accountRules = accountRules;
        _audit = audit;
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
                return new MemberResponse(m.Username, user?.DisplayName ?? "", AppRole.DealerUser.Value, m.Active);
            })
            .Where(item => Matches(item, q))
            .ToList();

        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);
        var from = Math.Min(p * s, all.Count);
        var to = Math.Min(from + s, all.Count);
        return new PageResponse<MemberResponse>(all.GetRange(from, to - from), p, s, all.Count);
    }

    public MemberResponse Add(long dealerId, CreateMemberRequest body)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);
        var username = body.Username.Trim();

        var existing = _db.AppUsers.FirstOrDefault(u => u.Username == username);
        if (existing != null && existing.Role == AppRole.PlatformAdmin)
            throw new ApiException(ErrorCode.DupMember, "Username belongs to a platform admin");

        if (_db.Memberships.Any(m => m.Username == username && m.Active))
            throw new ApiException(ErrorCode.DupMember, "Membership already exists");

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
        }

        try { _db.SaveChanges(); }
        catch (DbUpdateException ex) { throw _accountRules.Conflict(ex); }

        _audit.Record("MEMBERSHIP", membership.Id, "CREATE", dealerId, ActorUsername(),
            new Dictionary<string, object> { ["username"] = username });
        _db.SaveChanges();
        tx?.Commit();

        return new MemberResponse(membership.Username, user.DisplayName, AppRole.DealerUser.Value, membership.Active);
    }

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
            .Select(u => new PendingUserResponse(u.Username, u.DisplayName, u.Email, u.Phone, u.CreatedAt))
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
