using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Dealer;

namespace DealerOps.Core.Common.Tenant;

/// <summary>Role and tenant checks for services; each failed check throws FORBIDDEN (or NOT_FOUND for another tenant's record).</summary>
public static class TenantGuard
{
    // Static checks have no constructor. TenantMiddleware binds the application logger.
    private static ILogger? _logger;

    /// <summary>Attaches the host logger used for denials. The first logger wins.</summary>
    /// <param name="logger">The application logger for this guard.</param>
    internal static void UseLogger(ILogger logger) => _logger ??= logger;

    /// <summary>The caller, who must be a dealer user bound to a dealership.</summary>
    /// <returns>The signed-in dealer user.</returns>
    /// <exception cref="ApiException">Forbidden when the caller is missing, not a dealer user, or not bound to a dealership.</exception>
    public static CurrentUser RequireDealerUser()
    {
        var user = TenantContext.Get();
        if (user == null || user.Role != AppRole.DealerUser)
            throw Deny("not_dealer_user", "Forbidden", user?.Username, user?.TenantDealerId);
        if (user.TenantDealerId == null)
            throw Deny("unbound", "Forbidden", user.Username, null);
        return user;
    }

    /// <summary>Team and dealership-profile management: a bound dealer user whose membership is MANAGER.</summary>
    /// <returns>The signed-in manager.</returns>
    /// <exception cref="ApiException">Forbidden when the caller is not a bound dealership manager.</exception>
    public static CurrentUser RequireManager()
    {
        var user = RequireDealerUser();
        if (user.DealerRole != DealerRole.Manager)
            throw Deny("not_manager", "Only a dealership manager can do this.", user.Username, user.TenantDealerId);
        return user;
    }

    /// <summary>The bound dealership id of a dealer user.</summary>
    /// <returns>The caller's dealership id.</returns>
    /// <exception cref="ApiException">Forbidden when <see cref="RequireDealerUser"/> rejects the caller.</exception>
    public static long RequireTenantId()
    {
        var user = RequireDealerUser();
        return user.TenantDealerId!.Value;
    }

    /// <summary>The caller, who must be the platform admin.</summary>
    /// <returns>The signed-in platform admin.</returns>
    /// <exception cref="ApiException">Forbidden when the caller is missing or is not the platform admin.</exception>
    public static CurrentUser RequireAdmin()
    {
        var user = TenantContext.Get();
        if (user == null || user.Role != AppRole.PlatformAdmin)
            throw Deny("not_admin", "Forbidden", user?.Username, null);
        return user;
    }

    /// <summary>Reports a record of another dealership as NOT_FOUND, so its existence is not disclosed.</summary>
    /// <param name="entity">The record whose dealership must match the caller.</param>
    /// <param name="dealerId">The caller's dealership id.</param>
    /// <exception cref="ApiException">Not found when the record belongs to another dealership.</exception>
    public static void AssertSameDealer(ITenantOwned entity, long dealerId)
    {
        if (entity.DealerId == dealerId) return;
        var username = TenantContext.ActorUsername();
        // The response stays "Not found". The other dealership id is for operators only.
        _logger?.LogWarning(
            "Tenant boundary rejected username={Username} dealerId={DealerId} recordDealerId={RecordDealerId} reason={Reason} outcome={Outcome}",
            string.IsNullOrEmpty(username) ? "anonymous" : username,
            dealerId, entity.DealerId, "dealer_mismatch", "not_found");
        throw new ApiException(ErrorCode.NotFound, "Not found");
    }

    // ApiExceptionFilter writes the status and does not log, so the denial is recorded here.
    // CurrentUser carries the username, not the numeric account id.
    private static ApiException Deny(string reason, string message, string? username, long? dealerId)
    {
        _logger?.LogWarning(
            "Access denied username={Username} dealerId={DealerId} reason={Reason} outcome={Outcome}",
            string.IsNullOrEmpty(username) ? "anonymous" : username,
            dealerId, reason, "forbidden");
        return new ApiException(ErrorCode.Forbidden, message);
    }
}
