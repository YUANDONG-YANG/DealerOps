using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer.Dto;

namespace DealerOps.Core.Dealer;

/// <summary>
/// Tenant-scoped directory of active staff for assignee pickers. It is ordered alphabetically by
/// username on purpose (a picker, not a record list), so it does not follow the newest-first rule.
/// </summary>
public class MemberDirectoryService
{
    private readonly AppDbContext _db;

    public MemberDirectoryService(AppDbContext db) => _db = db;

    /// <summary>Active members of the caller's dealership with display name, sign-in source, dealer role, phone and joined date.</summary>
    public List<MemberOption> ActiveMembers()
    {
        TenantGuard.RequireDealerUser();
        var tenant = TenantContext.Get()!.TenantDealerId!.Value;

        var members = _db.Memberships
            .Where(m => m.DealerId == tenant && m.Active)
            .OrderBy(m => m.Username)
            .ToList();
        var sources = AccountSource.For(_db, members.Select(m => m.Username));
        return members
            .Select(m =>
            {
                var user = _db.AppUsers
                    .Where(u => u.Username == m.Username)
                    .Select(u => new { u.DisplayName, u.Phone })
                    .FirstOrDefault();
                return new MemberOption(m.Username, user?.DisplayName ?? m.Username,
                    sources.GetValueOrDefault(m.Username), m.DealerRole, user?.Phone,
                    DateTime.SpecifyKind(m.CreatedAt, DateTimeKind.Utc));
            })
            .ToList();
    }
}
