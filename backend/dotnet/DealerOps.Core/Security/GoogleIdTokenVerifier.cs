using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DealerOps.Core.Common.Exceptions;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace DealerOps.Core.Security;

/// <summary>
/// The part of a verified Google ID token this application acts on. Everything here comes
/// from the default <c>openid email profile</c> scope — no extra OAuth consent, no review.
/// <see cref="Subject"/> is Google's stable per-user id (the <c>sub</c> claim); the rest are
/// optional because older Google accounts can be missing a given/family split or a picture.
/// </summary>
public record GoogleIdentity(
    string Subject,
    string Email,
    string? Name,
    string? GivenName,
    string? FamilyName,
    string? Picture,
    string? Locale);

/// <summary>
/// Verifies a Google Identity Services ID token server-side. Google only proves which email
/// address signed in; it grants no role and no dealership. Authorisation stays with
/// <see cref="Dealer.MembershipService"/>, so a verified token alone gives no business access.
/// </summary>
public class GoogleIdTokenVerifier
{
    private const string MetadataAddress = "https://accounts.google.com/.well-known/openid-configuration";

    // The Google OAuth web client this deployment belongs to. A client id is a public
    // identifier, not a secret: the browser hands it to Google on every sign-in. It is
    // compiled in because it identifies the DealerOps application itself and therefore does
    // not vary between local, test and Azure. The backend uses it as the expected audience,
    // which is what stops an ID token minted for some other application being accepted here.
    public const string ClientId = "660111025309-k8qneu1ifuhgtptb3onimtq988bb1pku.apps.googleusercontent.com";

    // Google has issued ID tokens under both spellings of its issuer claim.
    private static readonly string[] ValidIssuers = ["https://accounts.google.com", "accounts.google.com"];

    private readonly string? _hostedDomain;
    private readonly ConfigurationManager<OpenIdConnectConfiguration> _metadata;

    // MapInboundClaims would rename "sub" to a ClaimTypes URI; keep Google's own claim names.
    private readonly JwtSecurityTokenHandler _handler = new() { MapInboundClaims = false };

    public GoogleIdTokenVerifier(IConfiguration config)
    {
        var domain = (config["Google:HostedDomain"] ?? "").Trim();
        _hostedDomain = domain.Length == 0 ? null : domain;

        // Caches Google's signing keys and refreshes them on its own schedule, so each
        // sign-in does not fetch the key set.
        _metadata = new ConfigurationManager<OpenIdConnectConfiguration>(
            MetadataAddress, new OpenIdConnectConfigurationRetriever(), new HttpDocumentRetriever());
    }

    public async Task<GoogleIdentity> VerifyAsync(string idToken, CancellationToken cancellationToken)
    {
        OpenIdConnectConfiguration config;
        try
        {
            config = await _metadata.GetConfigurationAsync(cancellationToken);
        }
        catch (Exception) when (!cancellationToken.IsCancellationRequested)
        {
            throw new ApiException(ErrorCode.InternalError, "Could not reach Google to verify the sign-in.");
        }

        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuers = ValidIssuers,
            ValidateAudience = true,
            ValidAudience = ClientId,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = config.SigningKeys,
            // Google signs ID tokens with RS256. Pinning the algorithm blocks substitution attacks.
            ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        ClaimsPrincipal principal;
        try
        {
            principal = _handler.ValidateToken(idToken, parameters, out _);
        }
        catch (Exception)
        {
            throw Rejected();
        }

        var email = principal.FindFirstValue("email");
        if (string.IsNullOrWhiteSpace(email))
            throw Rejected();

        // An unverified address would let anyone claim a colleague's email, so it is refused
        // even though the signature is valid.
        if (!bool.TryParse(principal.FindFirstValue("email_verified"), out var verified) || !verified)
            throw new ApiException(ErrorCode.Unauthorized, "Verify your email address with Google first.");

        if (_hostedDomain != null
            && !string.Equals(principal.FindFirstValue("hd"), _hostedDomain, StringComparison.OrdinalIgnoreCase))
            throw new ApiException(ErrorCode.Forbidden, "Use your organisation's Google account to sign in.");

        var subject = principal.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(subject))
            throw Rejected();

        return new GoogleIdentity(
            subject,
            email,
            principal.FindFirstValue("name"),
            principal.FindFirstValue("given_name"),
            principal.FindFirstValue("family_name"),
            principal.FindFirstValue("picture"),
            principal.FindFirstValue("locale"));
    }

    // One message for every rejection, so a caller cannot probe which part of the token failed.
    private static ApiException Rejected() =>
        new(ErrorCode.Unauthorized, "Google sign-in failed.");
}
