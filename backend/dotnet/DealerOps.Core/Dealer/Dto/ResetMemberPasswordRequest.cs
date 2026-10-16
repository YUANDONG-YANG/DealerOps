using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Dealer.Dto;

public record ResetMemberPasswordRequest(
    [Required(ErrorMessage = "Enter a new password.")]
    [MinLength(8, ErrorMessage = "Use 8-72 characters.")]
    [MaxLength(72, ErrorMessage = "Use 8-72 characters.")]
    string Password);
