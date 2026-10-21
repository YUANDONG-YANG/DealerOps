using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace DealerOps.Gateway.Security;

/// <summary>
/// HS256 settings shared with Core's token issuer: issuer, audience and the signing key.
/// </summary>
public static class JwtSupport
{
    public const string Issuer = "dealerops-core";
    public const string DefaultAudience = "api://dealer-api";
    public const string DefaultDevSecret = "dealer-dev-jwt-secret-change-me";
    public const int MinHmacKeyBytes = 32;

    /// <summary>
    /// Builds the signing key. Only the well-known dev secret is padded to 32 bytes; a short custom
    /// secret is rejected.
    /// </summary>
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

    /// <summary>Reads the signing secret from <c>DEV_JWT_SECRET</c> or <c>dealerops:jwt:devSecret</c>.</summary>
    public static string ResolveDevSecret(IConfiguration config)
    {
        var secret = First(config["DEV_JWT_SECRET"], config["dealerops:jwt:devSecret"]);
        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException(
                "JWT signing secret is not configured. Set DEV_JWT_SECRET or dealerops__jwt__devSecret.");
        return secret;
    }

    private static string? First(params string?[] values)
    {
        foreach (var value in values)
            if (!string.IsNullOrWhiteSpace(value)) return value;
        return null;
    }
}
