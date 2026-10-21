using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace DealerOps.Core.Security;

/// <summary>
/// Shared JWT constants and signing-key rules for the core service: issuer, audience and the
/// HMAC secret, which must be at least 32 bytes unless it is the well-known local dev secret.
/// </summary>
public static class JwtSupport
{
    public const string Issuer = "dealerops-core";
    public const string DefaultAudience = "api://dealer-api";
    public const string DefaultDevSecret = "dealer-dev-jwt-secret-change-me";
    public const int MinHmacKeyBytes = 32;

    /// <summary>True when the secret is the published local development default.</summary>
    public static bool IsWellKnownDevSecret(string secret) => DefaultDevSecret == secret;

    /// <summary>
    /// Builds the HMAC signing key. The well-known dev secret is zero-padded to 32 bytes; any
    /// other secret shorter than 32 bytes is refused.
    /// </summary>
    public static SymmetricSecurityKey HmacSecret(string secret)
    {
        if (string.IsNullOrWhiteSpace(secret))
            throw new ArgumentException("DEV_JWT_SECRET is blank");

        var raw = Encoding.UTF8.GetBytes(secret);
        if (raw.Length >= MinHmacKeyBytes)
            return new SymmetricSecurityKey(raw);

        if (IsWellKnownDevSecret(secret))
        {
            var padded = new byte[32];
            Array.Copy(raw, padded, raw.Length);
            return new SymmetricSecurityKey(padded);
        }

        throw new ArgumentException(
            "DEV_JWT_SECRET must be at least 32 UTF-8 bytes. Short custom secrets are not padded.");
    }

    /// <summary>Reads the signing secret from DEV_JWT_SECRET or Jwt:DevSecret; fails when neither is set.</summary>
    public static string ResolveDevSecret(IConfiguration config)
    {
        var configured = First(config["DEV_JWT_SECRET"], config["Jwt:DevSecret"]);
        if (string.IsNullOrWhiteSpace(configured))
            throw new InvalidOperationException(
                "JWT signing secret is not configured. Set DEV_JWT_SECRET or Jwt__DevSecret.");
        return configured;
    }

    private static string? First(params string?[] values)
    {
        foreach (var value in values)
            if (!string.IsNullOrWhiteSpace(value)) return value;
        return null;
    }
}
