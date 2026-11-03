using System.ComponentModel.DataAnnotations;
using DealerOps.Core.Common;

namespace DealerOps.Core.Dealer.Dto;

/// <summary>
/// The platform admin edits a member's sign-in email and phone (A6). Same rules as registration:
/// at least one of the two, canonical form, and unique across accounts. A blank value clears it.
/// </summary>
public record PatchMemberContactRequest(
    [OptionalEmailAddress][MaxLength(254, ErrorMessage = "Use at most 254 characters.")] string? Email,
    [MaxLength(40, ErrorMessage = "Use at most 40 characters.")] string? Phone);
