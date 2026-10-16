namespace DealerOps.Core.Vehicle;

// Body-type categorisation used by the inventory filters and the add/edit form.
// Values stored lower snake_case via EnumSnakeCaseConverter.
public enum VehicleBodyType
{
    Sedan,
    Suv,
    Truck,
    Motorcycle,
    Coupe,
    Hatchback,
    Van,
    Other
}
