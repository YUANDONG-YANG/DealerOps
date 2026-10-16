using DealerOps.Core.Dealer.Dto;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Dealer;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public LoginResponse Login([FromBody] LoginRequest request) => _authService.Login(request);

    [HttpPost("register")]
    [ProducesResponseType(201)]
    public IActionResult Register([FromBody] RegisterRequest request) =>
        StatusCode(201, _authService.Register(request));

    [HttpPost("google")]
    public Task<GoogleSignInResponse> Google(
        [FromBody] GoogleSignInRequest request, CancellationToken cancellationToken) =>
        _authService.GoogleSignIn(request, cancellationToken);
}
