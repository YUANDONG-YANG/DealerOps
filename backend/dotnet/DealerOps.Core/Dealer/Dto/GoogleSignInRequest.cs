using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Dealer.Dto;

public record GoogleSignInRequest(
    [Required][MaxLength(4096, ErrorMessage = "That is not a Google sign-in token.")] string IdToken);
