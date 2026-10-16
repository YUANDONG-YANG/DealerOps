namespace DealerOps.Core.Dealer.Dto;

/// <summary>
/// Three-way result for Google sign-in.
///
/// <list type="bullet">
///   <item><c>ok</c> — the account is bound to a dealer (or is the platform admin); <see cref="Login"/>
///     carries the JWT and the UI navigates into the app.</item>
///   <item><c>needs_dealer</c> — the account has never picked a dealership; the UI shows the dealer
///     selector and calls /auth/google again with the chosen DealerId.</item>
///   <item><c>pending_approval</c> — the account is waiting for a member of the requested dealer
///     to approve the join; the UI tells the user to come back once that is done.</item>
/// </list>
/// </summary>
public record GoogleSignInResponse(string Status, LoginResponse? Login);
