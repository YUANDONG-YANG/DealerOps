using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Vehicle.Dto;

// A sold price <= 0 is reported by VehicleService as SOLD_PAIR_REQUIRED (contract §4.5),
// so it is not validated here.
public record SellVehicleRequest(
    DateOnly? SoldOn,
    decimal? SoldPrice,
    [Required] int Version);
