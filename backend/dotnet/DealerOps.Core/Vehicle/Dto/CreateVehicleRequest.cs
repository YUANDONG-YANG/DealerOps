using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Vehicle.Dto;

// Value-type fields are nullable so that [Required] reports a missing JSON property
// instead of silently binding the default enum / 0 / 0001-01-01.
public record CreateVehicleRequest(
    [Required][MaxLength(50)] string Make,
    [Required][MaxLength(50)] string Model,
    [Required][Range(1900, int.MaxValue)] int ModelYear,
    [Required]
    [RegularExpression(@"^[A-HJ-NPR-Za-hj-npr-z0-9]{17}$",
        ErrorMessage = "must be 17 characters without I, O, or Q")]
    string Vin,
    [Required(ErrorMessage = "Vehicle source is required.")] VehicleSource? Source,
    [Required(ErrorMessage = "Purchase cost is required.")]
    [Range(0, double.MaxValue)] decimal? PurchaseCost,
    [Required(ErrorMessage = "Date added is required.")] DateOnly? AddedOn,
    [Required(ErrorMessage = "Vehicle condition is required.")] ConditionCode? ConditionCode,
    [Range(0, double.MaxValue)] decimal? RepairCost,
    [MaxLength(500)]
    [RegularExpression(@"(?i)^https?://\S+$", ErrorMessage = "must be an http(s) URL")]
    string? CarfaxUrl);
