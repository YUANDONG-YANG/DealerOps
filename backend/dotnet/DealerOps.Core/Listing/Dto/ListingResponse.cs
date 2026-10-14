using DealerOps.Core.Compliance.Dto;
using DealerOps.Core.Listing;

namespace DealerOps.Core.Listing.Dto;

public record ListingResponse(
    long Id,
    long VehicleId,
    string? Title,
    string? Body,
    AdKind AdKind,
    AdMedium Medium,
    ListingStatus Status,
    int ContentVersion,
    long? LastCheckId,
    CheckResponse? LastCheck,
    string? CheckStatus,
    int Version);
