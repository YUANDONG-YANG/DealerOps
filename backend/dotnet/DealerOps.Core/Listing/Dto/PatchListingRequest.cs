using System.ComponentModel.DataAnnotations;
using DealerOps.Core.Listing;

namespace DealerOps.Core.Listing.Dto;

public record PatchListingRequest(
    int? Version,
    [MaxLength(200)] string? Title,
    string? Body,
    AdKind? AdKind,
    AdMedium? Medium,
    [RegularExpression("^(POLICE_EMERGENCY|TAXI_LIMO|DAILY_RENTAL|OTHER)$")] string? PriorUse,
    [MaxLength(2000)] string? WarrantyTerms,
    [Range(1, 1000000)] int? AnnualKmAllowance);
