namespace DealerOps.Core.Dealer.Dto;

/// <param name="SignInMethod">
/// <c>password</c> when the account has a DealerOps password (an admin can reset it), otherwise
/// <c>google</c> or <c>firebase</c>: that provider owns the password and an admin cannot change it.
/// </param>
/// <param name="Email">The account's own sign-in email, or <c>null</c> (UI-12).</param>
/// <param name="Phone">The account's own sign-in phone, or <c>null</c> (UI-12).</param>
public record MemberResponse(string Username, string? DisplayName, string Role, bool Active, string SignInMethod,
    string? Email, string? Phone);
