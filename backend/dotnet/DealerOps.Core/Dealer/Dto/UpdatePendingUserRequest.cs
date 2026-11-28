using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Dealer.Dto;

/// <summary>
/// The pending-account fields the platform admin may edit, with the registration rules: an email
/// or a phone is required, and a blank one clears it.
/// </summary>
public record UpdatePendingUserRequest(
    [Required]
    [RegularExpression(@"(?=.*[A-Za-z])[A-Za-z0-9._-]{3,64}",
        ErrorMessage = "Use 3-64 letters, digits, dots, dashes or underscores, with at least one letter.")]
    string Username,
    [MaxLength(254, ErrorMessage = "Use at most 254 characters.")] string? Email,
    [MaxLength(40, ErrorMessage = "Use at most 40 characters.")] string? Phone);
