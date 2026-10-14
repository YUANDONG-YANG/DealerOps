namespace DealerOps.Core.Catalog;

public record VinDecodeResponse(
    string Vin,
    string? Make,
    string? Model,
    int? ModelYear,
    string? BodyClass,
    string? Engine,
    string? Country,
    string? Manufacturer);
