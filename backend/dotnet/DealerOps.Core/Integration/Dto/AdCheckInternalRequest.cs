namespace DealerOps.Core.Integration.Dto;

public record AdCheckInternalRequest(
    ListingPublic Listing,
    VehiclePublic VehiclePublic,
    DealerPublic DealerPublic);
