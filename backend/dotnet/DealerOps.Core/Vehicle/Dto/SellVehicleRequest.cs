using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Vehicle.Dto;

// A sold price <= 0 is reported by VehicleService as SOLD_PAIR_REQUIRED (contract §4.5),
// so it is not validated here. The buyer is either a CRM customer (BuyerCustomerId) or
// "Other" with a typed BuyerName; VehicleService rejects a sale with neither.
public record SellVehicleRequest(
    DateOnly? SoldOn,
    decimal? SoldPrice,
    [Required] int Version,
    long? BuyerCustomerId = null,
    [MaxLength(120)] string? BuyerName = null);
