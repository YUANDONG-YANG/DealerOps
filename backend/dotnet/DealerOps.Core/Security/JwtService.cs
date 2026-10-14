using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DealerOps.Core.Dealer;
using Microsoft.IdentityModel.Tokens;

namespace DealerOps.Core.Security;

public class JwtService
{
    private const long ExpirySeconds = 3600;
    private readonly SymmetricSecurityKey _key;

    public JwtService(IConfiguration config)
    {
        var secret = JwtSupport.ResolveDevSecret(config);
        _key = JwtSupport.HmacSecret(secret);
    }

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
