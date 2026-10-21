using System.ComponentModel.DataAnnotations;
using DealerOps.Core.Common;

namespace DealerOps.Core.Vehicle.Dto;

// Value-type fields are nullable so that [Required] reports a missing JSON property
// instead of silently binding the default enum / 0 / 0001-01-01.
public record CreateVehicleRequest(
    [NotBlank][MaxLength(50)] string Make,
    [NotBlank][MaxLength(50)] string Model,
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
    // Optional: the specification's eight required fields do not change. Omitting it stores
    // VehicleBodyType.Other; the create form prefills it from the vPIC decode.
    VehicleBodyType? BodyType,
    [Range(0, double.MaxValue)] decimal? RepairCost,
    [MaxLength(500)]
    [RegularExpression(@"(?i)^https?://\S+$", ErrorMessage = "must be an http(s) URL")]
    string? CarfaxUrl,
    // Optional listing details; the specification's required fields do not change.
    [Range(0, 2_000_000, ErrorMessage = "Mileage must be 0 to 2,000,000 km.")] int? MileageKm = null,
    [MaxLength(40, ErrorMessage = "At most 40 characters.")] string? ExteriorColor = null,
    FuelType? FuelType = null,
    [MaxLength(20, ErrorMessage = "At most 20 characters.")] string? StockNumber = null,
    [Range(0, double.MaxValue)] decimal? ListPrice = null);
