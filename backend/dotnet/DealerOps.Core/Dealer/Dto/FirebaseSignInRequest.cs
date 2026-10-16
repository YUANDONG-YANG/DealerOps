using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Dealer.Dto;

public record FirebaseSignInRequest(
    [Required][MaxLength(4096)] string IdToken,
    [MaxLength(64)] string? Username = null,
    [MaxLength(120)] string? DisplayName = null,
    [MaxLength(40)] string? Phone = null);
