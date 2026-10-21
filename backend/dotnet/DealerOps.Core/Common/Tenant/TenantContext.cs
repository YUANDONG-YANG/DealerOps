namespace DealerOps.Core.Common.Tenant;

/// <summary>The signed-in user of the current request, set by TenantMiddleware.</summary>
public static class TenantContext
{
    private static readonly AsyncLocal<CurrentUser?> Current = new();

    public static CurrentUser? Get() => Current.Value;

    public static void Set(CurrentUser? user) => Current.Value = user;

    public static void Clear() => Current.Value = null;

    /// <summary>Username written as the actor of audit rows; empty outside a signed-in request.</summary>
    public static string ActorUsername() => Current.Value?.Username ?? "";
}
