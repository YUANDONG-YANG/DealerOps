using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Dealer.Dto;

public record PatchDealerRequest(
    [Required] int Version,
    [Required] string LegalName,
    [Required] string ContactPhone,
    [Required] string ContactEmail,
    [Required] string ContactAddress,
    [Required] bool Active,
    [MaxLength(200000, ErrorMessage = "Logo is too large")]
    [RegularExpression(@"data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}",
        ErrorMessage = "Logo must be a PNG, JPEG, or WebP image")]
    string? LogoDataUrl);
