using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Dealer.Dto;

public record CreateMemberRequest(
    [Required]
    [RegularExpression(@"(?=.*[A-Za-z])[A-Za-z0-9._-]{3,64}")]
    string Username,
    [MaxLength(120)] string? DisplayName,
    [MinLength(8)][MaxLength(72)] string? Password,
    [EmailAddress][MaxLength(254)] string? Email,
    [MaxLength(40)] string? Phone);
