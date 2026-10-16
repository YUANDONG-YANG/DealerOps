using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Vehicle.Dto;

public record SellVehicleRequest(
    DateOnly? SoldOn,
    [Range(0.01, double.MaxValue, ErrorMessage = "Sold price must be greater than 0.")]
    decimal? SoldPrice,
    [Required] int Version);
