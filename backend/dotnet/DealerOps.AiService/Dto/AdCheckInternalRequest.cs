namespace DealerOps.AiService.Dto;

/// <summary>Ad-check input from Core: the listing copy and the public facts it is checked against.</summary>
/// <param name="Listing">Untrusted ad copy plus the structured ad kind and medium.</param>
/// <param name="VehiclePublic">Trusted public vehicle facts. Purchase cost is not included.</param>
/// <param name="DealerPublic">Public dealership identity the ad may already show.</param>
public record AdCheckInternalRequest(
    ListingIn Listing,
    VehiclePublic VehiclePublic,
    DealerPublic DealerPublic);

/// <summary>Listing copy under review. Title and body are untrusted user input.</summary>
/// <param name="Title">Advertised title. Capped and fenced before the model sees it.</param>
/// <param name="Body">Advertised body. Capped and fenced before the model sees it.</param>
/// <param name="AdKind">Structured ad kind, for example retail or finance.</param>
/// <param name="Medium">Where the ad is published.</param>
public record ListingIn(string Title, string Body, string AdKind, string Medium);

/// <summary>Trusted public vehicle facts. Purchase cost is not on this type, so the model never receives it.</summary>
/// <param name="ModelYear">Model year from the vehicle record.</param>
/// <param name="Make">Make from the vehicle record.</param>
/// <param name="Model">Model name from the vehicle record.</param>
/// <param name="Vin">VIN from the vehicle record. Not logged.</param>
/// <param name="ConditionCode">Condition code from the vehicle record.</param>
/// <param name="Source">How the vehicle was acquired, as stored on the vehicle.</param>
public record VehiclePublic(
    int ModelYear, string Make, string Model,
    string Vin, string ConditionCode, string Source);

/// <summary>Public dealership identity the ad may already show. This is not a customer record.</summary>
/// <param name="LegalName">Dealer legal name.</param>
/// <param name="ContactPhone">Public dealer phone. Not logged.</param>
/// <param name="ContactEmail">Public dealer email. Not logged.</param>
/// <param name="ContactAddress">Public dealer address. Not logged.</param>
public record DealerPublic(
    string LegalName, string ContactPhone,
    string ContactEmail, string ContactAddress);
