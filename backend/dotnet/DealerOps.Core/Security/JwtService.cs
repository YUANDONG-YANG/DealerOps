using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DealerOps.Core.Dealer;
using Microsoft.IdentityModel.Tokens;

namespace DealerOps.Core.Security;

/// <summary>
/// Issues the application's HS256 access token (one hour) after a successful sign-in. The token
/// carries the username, display name and platform role only; the dealership is resolved per
/// request from the membership table.
/// </summary>
public class JwtService
{
    private const long ExpirySeconds = 3600;
    private readonly SymmetricSecurityKey _key;

    public JwtService(IConfiguration config)
    {
        var secret = JwtSupport.ResolveDevSecret(config);
        _key = JwtSupport.HmacSecret(secret);
    }

    /// <summary>Signs a new access token for the given account.</summary>
    public string Issue(AppUserEntity user)
    {
        var now = DateTime.UtcNow;
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Username),
            new("name", user.DisplayName),
            new("roles", user.Role.Value)
        };

        var credentials = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: JwtSupport.Issuer,
            audience: JwtSupport.DefaultAudience,
            claims: claims,
            notBefore: now,
            expires: now.AddSeconds(ExpirySeconds),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
