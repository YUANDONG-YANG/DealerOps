using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Dealer;

namespace DealerOps.Core.Common.Tenant;

/// <summary>Role and tenant checks for services; each failed check throws FORBIDDEN (or NOT_FOUND for another tenant's record).</summary>
public static class TenantGuard
{
    /// <summary>The caller, who must be a dealer user bound to a dealership.</summary>
    public static CurrentUser RequireDealerUser()
    {
        var user = TenantContext.Get();
        if (user == null || user.Role != AppRole.DealerUser)
            throw new ApiException(ErrorCode.Forbidden, "Forbidden");
        if (user.TenantDealerId == null)
            throw new ApiException(ErrorCode.Forbidden, "Forbidden");
        return user;
    }

    /// <summary>Team and dealership-profile management: a bound dealer user whose membership is MANAGER.</summary>
    public static CurrentUser RequireManager()
    {
        var user = RequireDealerUser();
        if (user.DealerRole != DealerRole.Manager)
            throw new ApiException(ErrorCode.Forbidden, "Only a dealership manager can do this.");
        return user;
    }

    /// <summary>The bound dealership id of a dealer user.</summary>
    public static long RequireTenantId()
    {
        var user = RequireDealerUser();
        return user.TenantDealerId!.Value;
    }

    /// <summary>The caller, who must be the platform admin.</summary>
    public static CurrentUser RequireAdmin()
    {
        var user = TenantContext.Get();
        if (user == null || user.Role != AppRole.PlatformAdmin)
            throw new ApiException(ErrorCode.Forbidden, "Forbidden");
        return user;
    }

    /// <summary>Reports a record of another dealership as NOT_FOUND, so its existence is not disclosed.</summary>
    public static void AssertSameDealer(ITenantOwned entity, long dealerId)
    {
        if (entity.DealerId != dealerId)
            throw new ApiException(ErrorCode.NotFound, "Not found");
    }
}
