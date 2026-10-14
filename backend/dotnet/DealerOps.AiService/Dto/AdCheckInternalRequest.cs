namespace DealerOps.AiService.Dto;

public record AdCheckInternalRequest(
    ListingIn Listing,
    VehiclePublic VehiclePublic,
    DealerPublic DealerPublic);

public record ListingIn(string Title, string Body, string AdKind, string Medium);

public record VehiclePublic(
    int ModelYear, string Make, string Model,
    string Vin, string ConditionCode, string Source);

public record DealerPublic(
    string LegalName, string ContactPhone,
    string ContactEmail, string ContactAddress);
