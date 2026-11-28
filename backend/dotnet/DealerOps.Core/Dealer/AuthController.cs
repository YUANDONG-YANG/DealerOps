using DealerOps.Core.Dealer.Dto;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Dealer;

/// <summary>
/// Public sign-in and registration endpoints. Each returns the application JWT; the gateway
/// exposes them without a bearer token.
/// </summary>
[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    /// <summary>Signs in with a username, email or phone number and a password.</summary>
    [HttpPost("login")]
    public LoginResponse Login([FromBody] LoginRequest request) => _authService.Login(request);

    /// <summary>Creates an unbound password account and signs it in (201).</summary>
    [HttpPost("register")]
    [ProducesResponseType(201)]
    public IActionResult Register([FromBody] RegisterRequest request) =>
        StatusCode(201, _authService.Register(request));

    /// <summary>Signs in, or creates an unbound account, with a Google ID token.</summary>
    [HttpPost("google")]
    public Task<GoogleSignInResponse> Google(
        [FromBody] GoogleSignInRequest request, CancellationToken cancellationToken) =>
        _authService.GoogleSignIn(request, cancellationToken);

    /// <summary>Signs in, or creates an unbound account, with a Firebase ID token.</summary>
    [HttpPost("firebase")]
    public Task<LoginResponse> Firebase(
        [FromBody] FirebaseSignInRequest request, CancellationToken cancellationToken) =>
        _authService.FirebaseSignIn(request, cancellationToken);
}
