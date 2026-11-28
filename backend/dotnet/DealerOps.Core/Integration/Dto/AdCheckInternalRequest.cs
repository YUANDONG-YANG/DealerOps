namespace DealerOps.Core.Integration.Dto;

/// <summary>Body of the internal ad-check call: the ad, the vehicle and the dealership facts it is checked against.</summary>
public record AdCheckInternalRequest(
    ListingPublic Listing,
    VehiclePublic VehiclePublic,
    DealerPublic DealerPublic);
