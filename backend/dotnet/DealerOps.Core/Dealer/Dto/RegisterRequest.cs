using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Dealer.Dto;

public record RegisterRequest(
    [Required]
    [RegularExpression(@"(?=.*[A-Za-z])[A-Za-z0-9._-]{3,64}",
        ErrorMessage = "Use 3-64 letters, digits, dots, dashes or underscores, with at least one letter.")]
    string Username,
    [Required][MaxLength(120, ErrorMessage = "Use at most 120 characters.")] string DisplayName,
    [MaxLength(254, ErrorMessage = "Use at most 254 characters.")] string? Email,
    [MaxLength(40, ErrorMessage = "Use at most 40 characters.")] string? Phone,
    [Required]
    [MinLength(8, ErrorMessage = "Use 8-72 characters.")]
    [MaxLength(72, ErrorMessage = "Use 8-72 characters.")]
    string Password);
