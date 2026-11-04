using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer.Dto;

namespace DealerOps.Core.Dealer;

/// <summary>
/// Tenant-scoped directory of active members for assignee pickers. It is ordered alphabetically by
/// username on purpose (a picker, not a record list), so it does not follow the newest-first rule.
/// </summary>
public class MemberDirectoryService
{
    private readonly AppDbContext _db;

    public MemberDirectoryService(AppDbContext db) => _db = db;

    /// <summary>
    /// Active members of the caller's dealership. A caller with team access (owner or manager) gets
    /// the full record: display name, sign-in source, dealer role, phone and joined date. Any other
    /// bound member gets the picker fields only, username and display name, because the route stays
    /// open for the lead-owner and work-order assignee pickers.
    /// </summary>
    public List<MemberOption> ActiveMembers()
    {
        var caller = TenantGuard.RequireDealerUser();
        var tenant = caller.TenantDealerId!.Value;
        // The caller's own role decides the payload, so it is read instead of calling
        // TenantGuard.RequireTeamAccess(), which would reject a sales member.
        var teamAccess = caller.DealerRole is DealerRole.Owner or DealerRole.Manager;

        var members = _db.Memberships
            .Where(m => m.DealerId == tenant && m.Active)
            .OrderBy(m => m.Username)
            .ToList();
        var sources = teamAccess
            ? AccountSource.For(_db, members.Select(m => m.Username))
            : new Dictionary<string, string?>();
        return members
            .Select(m =>
            {
                var user = _db.AppUsers
                    .Where(u => u.Username == m.Username)
                    .Select(u => new { u.DisplayName, u.Phone })
                    .FirstOrDefault();
                var displayName = user?.DisplayName ?? m.Username;
                return teamAccess
                    ? new MemberOption(m.Username, displayName,
                        sources.GetValueOrDefault(m.Username), m.DealerRole, user?.Phone,
                        DateTime.SpecifyKind(m.CreatedAt, DateTimeKind.Utc))
                    : new MemberOption(m.Username, displayName);
            })
            .ToList();
    }
}
