using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Dealer.Dto;

public record GoogleSignInRequest(
    [Required][MaxLength(4096, ErrorMessage = "That is not a Google sign-in token.")] string IdToken,
    // Optional: records a join request to this active dealership when none is pending.
    long? DealerId = null);
