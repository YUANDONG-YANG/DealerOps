namespace DealerOps.Core.Dealer.Dto;

public record DealerResponse(
    long Id,
    string LegalName,
    string? ContactPhone,
    string? ContactEmail,
    string? ContactAddress,
    string? LogoDataUrl,
    bool Active,
    long StaffCount,
    int Version);
