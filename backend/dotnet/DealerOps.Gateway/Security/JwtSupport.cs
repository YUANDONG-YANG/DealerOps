using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace DealerOps.Gateway.Security;

public static class JwtSupport
{
    public const string Issuer = "dealerops-core";
    public const string DefaultAudience = "api://dealer-api";
    public const string DefaultDevSecret = "dealer-dev-jwt-secret-change-me";
    public const int MinHmacKeyBytes = 32;

    public static bool IsWellKnownDevSecret(string secret) => secret == DefaultDevSecret;

    public static SymmetricSecurityKey HmacSecret(string secret)
    {
        if (string.IsNullOrWhiteSpace(secret))
            throw new ArgumentException("DEV_JWT_SECRET is blank");

        var raw = Encoding.UTF8.GetBytes(secret);
        if (raw.Length >= MinHmacKeyBytes)
            return new SymmetricSecurityKey(raw);

        if (secret == DefaultDevSecret)
        {
            var padded = new byte[32];
            Array.Copy(raw, padded, raw.Length);
            return new SymmetricSecurityKey(padded);
        }

        throw new ArgumentException(
            "DEV_JWT_SECRET must be at least 32 UTF-8 bytes. Short custom secrets are not padded.");
    }

    public static string ResolveDevSecret(IConfiguration config)
    {
        var secret = config["DEV_JWT_SECRET"]
                     ?? config["dealerops:jwt:devSecret"]
                     ?? DefaultDevSecret;
        return secret;
    }
}
