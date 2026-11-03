using System.ComponentModel.DataAnnotations;
using DealerOps.Core.Common;

namespace DealerOps.Core.Dealer.Dto;

/// <summary>
/// The member fields a dealership manager may edit for another member: full name and phone.
/// A blank phone clears it.
/// </summary>
public record PatchMemberRequest(
    [NotBlank(ErrorMessage = "Full name is required.")][MaxLength(120)] string DisplayName,
    [MaxLength(40)] string? Phone);
