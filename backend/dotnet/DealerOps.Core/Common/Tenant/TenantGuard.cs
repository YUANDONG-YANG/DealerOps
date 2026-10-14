using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Dealer;

namespace DealerOps.Core.Common.Tenant;

public static class TenantGuard
{
    public static CurrentUser RequireDealerUser()
    {
        var user = TenantContext.Get();
        if (user == null || user.Role != AppRole.DealerUser)
            throw new ApiException(ErrorCode.Forbidden, "Forbidden");
        if (user.TenantDealerId == null)
            throw new ApiException(ErrorCode.Forbidden, "Forbidden");
        return user;
    }

    public static long RequireTenantId()
    {
        var user = RequireDealerUser();
        return user.TenantDealerId!.Value;
    }

    public static CurrentUser RequireAdmin()
    {
        var user = TenantContext.Get();
        if (user == null || user.Role != AppRole.PlatformAdmin)
            throw new ApiException(ErrorCode.Forbidden, "Forbidden");
        return user;
    }

    public static void AssertSameDealer(ITenantOwned entity, long dealerId)
    {
        if (entity.DealerId != dealerId)
            throw new ApiException(ErrorCode.NotFound, "Not found");
    }
}
