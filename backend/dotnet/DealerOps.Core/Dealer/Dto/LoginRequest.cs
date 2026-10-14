using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Dealer.Dto;

public record LoginRequest(
    [Required] string Identifier,
    [Required] string Password);
