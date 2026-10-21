namespace DealerOps.Core.Vehicle;

// Optional fuel type on the vehicle record. Values stored lower snake_case via EnumSnakeCaseConverter.
public enum FuelType
{
    Gasoline,
    Diesel,
    Hybrid,
    PluginHybrid,
    Electric,
    Other
}
