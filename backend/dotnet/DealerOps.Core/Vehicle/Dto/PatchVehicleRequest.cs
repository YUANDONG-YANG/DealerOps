using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Vehicle.Dto;

public record PatchVehicleRequest(
    [Required] int Version,
    [Required][MaxLength(50)] string Make,
    [Required][MaxLength(50)] string Model,
    [Required][Range(1900, int.MaxValue)] int ModelYear,
    [Required]
    [RegularExpression(@"^[A-HJ-NPR-Za-hj-npr-z0-9]{17}$",
        ErrorMessage = "must be 17 characters without I, O, or Q")]
    string Vin,
    [Required] VehicleSource Source,
    [Required][Range(0, double.MaxValue)] decimal PurchaseCost,
    [Required] DateOnly AddedOn,
    [Required] ConditionCode ConditionCode,
    [Range(0, double.MaxValue)] decimal? RepairCost,
    [MaxLength(500)]
    [RegularExpression(@"(?i)^https?://\S+$", ErrorMessage = "must be an http(s) URL")]
    string? CarfaxUrl);
