namespace DealerOps.Core.Common.Tenant;

public static class TenantContext
{
    private static readonly AsyncLocal<CurrentUser?> Current = new();

    public static CurrentUser? Get() => Current.Value;

    public static void Set(CurrentUser? user) => Current.Value = user;

    public static void Clear() => Current.Value = null;
}
