using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Dealer.Dto;

public record CreateDealerRequest(
    [Required] string LegalName,
    [Required] string ContactPhone,
    [Required] string ContactEmail,
    [Required] string ContactAddress);
