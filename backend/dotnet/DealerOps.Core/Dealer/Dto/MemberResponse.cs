namespace DealerOps.Core.Dealer.Dto;

/// <param name="SignInMethod">
/// <c>password</c> when the account has a DealerOps password (an admin can reset it), otherwise
/// <c>google</c> or <c>firebase</c>: that provider owns the password and an admin cannot change it.
/// </param>
public record MemberResponse(string Username, string? DisplayName, string Role, bool Active, string SignInMethod);
