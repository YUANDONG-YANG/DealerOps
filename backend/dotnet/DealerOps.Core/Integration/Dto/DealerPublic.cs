namespace DealerOps.Core.Integration.Dto;

/// <summary>Dealership facts an ad must disclose; sent to the AI service for the ad check only.</summary>
public record DealerPublic(
    string? LegalName,
    string? ContactPhone,
    string? ContactEmail,
    string? ContactAddress);
