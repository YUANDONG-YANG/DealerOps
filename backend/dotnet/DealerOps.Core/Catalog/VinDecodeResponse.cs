using DealerOps.Core.Vehicle;

namespace DealerOps.Core.Catalog;

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
