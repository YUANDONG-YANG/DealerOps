namespace DealerOps.Core.Dealer;

public sealed class AppRole
{
    public static readonly AppRole PlatformAdmin = new("Platform.Admin");
    public static readonly AppRole DealerUser = new("Dealer.User");

    public string Value { get; }

    private AppRole(string value) => Value = value;

    public static AppRole? FromValue(string? value) => value switch
    {
        "Platform.Admin" => PlatformAdmin,
        "Dealer.User" => DealerUser,
        _ => null
    };

    public override string ToString() => Value;
}
