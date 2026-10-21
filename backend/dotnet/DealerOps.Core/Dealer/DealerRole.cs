namespace DealerOps.Core.Dealer;

// A staff member's role inside their dealership, stored on the membership row. Managers run the
// team (members, roles, join requests) and the dealership profile; business data access is the
// same for both. Values stored lower snake_case via EnumSnakeCaseConverter.
public enum DealerRole
{
    Manager,
    Staff
}
