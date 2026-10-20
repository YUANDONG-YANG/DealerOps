using System.ComponentModel.DataAnnotations;
using DealerOps.Core.Common;

namespace DealerOps.Core.Dealer.Dto;

// Lengths match the dealer columns, so an over-long value is a 400 rather than a database error.
public record CreateDealerRequest(
    [Required, NotBlank, MaxLength(200)] string LegalName,
    [Required, NotBlank, MaxLength(40)] string ContactPhone,
    [Required, NotBlank, MaxLength(120), EmailAddress] string ContactEmail,
    [Required, NotBlank, MaxLength(300)] string ContactAddress);
