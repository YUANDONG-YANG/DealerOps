using System.ComponentModel.DataAnnotations;
using DealerOps.Core.Listing;

namespace DealerOps.Core.Listing.Dto;

public record PatchListingRequest(
    int? Version,
    [MaxLength(200)] string? Title,
    string? Body,
    AdKind? AdKind,
    AdMedium? Medium);
