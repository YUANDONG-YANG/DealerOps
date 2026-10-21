using DealerOps.Core.Vehicle;

namespace DealerOps.Core.Catalog;

/// <summary>Vehicle facts decoded from a VIN by vPIC; fields vPIC leaves blank are null.</summary>
/// <param name="Vin">The VIN as decoded: trimmed and upper case.</param>
/// <param name="BodyClass">vPIC's free-text body class.</param>
/// <param name="BodyType">The DMS body type mapped from <paramref name="BodyClass"/>.</param>
/// <param name="Engine">Displacement, cylinders and primary fuel, for example "2.0L 4-cyl Gasoline".</param>
/// <param name="Country">The assembly plant's country.</param>
public record VinDecodeResponse(
    string Vin,
    string? Make,
    string? Model,
    int? ModelYear,
    string? BodyClass,
    VehicleBodyType? BodyType,
    string? Engine,
    string? Country,
    string? Manufacturer);
