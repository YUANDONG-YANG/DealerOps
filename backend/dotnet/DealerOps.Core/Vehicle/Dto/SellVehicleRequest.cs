using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Vehicle.Dto;

public record SellVehicleRequest(
    DateOnly? SoldOn,
    decimal? SoldPrice,
    [Required] int Version);
