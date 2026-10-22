using DealerOps.Core.Vehicle;

namespace DealerOps.Core.BuyerSite.Dto;

/// <summary>
/// A dealership's public inventory page: its contact details and every in-stock vehicle whose ad
/// is marked ready and still passes the current compliance check. No cost, VIN, or customer data.
/// </summary>
/// <param name="Slug">The dealership's buyer-site URL name (<c>/shop/{slug}</c>).</param>
public record PublicInventory(
    long DealerId,
    string Slug,
    string LegalName,
    string ContactPhone,
    string ContactEmail,
    string ContactAddress,
    List<PublicVehicle> Vehicles);

/// <param name="Title">The ad title that passed the compliance check.</param>
/// <param name="Body">The ad body that passed the compliance check; it carries the price disclosure.</param>
/// <param name="HasPhoto">True when the vehicle has a photo at the public photo route.</param>
public record PublicVehicle(
    long VehicleId,
    int ModelYear,
    string Make,
    string Model,
    VehicleBodyType BodyType,
    ConditionCode ConditionCode,
    int? MileageKm,
    string? ExteriorColor,
    FuelType? FuelType,
    string Title,
    string Body,
    bool HasPhoto);
