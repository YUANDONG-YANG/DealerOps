using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer.Dto;

namespace DealerOps.Core.Dealer;

public class MemberDirectoryService
{
    private readonly AppDbContext _db;

    public MemberDirectoryService(AppDbContext db) => _db = db;

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
                var displayName = _db.AppUsers
                    .Where(u => u.Username == m.Username)
                    .Select(u => u.DisplayName)
                    .FirstOrDefault() ?? m.Username;
                return new MemberOption(m.Username, displayName, sources.GetValueOrDefault(m.Username), m.DealerRole);
            })
            .ToList();
    }
}
