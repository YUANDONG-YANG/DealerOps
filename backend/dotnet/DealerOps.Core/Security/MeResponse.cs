namespace DealerOps.Core.Security;

public record MeResponse(
    string Username,
    string? DisplayName,
    string? Role,
    long? DealerId,
    string? DealerLegalName,
    string? DealerContactPhone,
    string? DealerContactEmail,
    string? DealerContactAddress,
    string? DealerLogoDataUrl);
