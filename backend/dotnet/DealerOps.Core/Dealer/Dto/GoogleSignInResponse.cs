namespace DealerOps.Core.Dealer.Dto;

/// Google sign-in result. <c>status</c> is always <c>ok</c> and <see cref="Login"/> carries the
/// session; an account with no dealership lands on the no-access page and files its join
/// request there (AUTH-25).
public record GoogleSignInResponse(string Status, LoginResponse? Login);
