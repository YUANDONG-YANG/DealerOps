namespace DealerOps.Core.Dealer;

/// <summary>Platform-level account role: the platform admin or a dealership user.</summary>
public sealed class AppRole
{
    public static readonly AppRole PlatformAdmin = new("Platform.Admin");
    public static readonly AppRole DealerUser = new("Dealer.User");

    public string Value { get; }

    private AppRole(string value) => Value = value;

    /// <summary>The role for a stored value, or null when the value is unknown.</summary>
    public static AppRole? FromValue(string? value) => value switch
    {
        "Platform.Admin" => PlatformAdmin,
        "Dealer.User" => DealerUser,
        _ => null
    };

    public override string ToString() => Value;
}
