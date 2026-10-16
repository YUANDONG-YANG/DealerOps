using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Dealer.Dto;

public record GoogleSignInRequest(
    [Required][MaxLength(4096, ErrorMessage = "That is not a Google sign-in token.")] string IdToken,
    // Set only on the second call: the dealer the user chose on the "needs_dealer" screen.
    // Null on the first call, which asks the server which path to send the user down.
    long? DealerId = null);
