using System.ComponentModel.DataAnnotations;
using DealerOps.Core.Common;

namespace DealerOps.Core.Dealer.Dto;

/// <summary>A manager's edit of their own dealership: the admin's dealer edit without the active flag.</summary>
public record PatchDealerProfileRequest(
    [Required] int Version,
    [Required, NotBlank, MaxLength(200)] string LegalName,
    [Required, NotBlank, MaxLength(40)] string ContactPhone,
    [Required, NotBlank, MaxLength(120), EmailAddress(ErrorMessage = "Enter a valid email address.")] string ContactEmail,
    [Required, NotBlank, MaxLength(300)] string ContactAddress,
    [MaxLength(200000, ErrorMessage = "Logo is too large")]
    [RegularExpression(@"data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}",
        ErrorMessage = "Logo must be a PNG, JPEG, or WebP image")]
    string? LogoDataUrl);
