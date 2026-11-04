namespace DealerOps.Core.Dealer;

/// <summary>
/// A member's role inside their dealership, stored on the membership row. There is one Owner per
/// dealership, appointed by the platform admin: the Owner runs the dealership profile, the join
/// requests and the Manager appointments. A Manager administers Sales members only. Sales members
/// do the day-to-day business. Business data access is the same for all three. Values stored upper
/// SNAKE_CASE via EnumSnakeCaseConverter, so the column holds OWNER, MANAGER or SALES.
/// </summary>
public enum DealerRole
{
    Owner,
    Manager,
    Sales
}
