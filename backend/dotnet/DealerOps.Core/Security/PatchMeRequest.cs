using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Security;

/// <summary>
/// Fields a user may change on their own account. Username, role and dealer binding are
/// deliberately out of scope — they are set by sign-up / admin / join-request flows.
/// </summary>
public record PatchMeRequest(
    [Required][MaxLength(120)] string DisplayName,
    [MaxLength(40)] string? Phone);
